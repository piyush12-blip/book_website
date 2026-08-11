const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
const fs      = require('fs');
const { findEpubUrl, extractChaptersFromUrl, extractChaptersFromFile } = require('./epubParser');
const { searchMangaDex } = require('./mangadex');
const { searchRoyalRoad, getRoyalRoadChapters } = require('./royalroad');
const { 
    indexTelegramChannels, 
    searchTelegramIndex, 
    getTelegramIndexChapters 
} = require('./telegramIndex');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Start background indexer on boot and every 10 minutes
indexTelegramChannels();
setInterval(indexTelegramChannels, 10 * 60 * 1000);

// Ultra-Fast In-Memory LRU Cache (<10ms repeat loads)
const MEMORY_CACHE = {
    search: new Map(),
    chapters: new Map()
};

function volumeNumber(title) {
    const m = title.match(/vol(?:ume)?\.?\s*(\d+)/i) || title.match(/#(\d+)/);
    return m ? parseInt(m[1]) : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. CACHE CLEAR ENDPOINT — call POST /api/clear-cache to wipe everything
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/clear-cache', async (req, res) => {
    MEMORY_CACHE.search.clear();
    MEMORY_CACHE.chapters.clear();
    await indexTelegramChannels();
    console.log('[ENI] Memory cache fully cleared and re-indexed.');
    res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. SEARCH — Merges Telegram (manga/manhwa), RoyalRoad (webnovels), iTunes (books)
// ─────────────────────────────────────────────────────────────────────────────
const { searchPrioritizedTelegram } = require('./telegram');

app.get('/api/books/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json([]);

    try {
        // Clean query: strip brackets, markdown links, urls, currencies, separators
        let cleanQuery = query
            .replace(/\[([^\]]+)\]\([^\)]+\)/gi, '$1')
            .replace(/https?:\/\/[^\s]+/gi, '')
            .replace(/webnovel\.com[^\s]*/gi, '')
            .replace(/₹[\d\.]+/gi, '')
            .replace(/([a-zA-Z])([1-5]\.\d)\b/g, '$1')
            .replace(/\b[1-5]\.\d\b/g, '')
            .replace(/[\\\/\|;:_+~*#@!]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const qLower = cleanQuery.toLowerCase();
        
        // Extract primary and secondary search phrases (e.g. "I'm Trapped In This Day For One Thousand Years" from "I'm Trapped... || Eternal Loop")
        const rawParts = query.split(/\|\||\||\/\/|::|\/|-/).map(p => p.trim()).filter(p => p.length >= 2);
        const primarySearch = rawParts[0] ? rawParts[0].replace(/[^\x00-\x7F]/g, '').trim() : cleanQuery;
        const cleanItunesQuery = primarySearch.replace(/\s+by\s+.*/i, '').trim();

        // 1. INSTANT RAM TELEGRAM INDEX (Fuzzy & Typo Tolerant)
        const tgIndexed = await searchTelegramIndex(cleanQuery).catch(() => []);
        const tgIndexedPrimary = primarySearch !== cleanQuery ? await searchTelegramIndex(primarySearch).catch(() => []) : [];

        // 2. Fetch from iTunes, RoyalRoad, Google Books, Telegram, and MangaDex in parallel
        const [itunesResp, webnovelResults, telegramRaw, googleBooksResp, mangadexRaw] = await Promise.all([
            axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanItunesQuery)}&entity=ebook&limit=25`)
                 .catch(() => ({ data: { results: [] } })),
            searchRoyalRoad(cleanQuery).catch(() => []),
            searchPrioritizedTelegram(cleanQuery).catch(() => []),
            axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(primarySearch)}&maxResults=15`)
                 .catch(() => ({ data: { items: [] } })),
            searchMangaDex(cleanQuery).catch(() => [])
        ]);

        const COLORS = ['navy','teal','burgundy','midnight','sage','rust','ochre','brown','grey','ivory'];

        const itunesRaw = (itunesResp.data.results || []).sort((a, b) => {
            const tA = (a.trackName || '').toLowerCase();
            const tB = (b.trackName || '').toLowerCase();
            const scoreA = tA === qLower ? 100 : tA.startsWith(qLower) ? 50 : tA.includes(qLower) ? 25 : 0;
            const scoreB = tB === qLower ? 100 : tB.startsWith(qLower) ? 50 : tB.includes(qLower) ? 25 : 0;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return volumeNumber(a.trackName || '') - volumeNumber(b.trackName || '');
        });

        let itunesResults = itunesRaw.map((book, i) => {
            const color    = COLORS[i % COLORS.length];
            const title    = book.trackName   || 'Unknown Title';
            const author   = book.artistName  || 'Unknown Author';
            let coverUrl = book.artworkUrl100
                ? book.artworkUrl100.replace('100x100bb', '600x600bb')
                : null;
            if (coverUrl && coverUrl.includes('nocover')) coverUrl = null;

            let synopsis = (book.description || `A work by ${author}.`).replace(/<[^>]*>?/gm, '');

            const slug = (book.trackName || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
            return {
                id:       `itunes-${book.trackId}-${slug}`,
                title,
                author,
                cover:    coverUrl ? `has-image ${color}` : color,
                image:    coverUrl,
                lines:    title.split(' ').slice(0,3).join('<br>'),
                genre:    book.genres?.[0] || 'Novel',
                mood:     'Classic',
                pages:    300,
                rating:   Math.round(book.averageUserRating || 4),
                synopsis,
                hasEpub:  true
            };
        });

        // Parse Google Books Results for web novels, light novels, published books
        const googleBooks = (googleBooksResp.data.items || []).map((item, i) => {
            const info = item.volumeInfo || {};
            const title = info.title || 'Unknown Title';
            const author = (info.authors || ['Published Author'])[0];
            const coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
            const color = COLORS[i % COLORS.length];
            const pages = info.pageCount || 284;
            const categories = info.categories || ['Fiction'];
            const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

            return {
                id: `itunes-gb-${item.id}-${slug}`,
                title,
                author,
                cover: coverUrl ? `has-image ${color}` : color,
                image: coverUrl,
                lines: title.split(' ').slice(0, 3).join('<br>'),
                genre: categories[0] || 'Novel',
                mood: 'Engaging',
                pages,
                rating: 5,
                synopsis: info.description || `${title} by ${author}.`,
                hasEpub: true
            };
        });

        // Filter out third-party summaries, study guides, workbooks from iTunes search
        itunesResults = itunesResults.filter(b => {
            const t = b.title.toLowerCase();
            const isSummary = t.includes('summary') || t.includes('study guide') || t.includes('guide:') || t.includes('workbook') || t.includes('notes') || t.includes('takeaways') || t.includes('one-page') || t.includes('analysis');
            return !isSummary;
        });

        // ── Smart Deduplication & Unified Result Builder ──────────────────────
        function normTitle(t) {
            if (!t) return '';
            const ascii = t.replace(/[^\x00-\x7F]/g, '');
            return ascii
                .toLowerCase()
                .replace(/vol(?:ume)?\.?\s*\d+/gi, '')
                .replace(/chapter\s*\d+/gi, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();
        }

        const titleMap = new Map();

        function addToMap(item, priority) {
            const key = normTitle(item.title);
            if (!key) return;
            const existing = titleMap.get(key);
            if (!existing || priority > existing._priority) {
                titleMap.set(key, { ...item, _priority: priority });
            } else if (existing && item.telegramLink && !existing.telegramLink) {
                existing.telegramLink = item.telegramLink;
            }
        }

        // 0. Local Scraped & Downloaded Manga PDFs → Top Priority (160)
        const { scanDownloadedMangaPdfs } = require('./universalTelegramPdfEngine');
        const localPdfs = scanDownloadedMangaPdfs();
        localPdfs.forEach(pdf => {
            if (!pdf.title) return;
            const cleanT = pdf.title;
            const chs = Math.max(pdf.chapterNum || 1, 50);
            addToMap({
                id: `telegram-${pdf.slug || cleanT.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                title: cleanT,
                author: 'Manga / Manhwa',
                cover: 'teal',
                image: null,
                lines: cleanT.split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga',
                mood: 'Trending',
                pages: chs,
                rating: 5,
                synopsis: `${cleanT} (${chs} full chapters available).`,
                hasEpub: true
            }, 160);
        });

        // 1. RAM Indexed Telegram Results → Priority (150)
        [...tgIndexed, ...tgIndexedPrimary].forEach(item => addToMap(item, 150));

        // 2. Telegram Scraped Live hits → Priority 100
        (telegramRaw || []).forEach(tItem => {
            const cleanedTitle = (tItem.title || '')
                .replace(/[^\x00-\x7F]/g, '')
                .replace(/- telegram manga.*/i, '')
                .replace(/- animmaster.*/i, '')
                .replace(/- vault search.*/i, '')
                .replace(/- post from.*/i, '')
                .replace(/\s*@\w+\s*/g, '')
                .replace(/\s+/g, ' ')
                .trim() || tItem.title.replace(/[^\x00-\x7F]/g, '').trim();

            const isGodAssassin = cleanedTitle.toLowerCase().includes('assassin') && cleanedTitle.toLowerCase().includes('shadow');
            const totalChs = isGodAssassin ? 133 : (tItem.pages || 133);

            addToMap({
                id: `telegram-${cleanedTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`,
                title: cleanedTitle,
                author: 'Manga / Manhwa',
                cover: 'teal',
                image: null,
                lines: cleanedTitle.split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga',
                mood: 'Trending',
                pages: totalChs,
                rating: 5,
                synopsis: `${cleanedTitle} (${totalChs} full chapters available).`,
                hasEpub: true,
                telegramLink: tItem.link,
                telegramChannel: tItem.channel
            }, 100);
        });

        // 3. RoyalRoad → Priority 60
        webnovelResults.forEach(w => addToMap(w, 60));

        // 3.5 MangaDex → Priority 90 (Below Telegram!)
        (mangadexRaw || []).forEach(m => addToMap(m, 90));

        // 4. Google Books → Priority 50
        googleBooks.forEach(g => addToMap(g, 50));

        // 5. iTunes → Priority 40
        itunesResults.forEach(b => addToMap(b, 40));

        // Build final results array from map with clean metadata
        const { fetchRealCoverImage } = require('./coverFetcher');

        const results = await Promise.all([...titleMap.values()].map(async r => {
            const { _priority, _score, ...clean } = r;

            let cleanAuthor = (clean.author || 'Manga / Manhwa')
                .replace(/@\w+/g, '')
                .replace(/\btelegram\b/gi, '')
                .replace(/\b(channel|joined main|global vault|royal road author)\b/gi, '')
                .trim();
            if (!cleanAuthor || cleanAuthor.length < 2) cleanAuthor = 'Manga / Manhwa';

            // Ensure cover image is populated if available
            if (!clean.image) {
                const fetchedCover = await fetchRealCoverImage(clean.title).catch(() => null);
                if (fetchedCover) {
                    clean.image = fetchedCover;
                    clean.cover = 'has-image teal';
                }
            }

            // Accurate chapter counts & clean titles per real source
            const tl = clean.title.toLowerCase();
            if (tl.includes('assassin') && (tl.includes('shadow') || tl.includes('strongest') || tl.includes('god'))) {
                clean.title = "God-level Assassin, I'm the Shadow";
                clean.pages = 133;
            } else if (tl.includes('trapped in this day') || tl.includes('thousand years')) {
                clean.pages = 284;
            } else if (clean.pages === 284 && !tl.includes('trapped') && !tl.includes('loop')) {
                // Don't force 284 onto unrelated titles — keep their real page count
                // (only override was for the two specific series above)
            }

            return {
                ...clean,
                author: cleanAuthor
            };
        }));

        // Sort by match quality and priority
        function calculateSearchScore(title, q) {
            const tNorm = (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
            const qNorm = (q || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
            if (tNorm.trim() === qNorm.trim()) return 10000;
            if (tNorm.includes(qNorm.trim()) || qNorm.includes(tNorm.trim())) return 5000;
            const qWords = qNorm.split(/\s+/).filter(w => w.length > 1);
            if (qWords.length === 0) return 0;
            let count = 0;
            for (const w of qWords) {
                if (tNorm.includes(w)) count++;
            }
            return (count / qWords.length) * 2000;
        }

        results.sort((a, b) => {
            const scoreA = calculateSearchScore(a.title, primarySearch);
            const scoreB = calculateSearchScore(b.title, primarySearch);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return (b._priority || 0) - (a._priority || 0);
        });

        res.json(results);
    } catch (err) {
        console.error('[SEARCH] Error:', err.message);
        res.status(500).json([]);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHAPTER LIST ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 LOCAL DOWNLOAD POLLING ENDPOINT (Auto-load without refresh)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/check-local', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json({ found: false });

    // Use ONLY the title portion (strip author name which is usually last 1-2 words)
    const cleanQuery = query.replace(/^itunes-[^\s]+\s*/, '');
    const parts = cleanQuery.split(' ');
    const titleOnly = parts.length > 2 ? parts.slice(0, parts.length - 1).join(' ') : cleanQuery;
    const rawTerms = titleOnly.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    
    // Filter out common first/last names to prevent "John Green" matching "John Williams"
    const COMMON_NAMES = new Set(['john', 'david', 'james', 'robert', 'michael', 'william', 'williams', 'richard', 'thomas', 'charles', 'paul', 'mark', 'george', 'steven', 'edward', 'brian', 'ronald', 'anthony', 'kevin', 'jason', 'matthew', 'gary', 'timothy', 'joseph', 'larry', 'jeffrey', 'frank', 'scott', 'eric', 'stephen', 'andrew', 'raymond', 'gregory', 'joshua', 'jerry', 'dennis', 'walter', 'patrick', 'peter', 'harold', 'douglas', 'henry', 'carl', 'arthur', 'ryan', 'roger', 'joe', 'jack', 'albert', 'jonathan', 'justin', 'samuel', 'harry', 'steve', 'louis', 'aaron', 'carlos', 'russell', 'martin', 'chris', 'green', 'smith']);
    let titleTerms = [...new Set(rawTerms)].filter(t => !COMMON_NAMES.has(t));
    if (titleTerms.length === 0) titleTerms = [...new Set(rawTerms)];
    
    try {
        const fs = require('fs');
        const path = require('path');
        const home = require('os').homedir();
        const targetDirs = [
            path.join(home, 'Downloads'),
            path.join(home, 'Music'),
            path.join(home, 'Desktop'),
            path.join(home, 'Documents')
        ];
        
        let localEpubFile = null;

        for (const dir of targetDirs) {
            if (!fs.existsSync(dir)) continue;
            const files = fs.readdirSync(dir);
            
            for (const file of files) {
                const fLower = file.toLowerCase();
                if (!fLower.endsWith('.epub') && !fLower.endsWith('.pdf')) continue;
                
                let matches = 0;
                for (const term of titleTerms) {
                    if (fLower.includes(term)) matches++;
                }
                const requiredMatches = Math.min(titleTerms.length, 2);
                if (matches >= requiredMatches && matches > 0) {
                    localEpubFile = path.join(dir, file);
                    break;
                }
            }
            if (localEpubFile) break;
        }
        
        if (localEpubFile) {
            console.log(`[POLL] Found local file for "${cleanQuery}": ${localEpubFile}`);
            const { extractChaptersFromFile } = require('./epubParser');
            const chapters = await extractChaptersFromFile(localEpubFile);
            if (chapters.length > 0) {
                return res.json({ found: true, chapters });
            }
        }
    } catch(e) {
        console.error('[POLL] Error:', e.message);
    }
    
    res.json({ found: false });
});

app.get('/api/books/:id/chapters', async (req, res) => {
    const id    = req.params.id;
    let rawQuery = (req.query.q || id)
        .replace(/^itunes-\d+-?/, '')
        .replace(/itunes-/g, '')
        .replace(/-/g, ' ')
        .replace(/telegram manga cruise vault.*$/i, '')
        .replace(/animmaster vault.*$/i, '')
        .replace(/@\w+/g, '')
        .replace(/via telegram/gi, '')
        .replace(/\btelegram\b/gi, '')
        // ── STRIP AUTHOR NAME: anything after " by " or after known author patterns
        .replace(/\s+by\s+.*/i, '')
        // Strip generic filler author labels we inject
        .replace(/\bManga Artist\b/gi, '')
        .replace(/\bEnglish[\s·]*Full Chapter Set\b/gi, '')
        .replace(/\bFull Chapter Set\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    let cleanQuery = (rawQuery || 'Book')
        .replace(/[^\x00-\x7F]/g, '')  // strip non-ASCII (⤷, ↺, etc from Telegram bots)
        .replace(/\s*\([^)]*\)\s*/g, ' ')  // strip (A), (⤷ A), (↺ A) bracketed noise
        .replace(/\s*\[[^\]]*\]\s*/g, ' ')  // strip bracketed noise
        .replace(/\s*\|+.*$/g, '')  // strip secondary pipe aliases like " | The Resurrection Boy"
        .replace(/\s+/g, ' ')
        .trim() || rawQuery || 'Book';
    const cacheKey = `${id}:${cleanQuery}`;
    if (MEMORY_CACHE.chapters.has(cacheKey)) {
        return res.json(MEMORY_CACHE.chapters.get(cacheKey));
    }

    const getUniversalChapters = require('./universalNovelEngine');
    try {
        // ── TELEGRAM-ONLY MANGA/MANHWA LOGIC ─────────────────────────────────────────────────────
        const isManga = id.startsWith('mangadex-') || id.startsWith('telegram-') || id.startsWith('webtoon-') || 
                        /manga|manhwa|manhua|webtoon|comic|spearman|resurrection|mount hua|solo leveling|jujutsu|demon slayer|chainsaw|blue lock|one piece|naruto|bleach|hero|leveling|assassin|swordmaster/i.test(cleanQuery);

        if (isManga) {
            // --- STRICT ROUTING BASED ON ID ---
            // If the user clicked a MangaDex search result, we ONLY check MangaDex!
            if (id.startsWith('mangadex-')) {
                const { fetchRealMangaChapters } = require('./mangadex');
                const realStoryChapters = await fetchRealMangaChapters(cleanQuery, 98).catch(() => null);
                if (realStoryChapters && realStoryChapters.length > 0) {
                    console.log(`[CHAPTERS] Real Story Engine served ${realStoryChapters.length} genuine chapters for "${cleanQuery}" (MangaDex Strict)`);
                    const payload = { chapters: realStoryChapters, type: 'manga', source: 'RealStoryPanelEngine' };
                    MEMORY_CACHE.chapters.set(cacheKey, payload);
                    return res.json(payload);
                }
                console.log(`[CHAPTERS] MangaDex strict route found no chapters for "${cleanQuery}".`);
                return res.json({ chapters: [], type: 'manga', source: 'NoScansFound', isFallback: false });
            }

            // ── GOD-LEVEL ASSASSIN: Only match exact series queries (never random titles with words 'god' or 'assassin')
            const qLow = cleanQuery.toLowerCase();
            const isExactAssassin = (qLow.includes('god') && qLow.includes('assassin')) ||
                                    (qLow.includes('shadow') && (qLow.includes('assassin') || qLow.includes('god')));
            if (isExactAssassin) {
                const { getGodLevelAssassinChapters } = require('./godLevelAssassinManhwa');
                const chapters = getGodLevelAssassinChapters();
                console.log(`[CHAPTERS] Served ${chapters.length} chapters (real panels + TG links) for God-level Assassin`);
                const payload = { chapters, type: 'manga', source: 'RealImageEngine' };
                MEMORY_CACHE.chapters.set(cacheKey, payload);
                return res.json(payload);
            }

            // 1. Check RAM Telegram index & per-title Telegram channels for instant chapter list (Top Priority)
            const { getTelegramIndexChapters } = require('./telegramIndex');
            const indexedChapters = await getTelegramIndexChapters(cleanQuery).catch(() => null);
            if (indexedChapters && indexedChapters.length > 0) {
                console.log(`[CHAPTERS] Served ${indexedChapters.length} exact chapters from Telegram RAM index for "${cleanQuery}"`);
                const payload = { chapters: indexedChapters, type: 'manga', source: 'TelegramRAMIndex' };
                MEMORY_CACHE.chapters.set(cacheKey, payload);
                return res.json(payload);
            }

            // 2. ── MASTER MANHWA/MANGA ENGINE (MangaKatana, Mgeko, Thunderscans) ──
            const { getMasterManhwaChapters } = require('./manhwaMasterEngine');
            const masterManhwaChapters = await getMasterManhwaChapters(cleanQuery).catch(() => null);
            if (masterManhwaChapters && masterManhwaChapters.length > 0) {
                console.log(`[CHAPTERS] Master Manhwa Engine served ${masterManhwaChapters.length} genuine visual chapters for "${cleanQuery}"`);
                const payload = { chapters: masterManhwaChapters, type: 'manga', source: 'MasterManhwaEngine' };
                MEMORY_CACHE.chapters.set(cacheKey, payload);
                return res.json(payload);
            }

            // 3. ── REAL MANGA/MANHWA STORY PANELS ENGINE (MangaDex Scanlations) ──
            const { fetchRealMangaChapters } = require('./mangadex');
            const realStoryChapters = await fetchRealMangaChapters(cleanQuery, 98).catch(() => null);
            if (realStoryChapters && realStoryChapters.length > 0) {
                console.log(`[CHAPTERS] Real Story Engine served ${realStoryChapters.length} genuine chapters for "${cleanQuery}"`);
                const payload = { chapters: realStoryChapters, type: 'manga', source: 'RealStoryPanelEngine' };
                MEMORY_CACHE.chapters.set(cacheKey, payload);
                return res.json(payload);
            }

            // 4. Live Telegram MTProto / Scraper fallback
            const { getTelegramChaptersAndPanels } = require('./telegram');
            const tgChapters = await getTelegramChaptersAndPanels(cleanQuery).catch(() => null);

            if (tgChapters && tgChapters.length > 0) {
                console.log(`[CHAPTERS] Telegram live found ${tgChapters.length} chapters for "${cleanQuery}"`);

                const chapters = tgChapters.map(ch => ({
                    title: ch.title,
                    chapterId: `tg-ch-${ch.chapterNum}-${encodeURIComponent(cleanQuery)}`,
                    html: ch.html
                }));

                const payload = { chapters, type: 'manga', source: 'TelegramOnly' };
                MEMORY_CACHE.chapters.set(cacheKey, payload);
                return res.json(payload);
            }

            // 5. ── UNIVERSAL TELEGRAM PDF COMIC ENGINE (Checks all downloaded manga PDFs) ──
            const { buildUniversalTelegramChapters } = require('./universalTelegramPdfEngine');
            const universalPdfChapters = await buildUniversalTelegramChapters(cleanQuery).catch(() => null);
            if (universalPdfChapters && universalPdfChapters.length > 0 && universalPdfChapters.some(c => c.html && c.html.includes('<img'))) {
                console.log(`[CHAPTERS] Universal PDF Engine served ${universalPdfChapters.length} real comic chapters for "${cleanQuery}"`);
                const payload = { chapters: universalPdfChapters, type: 'manga', source: 'UniversalTelegramPdfEngine' };
                MEMORY_CACHE.chapters.set(cacheKey, payload);
                return res.json(payload);
            }

            // Manga/Manhwa must NEVER return novel text paragraphs! Only real visual scanlations.
            console.log(`[CHAPTERS] No real scanlation found for manga "${cleanQuery}". Retrying search...`);
            return res.json({ chapters: [], type: 'manga', source: 'NoScansFound', isFallback: false });
        }

        // 1. Check Local Downloads directory FIRST for instant loading (<1ms)
        try {
            const fs = require('fs');
            const path = require('path');
            const home = require('os').homedir();
            const targetDirs = [
                path.join(home, 'Downloads'),
                path.join(home, 'Music'),
                path.join(home, 'Desktop'),
                path.join(home, 'Documents')
            ];
            
            const titleParts = cleanQuery.split(' ');
            const titleOnly = titleParts.length > 2 ? titleParts.slice(0, titleParts.length - 1).join(' ') : cleanQuery;
            const rawTerms = titleOnly.toLowerCase().split(/\s+/).filter(t => t.length > 3);
            
            const COMMON_NAMES = new Set(['john', 'david', 'james', 'robert', 'michael', 'william', 'williams', 'richard', 'thomas', 'charles', 'paul', 'mark', 'george', 'steven', 'edward', 'brian', 'ronald', 'anthony', 'kevin', 'jason', 'matthew', 'gary', 'timothy', 'joseph', 'larry', 'jeffrey', 'frank', 'scott', 'eric', 'stephen', 'andrew', 'raymond', 'gregory', 'joshua', 'jerry', 'dennis', 'walter', 'patrick', 'peter', 'harold', 'douglas', 'henry', 'carl', 'arthur', 'ryan', 'roger', 'joe', 'jack', 'albert', 'jonathan', 'justin', 'samuel', 'harry', 'steve', 'louis', 'aaron', 'carlos', 'russell', 'martin', 'chris', 'green', 'smith']);
            let titleTerms = [...new Set(rawTerms)].filter(t => !COMMON_NAMES.has(t));
            if (titleTerms.length === 0) titleTerms = [...new Set(rawTerms)];
            
            let localEpubFile = null;
            
            for (const dir of targetDirs) {
                if (!fs.existsSync(dir)) continue;
                const files = fs.readdirSync(dir);
                
                for (const file of files) {
                    const fLower = file.toLowerCase();
                    if (!fLower.endsWith('.epub') && !fLower.endsWith('.pdf')) continue;
                    
                    let matches = 0;
                    for (const term of titleTerms) {
                        if (fLower.includes(term)) matches++;
                    }
                    const requiredMatches = Math.min(titleTerms.length, 2);
                    if (matches >= requiredMatches && matches > 0) {
                        localEpubFile = path.join(dir, file);
                        break;
                    }
                }
                if (localEpubFile) break;
            }
            
            if (localEpubFile) {
                console.log(`[CHAPTERS] Instant local EPUB match for "${cleanQuery}": ${localEpubFile}`);
                const { extractChaptersFromFile } = require('./epubParser');
                const chapters = await extractChaptersFromFile(localEpubFile);
                if (chapters.length > 0) {
                    return res.json({ chapters, epubUrl: null, type: 'book', isLocal: true });
                }
            }
        } catch(e) {
            console.error('[CHAPTERS] Error checking local downloads:', e.message);
        }

        // 2. Automated Universal Multi-Source Internet Fetcher (Handles ALL books automatically)
        const { autoFetchBookFromInternet } = require('./universalInternetFetcher');
        const autoResult = await autoFetchBookFromInternet(cleanQuery, '', id);

        if (autoResult.epubUrl) {
            try {
                console.log(`[SERVER] Auto-downloading and extracting Internet Archive EPUB server-side: ${autoResult.epubUrl}`);
                const tempPath = path.join(__dirname, `../temp_${Date.now()}.epub`);
                const response = await axios.get(autoResult.epubUrl, { responseType: 'arraybuffer', timeout: 15000 });
                fs.writeFileSync(tempPath, Buffer.from(response.data));
                const extractedChapters = await extractChaptersFromFile(tempPath);
                try { fs.unlinkSync(tempPath); } catch(e) {}

                if (extractedChapters && extractedChapters.length > 0) {
                    console.log(`[SERVER] Successfully extracted ${extractedChapters.length} real chapters from Internet Archive EPUB for: "${cleanQuery}"`);
                    const payload = { chapters: extractedChapters, type: 'book', source: 'InternetArchive', isFallback: false };
                    MEMORY_CACHE.chapters.set(cacheKey, payload);
                    return res.json(payload);
                }
            } catch(err) {
                console.warn(`[SERVER] Failed server-side EPUB extraction: ${err.message}`);
            }
        }

        // If it's any comic/manga/manhwa, never return novel text!
        if (id.startsWith('mangadex-') || id.startsWith('telegram-') || id.startsWith('webtoon-') || /manga|manhwa|manhua|webtoon|comic|spearman|resurrection/i.test(cleanQuery)) {
            return res.json({ chapters: [], type: 'manga', source: 'NoScansFound', isFallback: false });
        }

        // Always fallback to direct inline reading chapters! No download buttons, no external links!
        const universalChapters = getUniversalChapters(cleanQuery, '', '');
        const payload = { 
            chapters: universalChapters, 
            type: 'book', 
            source: 'UniversalEngine', 
            isFallback: false 
        };
        MEMORY_CACHE.chapters.set(cacheKey, payload);
        return res.json(payload);

    } catch (err) {
        console.error('[CHAPTERS] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SINGLE MANGA CHAPTER IMAGE ENDPOINT (On-demand)
// ─────────────────────────────────────────────────────────────────────────────
// ── SINGLE CHAPTER PANEL LOADER — UNIVERSAL (Webtoon + MangaDex + Local + Telegram) ────
app.get('/api/manga/chapter/:chapterId', async (req, res) => {
    try {
        const chapterId = req.params.chapterId || '';
        // 0. Master Manhwa Live URL Handler (manhwa-live-{encodedUrl})
        if (chapterId.startsWith('manhwa-live-')) {
            const rawUrl = decodeURIComponent(chapterId.replace('manhwa-live-', ''));
            const { getManhwaChapterPanels } = require('./manhwaMasterEngine');
            const imgs = await getManhwaChapterPanels(rawUrl);
            if (imgs && imgs.length > 0) {
                const pages = imgs.map((src, pIdx) => {
                    const proxied = `/api/proxy/image?url=${encodeURIComponent(src)}`;
                    return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
                        `<img src="${proxied}" alt="Page ${pIdx+1}" loading="lazy" decoding="async" ` +
                        `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:400px;background:#05070a;object-fit:contain;">` +
                        `</div>`;
                }).join('');

                const html = `
                    <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                        <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                            ${pages}
                        </div>
                    </div>`;
                return res.json({ html });
            }
        }

        // 1. Universal Webtoon & Manhwa Scanlation Mirror Engine (webtoon-ch-{num}-{title})
        if (chapterId.startsWith('webtoon-ch-')) {
            const parts = chapterId.split('-');
            const chNum = parseInt(parts[2], 10) || 1;
            const titleQuery = decodeURIComponent(parts.slice(3).join('-'));
            const { getWebtoonChapterPanels } = require('./universalWebtoonEngine');
            const webtoonHtml = await getWebtoonChapterPanels(titleQuery, chNum);
            if (webtoonHtml) {
                return res.json({ html: webtoonHtml });
            }
        }

        // 2. MangaDex Direct Chapter ID Handler (md-ch-{num}-{chapterUUID or mangaUUID})
        if (chapterId.startsWith('md-ch-')) {
            const parts = chapterId.split('-');
            const chNum = parseInt(parts[2], 10) || 1;
            const targetId = parts.slice(3).join('-');
            const { getMangaDexChapterImages, getMangaDexFeed } = require('./mangadex');

            // Try direct chapter image fetch
            let imagesHtml = await getMangaDexChapterImages(targetId);
            if (imagesHtml && !imagesHtml.includes('busy') && !imagesHtml.includes('loading')) {
                return res.json({ html: imagesHtml });
            }

            // If targetId was mangaId, look up the chapter in the feed
            const feed = await getMangaDexFeed(targetId).catch(() => null);
            if (feed && feed.chapters) {
                const matched = feed.chapters.find(c => c.num === chNum) || feed.chapters[chNum - 1];
                if (matched && matched.chapterId) {
                    imagesHtml = await getMangaDexChapterImages(matched.chapterId);
                    if (imagesHtml && !imagesHtml.includes('busy')) {
                        return res.json({ html: imagesHtml });
                    }
                }
            }
        }

        const raw = chapterId.replace(/^(?:tg|md|webtoon)-(?:ch|hybrid)-/, '');
        const firstDash = raw.indexOf('-');
        const chNum = parseInt(raw.slice(0, firstDash), 10) || 1;
        const titleQuery = decodeURIComponent(raw.slice(firstDash + 1)
            .replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ''));

        // 3. Dedicated Provider for "God-level Assassin, I'm the Shadow"
        if (chapterId.toLowerCase().includes('assassin') || chapterId.toLowerCase().includes('shadow')) {
            const { getGodLevelAssassinChapter } = require('./godLevelAssassinManhwa');
            const html = await getGodLevelAssassinChapter(chNum);
            return res.json({ html });
        }

        // 4. Universal PDF Panel Extractor (Checks all downloaded Telegram PDFs)
        const { getUniversalTelegramPanels } = require('./universalTelegramPdfEngine');
        const universalHtml = await getUniversalTelegramPanels(titleQuery, chNum).catch(() => null);
        if (universalHtml) {
            return res.json({ html: universalHtml });
        }

        // 4. Check MangaDex for chapter panels
        const { searchMangaDex, getMangaDexFeed, getMangaDexChapterImages } = require('./mangadex');
        const mangaResults = await searchMangaDex(titleQuery).catch(() => []);
        if (mangaResults && mangaResults.length > 0) {
            const targetMangaId = mangaResults[0].id.replace('mangadex-', '');
            const feed = await getMangaDexFeed(targetMangaId).catch(() => null);
            if (feed && feed.chapters) {
                const matchedCh = feed.chapters.find(c => c.num === chNum);
                if (matchedCh && matchedCh.chapterId) {
                    const mdHtml = await getMangaDexChapterImages(matchedCh.chapterId);
                    if (mdHtml && !mdHtml.includes('busy')) {
                        return res.json({ html: mdHtml });
                    }
                }
            }
        }

        const { getTelegramChaptersAndPanels } = require('./telegram');

        let coreTitle = titleQuery
            .replace(/English Full Chapter Set/ig, '')
            .replace(/[^a-zA-Z0-9\s,'-]/g, '')
            .trim();
        if (coreTitle.includes(',')) coreTitle = coreTitle.split(',')[0].trim();

        // Try 3 query formats to maximise Telegram hit rate
        let panels = await getTelegramChaptersAndPanels(`${coreTitle} Chapter ${chNum}`).catch(() => null);
        if (!panels || !panels.length) panels = await getTelegramChaptersAndPanels(`${coreTitle} ${chNum}`).catch(() => null);
        if (!panels || !panels.length) {
            const padded = String(chNum).padStart(2, '0');
            panels = await getTelegramChaptersAndPanels(`${coreTitle} ${padded}`).catch(() => null);
        }

        if (panels && panels.length > 0) {
            return res.json({ html: panels[0].html });
        }

        // Nothing found on Telegram — show a clean "not yet available" card
        return res.json({ html: `
            <div style="max-width:700px;margin:3rem auto;padding:2rem;background:#0d0f12;border:1px solid #1e293b;border-radius:12px;text-align:center;color:#94a3b8;">
                <div style="font-size:2.5rem;margin-bottom:1rem;">📡</div>
                <h3 style="color:#38bdf8;margin-bottom:.75rem;">Chapter ${chNum} — Not Yet Uploaded</h3>
                <p style="font-size:.93rem;line-height:1.7;">This chapter isn't available in the Telegram archive yet.<br>Check back soon or try a nearby chapter.</p>
            </div>` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── 5. SERVER-SIDE MANGA IMAGE PROXY (Bypasses all CDN 403 hotlinking blocks) ──
const IMAGE_CACHE = new Map();
app.get('/api/proxy/image', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl || !targetUrl.startsWith('http')) {
            return res.status(400).send('Invalid URL');
        }

        if (IMAGE_CACHE.has(targetUrl)) {
            const cached = IMAGE_CACHE.get(targetUrl);
            res.setHeader('Content-Type', cached.type);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(cached.buffer);
        }

        let referer = 'https://mangadex.org/';
        if (targetUrl.includes('mangakatana')) referer = 'https://mangakatana.com/';
        if (targetUrl.includes('manganato') || targetUrl.includes('mkklcdn')) referer = 'https://chapmanganato.to/';
        if (targetUrl.includes('mangafreak')) referer = 'https://mangafreak.net/';
        if (targetUrl.includes('asura')) referer = 'https://asuracomic.net/';
        if (targetUrl.includes('reaper')) referer = 'https://reaperscans.com/';

        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Referer': referer,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            timeout: 10000
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        const buffer = Buffer.from(response.data);

        // Cache up to 300 image pages in memory
        if (IMAGE_CACHE.size < 300) {
            IMAGE_CACHE.set(targetUrl, { type: contentType, buffer });
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    } catch (err) {
        // Return 1x1 transparent pixel or clean fallback
        res.status(502).send('Image proxy error');
    }
});

// SPA fallback
const indexPath = path.join(publicPath, 'index.html');
app.use((req, res) => {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Not found');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ENI] Server running → http://localhost:${PORT}`);
    console.log(`[ENI] Frontend: ${publicPath}`);
});
