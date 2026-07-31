const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
const { findEpubUrl, extractChaptersFromUrl } = require('./epubParser');
const { searchMangaDex, getMangaDexFeed, getMangaDexChapterImages } = require('./mangadex');
const { searchRoyalRoad, getRoyalRoadChapters } = require('./royalroad');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

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

        const [itunesResp, mangaResults, webnovelResults] = await Promise.all([
            axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=ebook&limit=25`)
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

        const itunesResults = itunesRaw.map((book, i) => {
            const color    = COLORS[i % COLORS.length];
            const title    = book.trackName   || 'Unknown Title';
            const author   = book.artistName  || 'Unknown Author';
            const coverUrl = book.artworkUrl100
                ? book.artworkUrl100.replace('100x100bb', '600x600bb')
                : null;

            let synopsis = (book.description || `A work by ${author}.`).replace(/<[^>]*>?/gm, '');

            return {
                id:       `itunes-${book.trackId}`,
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

        // Prioritize MangaDex and RoyalRoad (which contain full series / instant chapters)
        const results = [];
        // Add MangaDex matches first
        mangaResults.forEach(m => results.push(m));
        // Add RoyalRoad matches next
        webnovelResults.forEach(w => results.push(w));
        // Add filtered iTunes books next
        filteredItunes.forEach(b => {
            // Avoid adding iTunes duplicates if MangaDex already has it
            const bTitle = b.title.toLowerCase().replace(/vol(?:ume)?\.?\s*\d+/gi, '').trim();
            const existsInManga = mangaResults.some(m => m.title.toLowerCase().includes(bTitle) || bTitle.includes(m.title.toLowerCase()));
            if (!existsInManga) {
                results.push(b);
            }
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
    const cleanQuery = query.replace(/^itunes-\d+\s*/, '');
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
        const downloadsDir = path.join(require('os').homedir(), 'Downloads');
        
        if (fs.existsSync(downloadsDir)) {
            const files = fs.readdirSync(downloadsDir);
            let localEpubFile = null;
            
            // Check both .epub and .pdf files
            for (const file of files) {
                const fLower = file.toLowerCase();
                if (!fLower.endsWith('.epub') && !fLower.endsWith('.pdf')) continue;
                
                let matches = 0;
                for (const term of titleTerms) {
                    if (fLower.includes(term)) matches++;
                }
                // Require at least 2 title words (or 1 if title only has 1 unique word)
                const requiredMatches = Math.min(titleTerms.length, 2);
                if (matches >= requiredMatches && matches > 0) {
                    localEpubFile = path.join(downloadsDir, file);
                    break;
                }
            }
            
            if (localEpubFile) {
                console.log(`[POLL] Found local file for "${cleanQuery}": ${localEpubFile}`);
                const { extractChaptersFromFile } = require('./epubParser');
                const chapters = await extractChaptersFromFile(localEpubFile);
                if (chapters.length > 0) {
                    return res.json({ found: true, chapters });
                }
            }
        }
    } catch(e) {
        console.error('[POLL] Error:', e.message);
    }
    
    res.json({ found: false });
});

app.get('/api/books/:id/chapters', async (req, res) => {
    const id    = req.params.id;
    const query = req.query.q || id;
    console.log(`[CHAPTERS] "${query}" (id=${id})`);

    try {
        // ── MangaDex Manga ──────────────────────────────────────────────────
        if (id.startsWith('mangadex-')) {
            const mangaId  = id.replace('mangadex-', '');
            const { chapters: feed, fallbackLang } = await getMangaDexFeed(mangaId);

            if (!feed.length) {
                return res.status(404).json({
                    error: 'No chapter uploads available on public manga archives for this title.'
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
        const cleanQuery = query.replace(/^itunes-\d+\s*/, '');
        
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
            const downloadsDir = path.join(require('os').homedir(), 'Downloads');
            if (fs.existsSync(downloadsDir)) {
                const files = fs.readdirSync(downloadsDir);
                const titleParts = cleanQuery.split(' ');
                const titleOnly = titleParts.length > 2 ? titleParts.slice(0, titleParts.length - 1).join(' ') : cleanQuery;
                const rawTerms = titleOnly.toLowerCase().split(/\s+/).filter(t => t.length > 3);
                
                const COMMON_NAMES = new Set(['john', 'david', 'james', 'robert', 'michael', 'william', 'williams', 'richard', 'thomas', 'charles', 'paul', 'mark', 'george', 'steven', 'edward', 'brian', 'ronald', 'anthony', 'kevin', 'jason', 'matthew', 'gary', 'timothy', 'joseph', 'larry', 'jeffrey', 'frank', 'scott', 'eric', 'stephen', 'andrew', 'raymond', 'gregory', 'joshua', 'jerry', 'dennis', 'walter', 'patrick', 'peter', 'harold', 'douglas', 'henry', 'carl', 'arthur', 'ryan', 'roger', 'joe', 'jack', 'albert', 'jonathan', 'justin', 'samuel', 'harry', 'steve', 'louis', 'aaron', 'carlos', 'russell', 'martin', 'chris', 'green', 'smith']);
                let titleTerms = [...new Set(rawTerms)].filter(t => !COMMON_NAMES.has(t));
                if (titleTerms.length === 0) titleTerms = [...new Set(rawTerms)];
                
                let localEpubFile = null;
                
                for (const file of files) {
                    const fLower = file.toLowerCase();
                    if (!fLower.endsWith('.epub') && !fLower.endsWith('.pdf')) continue;
                    
                    let matches = 0;
                    for (const term of titleTerms) {
                        if (fLower.includes(term)) matches++;
                    }
                    const requiredMatches = Math.min(titleTerms.length, 2);
                    if (matches >= requiredMatches && matches > 0) {
                        localEpubFile = path.join(downloadsDir, file);
                        break;
                    }
                }
                
                if (localEpubFile) {
                    console.log(`[CHAPTERS] Instant local EPUB match for "${cleanQuery}": ${localEpubFile}`);
                    const { extractChaptersFromFile } = require('./epubParser');
                    const chapters = await extractChaptersFromFile(localEpubFile);
                    if (chapters.length > 0) {
                        return res.json({ chapters, epubUrl: null, type: 'book', isLocal: true });
                    }
                }
            }
        } catch(e) {
            console.error('[CHAPTERS] Error checking local downloads:', e.message);
        }

        // 2. Fast check public domain archives (Gutenberg / Standard Ebooks) for classic non-iTunes books
        if (!id.startsWith('itunes-')) {
            try {
                const epubUrl = await findEpubUrl(cleanQuery);
                if (epubUrl) {
                    const chapters = await extractChaptersFromUrl(epubUrl);
                    if (chapters.length > 0) {
                        return res.json({ chapters, epubUrl, type: 'book' });
                    }
                }
            } catch(e) {
                console.warn(`[CHAPTERS] Public domain check skipped/failed: ${e.message}`);
            }
        }

        // Fallback for modern copyrighted novels
        console.log(`[CHAPTERS] Generating digital reading edition for copyrighted title: "${cleanQuery}"`);
        const fallbackChapters = [
            {
                title: `1. Reading Guide — ${cleanQuery}`,
                html: `<p><strong>${cleanQuery}</strong> is a modern copyrighted commercial book.</p><p>To read the full text edition, use the <strong>Shadow Library Backdoor links</strong> below to download the <strong>.epub</strong> file. Once the download finishes, our app will automatically detect it and display the full book here!</p>`
            }
        ];

        res.json({ chapters: fallbackChapters, epubUrl: null, type: 'book', isFallback: true });

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
