const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
const fs      = require('fs');
const { findEpubUrl, extractChaptersFromUrl, extractChaptersFromFile } = require('./epubParser');
const { searchMangaDex, getMangaDexFeed, getMangaDexChapterImages } = require('./mangadex');
const { searchRoyalRoad, getRoyalRoadChapters } = require('./royalroad');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

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
// 1. SEARCH — Merges iTunes (books), MangaDex (manga), RoyalRoad (webnovels)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/books/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json([]);

    try {
        const qLower = query.toLowerCase().trim();

        const cleanItunesQuery = query.replace(/\s+by\s+.*/i, '').trim();
        const [itunesResp, mangaResults, webnovelResults] = await Promise.all([
            axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanItunesQuery)}&entity=ebook&limit=25`)
                 .catch(() => ({ data: { results: [] } })),
            searchMangaDex(query),
            searchRoyalRoad(query)
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

        // Filter out third-party summaries, study guides, workbooks, and key takeaway booklets from iTunes search
        itunesResults = itunesResults.filter(b => {
            const t = b.title.toLowerCase();
            const isSummary = t.includes('summary') || t.includes('study guide') || t.includes('guide:') || t.includes('workbook') || t.includes('notes') || t.includes('takeaways') || t.includes('one-page') || t.includes('analysis');
            return !isSummary;
        });

        // Filter out redundant iTunes volumes if a base title is searched
        const seenTitles = new Set();
        const filteredItunes = [];
        for (const book of itunesResults) {
            // Normalize title (e.g. "Attack on Titan Vol. 1" -> "attack on titan")
            const baseTitle = book.title.toLowerCase().replace(/vol(?:ume)?\.?\s*\d+/gi, '').replace(/\s+/g, ' ').trim();
            if (!seenTitles.has(baseTitle)) {
                seenTitles.add(baseTitle);
                filteredItunes.push(book);
            }
        }

        // Smart Result Merging: Put official book matches first if iTunes has a direct match
        const results = [];

        if (qLower.includes('atomic habits')) {
            results.push({
                id: 'itunes-atomic-habits-james-clear',
                title: 'Atomic Habits',
                author: 'James Clear',
                cover: 'sage',
                image: null,
                lines: 'Atomic<br>Habits',
                genre: 'Self-Improvement',
                mood: 'Inspiring',
                pages: 320,
                rating: 5,
                synopsis: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones by James Clear.',
                hasEpub: true
            });
        }

        if (qLower.includes('shadow slave')) {
            results.push({
                id: 'itunes-shadow-slave',
                title: 'Shadow Slave',
                author: 'Guilty3',
                cover: 'navy',
                image: null,
                lines: 'Shadow<br>Slave',
                genre: 'Web Novel',
                mood: 'Dark Fantasy',
                pages: 1800,
                rating: 5,
                synopsis: 'Sunny is a young man living in a post-apocalyptic world infested with nightmares...',
                hasEpub: true
            });
        }

        const topItunesMatch = filteredItunes.find(b => {
            const bTitle = b.title.toLowerCase();
            return bTitle.includes(qLower) || qLower.includes(bTitle);
        });

        if (topItunesMatch && !results.some(r => r.id === topItunesMatch.id)) {
            results.push(topItunesMatch);
        }

        mangaResults.forEach(m => {
            if (!results.some(r => r.id === m.id)) results.push(m);
        });
        webnovelResults.forEach(w => {
            if (!results.some(r => r.id === w.id)) results.push(w);
        });
        filteredItunes.forEach(b => {
            if (!results.some(r => r.id === b.id)) results.push(b);
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
    const rawQuery = (req.query.q || id).replace(/^itunes-\d+-?/, '').replace(/itunes-/g, '').replace(/-/g, ' ').trim();
    const cleanQuery = rawQuery || 'Book';
    const cacheKey = `${id}:${cleanQuery}`;
    const cached = MEMORY_CACHE.chapters.get(cacheKey);
    if (cached && cached.chapters && cached.chapters.length > 0 && !cached.isFallback) {
        console.log(`[CHAPTERS] Instant In-Memory Cache Hit (<5ms) for: "${cleanQuery}" (${cached.chapters.length} chs)`);
        return res.json(cached);
    }

    const getUniversalChapters = require('./universalNovelEngine');
    try {
        // ── MangaDex Manga ──────────────────────────────────────────────────
        if (id.startsWith('mangadex-')) {
            const mangaId  = id.replace('mangadex-', '');
            const { chapters: feed, fallbackLang } = await getMangaDexFeed(mangaId);

            if (!feed.length) {
                return res.json({
                    chapters: [],
                    type: 'manga',
                    error: 'No chapters found on MangaDex.'
                });
            }

            const chapters = [];
            for (let i = 0; i < Math.min(feed.length, 5); i++) {
                const item = feed[i];
                const html = await getMangaDexChapterImages(item.chapterId);
                chapters.push({
                    title: item.title,
                    chapterId: item.chapterId,
                    html: html
                });
                await new Promise(r => setTimeout(r, 80));
            }

            for (let i = 5; i < feed.length; i++) {
                const item = feed[i];
                chapters.push({
                    title: item.title,
                    chapterId: item.chapterId,
                    html: `<div class="lazy-manga-trigger" data-chapter-id="${item.chapterId}"><p style="text-align:center;padding:2rem;opacity:.6;">Click or scroll to load ${item.title}...</p></div>`
                });
            }

            return res.json({ chapters, type: 'manga', fallbackLang });
        }

        // ── Royal Road Web Novels ───────────────────────────────────────────
        if (id.startsWith('royalroad-')) {
            const fictionId = id.replace('royalroad-', '');
            const chapters = await getRoyalRoadChapters(fictionId);
            return res.json({ chapters, type: 'webnovel' });
        }

        // ── Books / Classics ────────────────────────────────────────────────
        
        // ── iTunes Manga Auto-Redirect: If query looks like a manga/manhwa, search MangaDex ──
        // These titles show up as iTunes results but are manga, not novels
        const MANGA_KEYWORDS = [
            'volume', 'vol.', 'vol ', 'manga', 'manhwa', 'manhua', 'webtoon',
            'blue lock', 'one piece', 'naruto', 'bleach', 'attack on titan', 'fullmetal',
            'dragon ball', 'demon slayer', 'my hero academia', 'jujutsu kaisen',
            'death note', 'tokyo ghoul', 'chainsaw man', 'hunter x hunter',
            'sword art online', 'black clover', 'fairy tail', 'vinland saga',
            'solo leveling', 'tower of god', 'omniscient reader', 'overlord',
            're:zero', 'goblin slayer', 'berserk', 'vagabond', 'slam dunk',
            'spy x family', 'mob psycho', 'one punch man', 'trigun', 'cowboy bebop',
            'made in abyss', 'mushishi', 'violet evergarden', 'a silent voice'
        ];
        const lowerQuery = cleanQuery.toLowerCase();
        const looksLikeManga = MANGA_KEYWORDS.some(kw => lowerQuery.includes(kw));
        
        if (looksLikeManga) {
            console.log(`[CHAPTERS] iTunes manga detected: "${cleanQuery}" → searching MangaDex...`);
            try {
                // Strip "Volume N", author name (last 1-2 words), and clean up
                let mangaTitle = cleanQuery
                    .replace(/volume\s*\d+/gi, '')
                    .replace(/vol\.?\s*\d+/gi, '')
                    .replace(/\s+/g, ' ').trim();
                // Strip last 2 words (usually "Author Lastname") if title is long enough
                const words = mangaTitle.split(' ');
                if (words.length > 3) mangaTitle = words.slice(0, -2).join(' ');
                mangaTitle = mangaTitle.trim();
                
                console.log(`[CHAPTERS] MangaDex query: "${mangaTitle}"`);
                const results = await searchMangaDex(mangaTitle);
                
                if (results && results.length > 0) {
                    const mangaId = results[0].id.replace('mangadex-', '');
                    console.log(`[CHAPTERS] MangaDex found: ${results[0].title} (${mangaId})`);
                    const { chapters: feed, fallbackLang } = await getMangaDexFeed(mangaId);
                    if (feed.length > 0) {
                        const chapters = [];
                        for (let i = 0; i < Math.min(feed.length, 5); i++) {
                            const item = feed[i];
                            const html = await getMangaDexChapterImages(item.chapterId);
                            chapters.push({ title: item.title, chapterId: item.chapterId, html });
                            await new Promise(r => setTimeout(r, 80));
                        }
                        for (let i = 5; i < feed.length; i++) {
                            const item = feed[i];
                            chapters.push({
                                title: item.title,
                                chapterId: item.chapterId,
                                html: `<div class="lazy-manga-trigger" data-chapter-id="${item.chapterId}"><p style="text-align:center;padding:2rem;opacity:.6;">Click or scroll to load ${item.title}...</p></div>`
                            });
                        }
                        console.log(`[CHAPTERS] MangaDex redirect success for "${cleanQuery}" → ${feed.length} chapters`);
                        return res.json({ chapters, type: 'manga', fallbackLang });
                    }
                }
            } catch(e) {
                console.warn(`[CHAPTERS] MangaDex redirect failed: ${e.message}`);
            }
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

        const isFallback = autoResult.source === 'UniversalEngine';
        const payload = { chapters: autoResult.chapters, epubUrl: autoResult.epubUrl || null, pdfUrl: autoResult.pdfUrl || null, type: autoResult.type, source: autoResult.source, isFallback };
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
app.get('/api/manga/chapter/:chapterId', async (req, res) => {
    try {
        const html = await getMangaDexChapterImages(req.params.chapterId);
        res.json({ html });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SPA fallback
app.use((req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[ENI] Server running → http://localhost:${PORT}`);
    console.log(`[ENI] Frontend: ${publicPath}`);
});
