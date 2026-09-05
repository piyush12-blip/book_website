const express = require('express');
const cors    = require('cors');
const path    = require('path');
const axios   = require('axios');
const fs      = require('fs');
const https   = require('https');
const { findEpubUrl, extractChaptersFromUrl, extractChaptersFromFile } = require('./epubParser');
const { searchManhwa18, fetchManhwa18Chapters, getManhwa18ChapterPanels } = require('./manhwa18');
const { searchMangapill, fetchMangapillChapters, getMangapillChapterImages, fetchMangapillPopular } = require('./mangapill');
const { searchMangaBuddy, fetchMangaBuddyChapters } = require('./mangabuddy');
const { searchMangaDNA, fetchMangaDNAChapters, getMangaDNAChapterPanels } = require('./mangadna');
const { searchRoyalRoad, getRoyalRoadChapters } = require('./royalroad');
const { searchAppleBooks } = require('./appleBooks');
const { 
    indexTelegramChannels, 
    searchTelegramIndex, 
    getTelegramIndexChapters 
} = require('./telegramIndex');

const app  = express();
const PORT = 3000;

app.disable('x-powered-by');
app.use(cors());
app.use(express.json());

const publicPath = path.resolve(__dirname, '../public');

// Hard reload detector: When browser does Ctrl+F5, Cache-Control: no-cache is sent
app.get(['/', '/index.html'], (req, res, next) => {
    const isHardReload = (req.headers['cache-control'] && req.headers['cache-control'].includes('no-cache')) ||
                         (req.headers['pragma'] && req.headers['pragma'].includes('no-cache'));
    const indexPath = path.join(publicPath, 'index.html');
    if (!fs.existsSync(indexPath)) return next();
    
    let html = fs.readFileSync(indexPath, 'utf8');
    if (isHardReload) {
        html = html.replace('<head>', '<head><script>window.isHardReload = true;</script>');
    }
    res.send(html);
});

app.use(express.static(publicPath));

// Start background indexer on boot and every 10 minutes
indexTelegramChannels();
setInterval(indexTelegramChannels, 10 * 60 * 1000);

// Ultra-Fast In-Memory + Persistent Disk Cache (<1ms repeat loads)
const MEMORY_CACHE = {
    search: new Map(),
    chapters: new Map()
};

const CHAPTERS_CACHE_DIR = path.join(__dirname, '.cache/chapters');
if (!fs.existsSync(CHAPTERS_CACHE_DIR)) {
    try { fs.mkdirSync(CHAPTERS_CACHE_DIR, { recursive: true }); } catch(e) {}
}

function getCachedChapters(key) {
    if (MEMORY_CACHE.chapters.has(key)) return MEMORY_CACHE.chapters.get(key);
    const safeKey = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 120);
    const safeFile = path.join(CHAPTERS_CACHE_DIR, `${safeKey}.json`);
    if (fs.existsSync(safeFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(safeFile, 'utf8'));
            MEMORY_CACHE.chapters.set(key, data);
            return data;
        } catch(e) {}
    }
    return null;
}

function setCachedChapters(key, data) {
    MEMORY_CACHE.chapters.set(key, data);
    const safeKey = key.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 120);
    const safeFile = path.join(CHAPTERS_CACHE_DIR, `${safeKey}.json`);
    try {
        fs.writeFile(safeFile, JSON.stringify(data), () => {});
    } catch(e) {}
}

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
const { searchPrivateChannels, getReadingChannelChapters } = require('./userbot');

function levenshteinDistance(s1, s2) {
    if (s1 === s2) return 0;
    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;
    const d = [];
    for (let i = 0; i <= s1.length; i++) d[i] = [i];
    for (let j = 0; j <= s1.length; j++) d[0][j] = j;
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + cost
            );
        }
    }
    return d[s1.length][s1.length];
}

function wordSimilarity(w1, w2) {
    if (w1 === w2) return 1.0;
    const maxLen = Math.max(w1.length, w2.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(w1, w2);
    return 1 - (dist / maxLen);
}

function scoreSingleTitle(cleanQ, title, cleanSlug, candidateSynopsis, isDirectMatch) {
    const cleanT = (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanT || !cleanQ) return 0;

    const noSpaceQ = cleanQ.replace(/\s+/g, '');
    const noSpaceT = cleanT.replace(/\s+/g, '');
    const noSpaceSlug = cleanSlug.replace(/\s+/g, '');

    // Rank 1: Exact title match (with or without spaces)
    if (cleanT === cleanQ || (noSpaceQ.length > 2 && noSpaceT === noSpaceQ)) {
        return 30000;
    }

    // Rank 2: Title begins with query word as the first word or strict prefix
    // e.g. "Hidden Fire", "Hidden Scars", "Hidden Room" when searching "hidden"
    const tFirstWord = cleanT.split(/\s+/)[0] || '';
    if (tFirstWord === cleanQ || cleanT.startsWith(cleanQ + ' ')) {
        // High priority! Titles that genuinely start with the searched term take 1st/2nd place
        return 20000 - Math.min(Math.abs(noSpaceT.length - noSpaceQ.length) * 2, 2000);
    }

    // Strict prefix match (title starts with cleanQ)
    if (cleanT.startsWith(cleanQ) || (noSpaceQ.length > 2 && noSpaceT.startsWith(noSpaceQ))) {
        return 18000 - Math.min(Math.abs(noSpaceT.length - noSpaceQ.length) * 2, 2000);
    }

    // Fuzzy Full Title similarity (e.g. 1-2 letter typos across full title)
    const fullSim = Math.max(wordSimilarity(cleanQ, cleanT), wordSimilarity(noSpaceQ, noSpaceT));
    if (fullSim >= 0.85) {
        return Math.round(16000 * fullSim);
    }

    // Rank 3: Exact phrase anywhere inside the title as an isolated word/phrase
    const wordBoundaryRegex = new RegExp(`\\b${cleanQ}\\b`, 'i');
    if (wordBoundaryRegex.test(cleanT)) {
        return 12000 - Math.min(Math.abs(noSpaceT.length - noSpaceQ.length) * 2, 2000);
    }

    // Substring inside title or query
    if (cleanT.includes(cleanQ) || cleanQ.includes(cleanT) || (noSpaceQ.length > 2 && (noSpaceT.includes(noSpaceQ) || noSpaceQ.includes(noSpaceT)))) {
        return 9000 - Math.min(Math.abs(noSpaceT.length - noSpaceQ.length), 1000);
    }

    // Slug match
    if (cleanSlug.includes(cleanQ) || (noSpaceQ.length > 2 && noSpaceSlug.includes(noSpaceQ))) {
        return 7000;
    }

    // Synopsis-only match: lower priority so it never overtakes genuine title matches
    if (candidateSynopsis && candidateSynopsis.toLowerCase().includes(cleanQ)) {
        return 4500;
    }

    // Rank 4: Keyword & Typo matching
    const stopWords = new Set(['in', 'of', 'the', 'a', 'an', 'to', 'and', 'for', 'with', 'on', 'at', 'is', 'by', 'manga', 'manhwa', 'webtoon', 'comic', 'novel', 'read', 'chapter', 'online', 'free', 'raw']);
    const qTokens = cleanQ.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    const tTokensArray = cleanT.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    const tTokens = new Set(tTokensArray);
    const slugTokens = new Set(cleanSlug.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w)));

    if (qTokens.length === 0) {
        return isDirectMatch ? 3000 : 500;
    }

    let qMatchCount = 0;
    for (const token of qTokens) {
        if (tTokens.has(token) || slugTokens.has(token) || cleanT.includes(token) || cleanSlug.includes(token)) {
            qMatchCount += 1.0;
        } else {
            let bestSim = 0;
            for (const tToken of tTokensArray) {
                const sim = wordSimilarity(token, tToken);
                if (sim > bestSim) bestSim = sim;
            }
            if (bestSim >= 0.75) qMatchCount += bestSim * 0.85;
        }
    }

    let tMatchCount = 0;
    if (tTokensArray.length > 0) {
        for (const token of tTokensArray) {
            if (qTokens.includes(token) || cleanQ.includes(token)) tMatchCount += 1.0;
        }
    }

    const qRatio = qMatchCount / qTokens.length;
    const tRatio = tTokensArray.length > 0 ? (tMatchCount / tTokensArray.length) : 0;
    const bestRatio = Math.max(qRatio, tRatio * 0.95);
    return Math.round(6000 * Math.pow(bestRatio, 1.2));
}

function calculateSearchRelevanceScore(query, candidateItem) {
    const item = (candidateItem && typeof candidateItem === 'object') ? candidateItem : {};
    const candidateTitle = typeof candidateItem === 'string' ? candidateItem : (item.title || '');
    const candidateAltTitle = item.altTitle || '';
    const candidateSynopsis = item.synopsis || '';
    const candidateId = item.id || '';
    const isDirectMatch = !!item._isDirectSearchMatch;

    // ─── UNOFFICIAL CONTENT PENALTY SYSTEM ───────────────────────────────────
    const tLower = (candidateTitle || '').toLowerCase();
    const idLower = (candidateId || '').toLowerCase();

    const isDJ          = /\bdj\b/.test(tLower) || idLower.includes('-dj-') || idLower.includes('-dj.');
    const isDoujinshi   = tLower.includes('doujinshi') || idLower.includes('doujinshi');
    const isFanTitle    = tLower.includes('i wish') || tLower.includes('kiss kiss') || tLower.includes('zenryoku') || tLower.includes('shishunki') || tLower.includes('schrodinger') || tLower.includes('my name is') || tLower.includes('harajuku, afterwards') || tLower.includes('oshiete');
    const isRoyalRoadFanfic = idLower.startsWith('royalroad-') && (tLower.includes('fanfic') || tLower.includes('fan fic'));

    // Build penalty: 0.0 = hidden, 1.0 = no change
    let penalty = 1.0;
    if (isDJ)              penalty = Math.min(penalty, 0.08);
    if (isDoujinshi)       penalty = Math.min(penalty, 0.06);
    if (isFanTitle)        penalty = Math.min(penalty, 0.08);
    if (isRoyalRoadFanfic) penalty = Math.min(penalty, 0.05);

    // ─── QUERY IS A MULTI-WORD PHRASE ─────────────────────────────────────────
    const cleanQ = (query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanQ) return 0;

    const qWords = cleanQ.split(/\s+/).filter(w => w.length > 1);
    const cleanSlug = candidateId.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Check all title variants (primary title + comma-separated alternative/English/Romaji titles)
    const titleCandidates = [candidateTitle];
    if (candidateAltTitle) {
        const alts = candidateAltTitle.split(/[,;/]+/).map(s => s.trim()).filter(Boolean);
        titleCandidates.push(...alts);
    }

    let maxScore = 0;
    for (const titleVariant of titleCandidates) {
        let varScore = scoreSingleTitle(cleanQ, titleVariant, cleanSlug, candidateSynopsis, isDirectMatch);

        // Apply multi-word validation to this specific title variant
        if (qWords.length >= 2) {
            const vLower = titleVariant.toLowerCase();
            const tTokensSet = new Set(vLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
            const matchedQWords = qWords.filter(w => {
                if (tTokensSet.has(w)) return true;
                for (const tw of tTokensSet) {
                    if (tw === w + 's' || tw === w + 'es') return true;
                    if (wordSimilarity(w, tw) >= 0.75) return true;
                }
                return false;
            });

            const matchRatio = matchedQWords.length / qWords.length;
            if (matchRatio < 1.0) {
                const noSpaceQ = qWords.join('');
                const noSpaceT = vLower.replace(/[^a-z0-9]/g, '');
                const isPrefix = noSpaceT.startsWith(noSpaceQ) || noSpaceQ.startsWith(noSpaceT);
                if (!isPrefix) {
                    varScore = Math.round(varScore * (0.05 + 0.15 * matchRatio));
                }
            }
        }

        if (varScore > maxScore) {
            maxScore = varScore;
        }
    }

    return Math.round(maxScore * penalty);
}


// ─────────────────────────────────────────────────────────────────────────────
// TRENDING / POPULAR MANGA API — Live Mangapill & Scans Showcase
// ─────────────────────────────────────────────────────────────────────────────
let TRENDING_CACHE = { data: null, timestamp: 0 };

app.get('/api/trending', async (req, res) => {
    const now = Date.now();
    if (TRENDING_CACHE.data && (now - TRENDING_CACHE.timestamp < 10 * 60 * 1000)) {
        return res.json(TRENDING_CACHE.data);
    }

    try {
        const popularList = await fetchMangapillPopular();
        if (popularList && popularList.length > 0) {
            TRENDING_CACHE = { data: popularList, timestamp: now };
            return res.json(popularList);
        }
    } catch (e) {
        console.warn('[TRENDING] Failed to fetch live Mangapill popular:', e.message);
    }

    // Fallback curated list
    const fallbackList = [
        { id: 'mangapill-1-berserk', title: 'Berserk', author: 'Kentaro Miura', cover: 'https://cdn.readdetectiveconan.com/file/mangapill/i/1.jpg', banner: 'https://cdn.readdetectiveconan.com/file/mangapill/i/1.jpg', tags: ['Dark Fantasy', 'Action', 'Tragedy'], synopsis: 'Guts, known as the Black Swordsman, seeks sanctuary from the demonic forces that pursue him.' },
        { id: 'mangapill-2-one-piece', title: 'One Piece', author: 'Eiichiro Oda', cover: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp', banner: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp', tags: ['Action', 'Adventure', 'Fantasy'], synopsis: 'Gol D. Roger was known as the Pirate King, the strongest and most infamous being to have sailed the Grand Line.' },
        { id: 'mangapill-5460-dandadan', title: 'Dandadan', author: 'Yukinobu Tatsu', cover: 'https://cdn.readdetectiveconan.com/file/mangapill/i/5460.webp', banner: 'https://cdn.readdetectiveconan.com/file/mangapill/i/5460.webp', tags: ['Action', 'Comedy', 'Supernatural'], synopsis: 'Momo Ayase strikes up an unusual friendship with her school occult fanatic.' },
        { id: 'mangapill-7529-kagurabachi', title: 'Kagurabachi', author: 'Takeru Hokazono', cover: 'https://cdn.readdetectiveconan.com/file/mangapill/i/7529.jpeg', banner: 'https://cdn.readdetectiveconan.com/file/mangapill/i/7529.jpeg', tags: ['Action', 'Drama', 'Martial Arts'], synopsis: 'Chihiro, the son of a renowned swordsmith, embarks on a quest for vengeance.' }
    ];
    res.json(fallbackList);
});

// ── In-Memory Search Cache for Ultra-Fast Typing Responses (10-minute TTL) ──
const GLOBAL_SEARCH_CACHE = new Map();

function withTimeout(promise, ms, fallback = []) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(fallback), ms))
    ]);
}

app.get('/api/books/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        let cleanQuery = query
            .replace(/alternative\s*names?[:\s][\s\S]*/i, '')
            .replace(/\[([^\]]+)\]\([^\)]+\)/gi, '$1')
            .replace(/https?:\/\/[^\s]+/gi, '')
            .replace(/webnovel\.com[^\s]*/gi, '')
            .replace(/₹[\d\.]+/gi, '')
            .replace(/([a-zA-Z])([1-5]\.\d)\b/g, '$1')
            .replace(/\b[1-5]\.\d\b/g, '')
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2014\u2013]/g, ' ')
            .replace(/[【】\[\]\(\)~]/g, ' ')
            .replace(/[\\\/\|;:_+*#@!]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const qLower = cleanQuery.toLowerCase();

        // 1. Instant Cache Check (<1ms response while typing)
        const now = Date.now();
        if (GLOBAL_SEARCH_CACHE.has(qLower)) {
            const cached = GLOBAL_SEARCH_CACHE.get(qLower);
            if (now - cached.timestamp < 10 * 60 * 1000) {
                return res.json(cached.results);
            }
        }

        const { fetchRealCoverImage } = require('./coverFetcher');

        // Extract primary title segment if query is long
        const words = cleanQuery.split(/\s+/);
        const altQuery = words.length > 5 ? words.slice(0, 5).join(' ') : null;

        // ─────────────────────────────────────────────────────────────────────
        // ADVANCED MULTI-RESULT SMART AGGREGATOR & HIERARCHICAL RANKER
        // 1. Searches Instant Catalog Index (<1ms) + Web Scrapers (Mangapill, Diva, Temple, MangaBuddy)
        // 2. Automatically tests spaced variations for concatenated words
        // ─────────────────────────────────────────────────────────────────────
        const { searchCatalogIndex } = require('./mangaCatalogIndex');
        const { searchMangaDex } = require('./mangadex');
        const { searchTelegramIndex } = require('./telegramIndex');
        const instantIndexMatches = searchCatalogIndex(cleanQuery);

        // Generate cleaned queries
        const strippedPunctuation = cleanQuery.replace(/[.,'"`~!@#$%^&*()_+=/\\|<>?:;[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
        const queryVariants = [cleanQuery];
        if (strippedPunctuation && strippedPunctuation !== cleanQuery && !queryVariants.includes(strippedPunctuation)) {
            queryVariants.push(strippedPunctuation);
        }

        // Add hyphenated variant
        const hyphenated = cleanQuery.replace(/\s+/g, '-');
        if (hyphenated !== cleanQuery && !queryVariants.includes(hyphenated)) {
            queryVariants.push(hyphenated);
        }

        const qWords = strippedPunctuation.split(/\s+/).filter(w => w.length > 1);
        if (qWords.length >= 3) {
            const first3 = qWords.slice(0, 3).join(' ');
            if (!queryVariants.includes(first3)) queryVariants.push(first3);
            const first2 = qWords.slice(0, 2).join(' ');
            if (!queryVariants.includes(first2)) queryVariants.push(first2);
        }

        if (!cleanQuery.includes(' ')) {
            const splitCandidate = cleanQuery.replace(/(blue|solo|chain|fairy|tokyo|jujutsu|hunter|demon|spy|one|death|myhero|black|fire|world)(.+)/i, '$1 $2').trim();
            if (splitCandidate !== cleanQuery && !queryVariants.includes(splitCandidate)) {
                queryVariants.push(splitCandidate);
            }
        }

        // Multi-Source Scraper Dispatching (Resilient timeouts ensure full manhwa/manga retrieval)
        const primaryVariants = queryVariants.slice(0, 2);

        const mangapillPromises = primaryVariants.map(q => withTimeout(searchMangapill(q).catch(() => []), 3000));
        const mangadexPromises = [withTimeout(searchMangaDex(cleanQuery).catch(() => []), 3500)];
        const manhwa18Promises = [withTimeout(searchManhwa18(cleanQuery).catch(() => []), 3500)];
        const mangaBuddyPromises = [withTimeout(searchMangaBuddy(cleanQuery).catch(() => []), 4500)];
        const mangaDNAPromises = [withTimeout(searchMangaDNA(cleanQuery).catch(() => []), 3000)];
        const telegramPromises = [withTimeout(searchTelegramIndex(cleanQuery).catch(() => []), 2000)];
        const royalRoadPromises = [withTimeout(searchRoyalRoad(cleanQuery).catch(() => []), 2500)];
        const appleBooksPromises = [withTimeout(searchAppleBooks(cleanQuery).catch(() => []), 2500)];

        const [
            mangapillVariantResults, 
            mangadexResults,
            m18VariantResults,
            mbVariantResults,
            mdnaVariantResults,
            tgVariantResults,
            rrVariantResults,
            appleVariantResults
        ] = await Promise.all([
            Promise.all(mangapillPromises),
            Promise.all(mangadexPromises),
            Promise.all(manhwa18Promises),
            Promise.all(mangaBuddyPromises),
            Promise.all(mangaDNAPromises),
            Promise.all(telegramPromises),
            Promise.all(royalRoadPromises),
            Promise.all(appleBooksPromises)
        ]);

        const mangapillRaw = [...instantIndexMatches, ...mangapillVariantResults.flat()];
        const mangadexRaw = mangadexResults.flat();
        const manhwa18Raw = m18VariantResults.flat();
        const mangaBuddyRaw = mbVariantResults.flat();
        const mangaDNARaw = mdnaVariantResults.flat();
        const telegramRaw = tgVariantResults.flat();
        const royalRoadRaw = rrVariantResults.flat();
        const appleBooksRaw = appleVariantResults.flat();

        const candidateList = [];
        // GLOBAL DEDUPLICATION: Normalize title across all scrapers to prevent duplicate 2x cards
        const seenGlobalTitles = new Map();

        function normalizeKey(str) {
            if (!str) return '';
            return str
                .toLowerCase()
                .replace(/\b(i'm|im)\b/g, 'iam')
                .replace(/\b(you're)\b/g, 'youare')
                .replace(/\b(it's)\b/g, 'itis')
                .replace(/\b(don't)\b/g, 'donot')
                .replace(/\b(can't)\b/g, 'cannot')
                .replace(/\b(who's)\b/g, 'whois')
                .replace(/\b(there's)\b/g, 'thereis')
                .replace(/\b(they're)\b/g, 'theyare')
                .replace(/\b(we're)\b/g, 'weare')
                .replace(/\b(that's)\b/g, 'thatis')
                .replace(/\b(what's)\b/g, 'whatis')
                .replace(/\b(let's)\b/g, 'letus')
                .replace(/\s*[,.:;-]?\s*(?:a\s+novel\s*)?[,.:;-]?\s*vol(?:ume)?\.?\s*[0-9ivxlcdm]+/gi, '')
                .replace(/\s*\(?(?:book|vol(?:ume)?|part)\s*[0-9ivxlcdm]+\)?/gi, '')
                .replace(/\s*(?:manga|manhwa|webtoon|comic|novel|scanlation|scans|official|raw)\s*$/i, '')
                .replace(/\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i, '')
                .replace(/[^a-z0-9]/g, '');
        }

        function addCandidate(item, priorityWeight = 0) {
            if (!item || !item.title) return;
            
            // Gather all normalized keys for this series (title + altTitles)
            const allKeys = [];
            const primaryKey = normalizeKey(item.title);
            const rawKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (primaryKey) allKeys.push(primaryKey);
            if (rawKey && !allKeys.includes(rawKey)) allKeys.push(rawKey);

            if (item.altTitle) {
                const alts = item.altTitle.split(/[,;/]+/).filter(Boolean);
                for (const alt of alts) {
                    const normAlt = normalizeKey(alt);
                    const rawAlt = alt.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normAlt && !allKeys.includes(normAlt)) allKeys.push(normAlt);
                    if (rawAlt && !allKeys.includes(rawAlt)) allKeys.push(rawAlt);
                }
            }

            if (allKeys.length === 0) return;

            item._isDirectSearchMatch = true;
            item._priorityWeight = priorityWeight;

            // Check if any key exists in global index or shares the same cover image
            let existing = null;
            for (const key of allKeys) {
                if (seenGlobalTitles.has(key)) {
                    existing = seenGlobalTitles.get(key);
                    break;
                }
            }

            if (!existing && item.image && !item.image.includes('has-image')) {
                existing = candidateList.find(c => c.image && c.image === item.image);
            }

            if (existing) {
                // If new item has higher priority source (e.g. Mangapill 100 > MangaBuddy 90)
                if (priorityWeight > (existing._priorityWeight || 0)) {
                    // Retain existing image if new item is missing one
                    if ((!item.image || item.image.includes('has-image')) && existing.image && !existing.image.includes('has-image')) {
                        item.image = existing.image;
                        item.cover = existing.cover;
                    }
                    // Retain existing rich synopsis if new item has none
                    if ((!item.synopsis || item.synopsis.length < 10) && existing.synopsis && existing.synopsis.length > 10) {
                        item.synopsis = existing.synopsis;
                    }
                    // Ensure altTitle has both names
                    if (!item.altTitle && existing.title && existing.title !== item.title) {
                        item.altTitle = existing.title;
                    }
                    // Replace existing in list
                    const idx = candidateList.findIndex(c => c === existing);
                    if (idx !== -1) candidateList[idx] = item;
                    // Point all keys to new winner
                    for (const key of allKeys) seenGlobalTitles.set(key, item);
                } else {
                    // Existing item remains, upgrade its image / altTitle / synopsis if missing
                    if ((!existing.image || existing.image.includes('has-image')) && item.image && !item.image.includes('has-image')) {
                        existing.image = item.image;
                        existing.cover = item.cover;
                    }
                    if ((!existing.synopsis || existing.synopsis.length < 10) && item.synopsis && item.synopsis.length > 10) {
                        existing.synopsis = item.synopsis;
                    }
                    if (!existing.altTitle && item.title && item.title !== existing.title) {
                        existing.altTitle = item.title;
                    }
                    // Map new keys to existing
                    for (const key of allKeys) seenGlobalTitles.set(key, existing);
                }
                return;
            }

            // New entry
            for (const key of allKeys) seenGlobalTitles.set(key, item);
            candidateList.push(item);
        }

        // 0. Process Instant Catalog Index Series (Highest Priority Master Catalog)
        for (const item of (instantIndexMatches || [])) {
            item.source = item.source || item._source || 'Master Catalog';
            addCandidate(item, 110);
        }

        // 1. Process Mangapill Series (High-Speed Direct Scans)
        for (const item of (mangapillRaw || [])) {
            item.source = item.source || item._source || 'Mangapill';
            addCandidate(item, 100);
        }

        // 1.5 Process MangaDex Series (Worldwide Premier Scans Database)
        for (const item of (mangadexRaw || [])) {
            item.source = item.source || item._source || 'MangaDex';
            addCandidate(item, 98);
        }

        // 2. Process Manhwa18 Series (Priority for Full +18 Color Manhwa Archives)
        for (const item of (manhwa18Raw || [])) {
            item.source = item.source || item._source || 'Manhwa18';
            addCandidate(item, 96);
        }

        // 3. Process MangaDNA Series (Fast Direct Scans & Clean Metadata)
        for (const item of (mangaDNARaw || [])) {
            item.source = item.source || item._source || 'MangaDNA';
            addCandidate(item, 94);
        }

        // 4. Process MangaBuddy Series (Complete Manhwa & Manga Vault)
        for (const item of (mangaBuddyRaw || [])) {
            item.source = item.source || item._source || 'MangaBuddy';
            addCandidate(item, 92);
        }

        // 4.5 Process Telegram Index Series (Exclusive Community Vault)
        for (const item of (telegramRaw || [])) {
            item.source = item.source || item._source || 'Telegram';
            addCandidate(item, 88);
        }

        // 5. Process RoyalRoad Web Novels (1st Priority for Web Novels)
        for (const item of (royalRoadRaw || [])) {
            item.format = item.format || 'Web Novel';
            item.genre = item.genre || 'Web Novel';
            item.source = item.source || item._source || 'Royal Road';
            addCandidate(item, 80);
        }

        // 6. Process Apple Books (Real Published Books, Bestsellers, Nonfiction, Fiction)
        for (const item of (appleBooksRaw || [])) {
            item.source = item.source || item._source || 'Apple Books';
            addCandidate(item, 65);
        }

        // Score and rank all candidate results hierarchically
        if (candidateList.length > 0) {
            // Smart Volume Collapsing: e.g. "My Dress-Up Darling 13" -> "My Dress-Up Darling"
            const rootTitles = new Set();
            for (const item of candidateList) {
                const rootT = (item.title || '')
                    .replace(/\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i, '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '');
                if (rootT) rootTitles.add(rootT);
            }

            const scored = candidateList
                .filter(item => {
                    const t = (item.title || '');
                    const hasVolSuffix = /\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i.test(t);
                    if (hasVolSuffix) {
                        const rootT = t.replace(/\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i, '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        // If root master title also exists without the volume number, drop the fragmented volume card
                        const hasMaster = candidateList.some(other => {
                            if (other === item) return false;
                            const otherNorm = (other.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            return otherNorm === rootT;
                        });
                        if (hasMaster) return false;
                    }
                    return true;
                })
                .map(item => {
                    let baseScore = calculateSearchRelevanceScore(cleanQuery, item);
                    let score = baseScore + (item._priorityWeight || 0);

                    // Boost Manga/Manhwa sources so they always take precedent over Apple Books
                    const isMangaSource = item.id.startsWith('mangapill-') || item.id.startsWith('mangadex-') || item.id.startsWith('mangabuddy-') || item.id.startsWith('manhwa18-') || item.id.startsWith('mangadna-') || item.id.startsWith('telegram-');
                    if (isMangaSource) {
                        score += 1500;
                    } else if (item.id.startsWith('itunes-')) {
                        score -= 800;
                    }

                    // Exact match bonus (both spaced and unspaced)
                    const normT = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const normQ = cleanQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (normT === normQ) {
                        score += 5000;
                    }

                    return { item, score, baseScore };
                })
                .filter(r => r.score > 2500)   // Only genuinely relevant titles
                .sort((a, b) => b.score - a.score)
                .map(r => r.item);

            if (scored.length > 0) {
                // If we have manga/manhwa results, cap Apple Books to at most 3 items so they don't drown out manga
                const hasManga = scored.some(item => !item.id.startsWith('itunes-'));
                let appleCount = 0;
                const filteredResults = scored.filter(item => {
                    if (item.id.startsWith('itunes-')) {
                        if (hasManga && appleCount >= 3) return false;
                        appleCount++;
                    }
                    return true;
                });

                const finalResults = filteredResults.slice(0, 25);
                GLOBAL_SEARCH_CACHE.set(qLower, { results: finalResults, timestamp: Date.now() });
                return res.json(finalResults);
            }
        }

        // Fallback for Web Novels on Royal Road if no manga matched
        try {
            const webnovelResults = await searchRoyalRoad(cleanQuery).catch(() => []);
            if (webnovelResults && webnovelResults.length > 0) {
                const scoredNovels = webnovelResults
                    .map(item => ({ item, score: calculateSearchRelevanceScore(cleanQuery, item) }))
                    .filter(r => r.score > 2000)
                    .sort((a, b) => b.score - a.score)
                    .map(r => r.item);
                if (scoredNovels.length > 0) {
                    const finalResults = scoredNovels.slice(0, 15);
                    GLOBAL_SEARCH_CACHE.set(qLower, { results: finalResults, timestamp: Date.now() });
                    return res.json(finalResults);
                }
            }
        } catch (e) {}

        GLOBAL_SEARCH_CACHE.set(qLower, { results: [], timestamp: Date.now() });
        return res.json([]);
    } catch (err) {
        console.error('[SEARCH] Error:', err.message);
        res.status(500).json([]);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 1.5 REAL RATING ENDPOINT — Live MangaDex, MAL & Source Ratings
// ─────────────────────────────────────────────────────────────────────────────
const REAL_RATING_CACHE = new Map();

app.get('/api/books/rating', async (req, res) => {
    const rawTitle = (req.query.title || '').trim();
    const id = (req.query.id || '').trim();
    if (!rawTitle && !id) return res.json({ rating: null });

    const cacheKey = (id || rawTitle).toLowerCase();
    if (REAL_RATING_CACHE.has(cacheKey)) {
        return res.json({ rating: REAL_RATING_CACHE.get(cacheKey) });
    }

    try {
        const cleanTitle = rawTitle
            .replace(/\s+(?:vol(?:ume)?\.?\s*\d+|\d+)$/i, '')
            .replace(/\s*\(.*?\)/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // 1. Query MangaDex API for genuine community score
        const mdUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(cleanTitle)}&limit=1`;
        const mdRes = await fetch(mdUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(2800)
        }).catch(() => null);

        if (mdRes && mdRes.ok) {
            const mdData = await mdRes.json().catch(() => null);
            if (mdData?.data?.[0]?.id) {
                const mdId = mdData.data[0].id;
                const statRes = await fetch(`https://api.mangadex.org/statistics/manga/${mdId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(2400)
                }).catch(() => null);

                if (statRes && statRes.ok) {
                    const statData = await statRes.json().catch(() => null);
                    const score = statData?.statistics?.[mdId]?.rating?.bayesian || statData?.statistics?.[mdId]?.rating?.average;
                    if (score && !isNaN(score)) {
                        const formatted = Number(score).toFixed(2);
                        REAL_RATING_CACHE.set(cacheKey, formatted);
                        return res.json({ rating: formatted, source: 'MangaDex' });
                    }
                }
            }
        }

        // 2. Fallback to Jikan (MyAnimeList) public API
        const jikanUrl = `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(cleanTitle)}&limit=1`;
        const jikanRes = await fetch(jikanUrl, { signal: AbortSignal.timeout(2800) }).catch(() => null);
        if (jikanRes && jikanRes.ok) {
            const jikanData = await jikanRes.json().catch(() => null);
            const score = jikanData?.data?.[0]?.score;
            if (score && !isNaN(score)) {
                const formatted = Number(score).toFixed(2);
                REAL_RATING_CACHE.set(cacheKey, formatted);
                return res.json({ rating: formatted, source: 'MyAnimeList' });
            }
        }
    } catch(e) {}

    return res.json({ rating: null });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHAPTER LIST ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── Private Channel Chapter Images (legacy compat stub — superseded by getReadingChannelChapters)
app.get('/api/private-chapters', async (req, res) => {
    res.json({ panels: [] });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.5 LOCAL DOWNLOAD POLLING & AUTO-DETECTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
const LOCAL_DOWNLOADS_DIR = path.join(__dirname, '../public/downloads');
if (!fs.existsSync(LOCAL_DOWNLOADS_DIR)) {
    try { fs.mkdirSync(LOCAL_DOWNLOADS_DIR, { recursive: true }); } catch(e) {}
}

function findMatchingLocalBook(query, bookId = '') {
    if (!query && !bookId) return null;
    const clean = (query || bookId)
        .replace(/^itunes-\d+-?/, '')
        .replace(/itunes-/g, '')
        .replace(/book-/g, '')
        .replace(/\s+by\s+.*/i, '')
        .replace(/\bFull Chapter Set\b/gi, '')
        .replace(/\bEnglish\b/gi, '')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .toLowerCase()
        .trim();

    const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'book', 'novel', 'read', 'online', 'free', 'vol', 'volume', 'ch', 'chapter', 'edition', 'complete']);
    const rawTokens = clean.split(/\s+/).filter(t => t.length >= 2 && !STOP_WORDS.has(t));
    if (rawTokens.length === 0) return null;

    const home = require('os').homedir();
    const targetDirs = [
        LOCAL_DOWNLOADS_DIR,
        path.join(home, 'Downloads'),
        path.join(home, 'Documents'),
        path.join(home, 'Desktop'),
        path.join(__dirname, '../public/epubs')
    ];

    let bestMatch = null;
    let maxScore = 0;
    const now = Date.now();

    for (const dir of targetDirs) {
        if (!fs.existsSync(dir)) continue;
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fLower = file.toLowerCase();
                if (!fLower.endsWith('.epub') && !fLower.endsWith('.pdf')) continue;
                if (fLower.includes('.crdownload') || fLower.includes('.tmp') || fLower.includes('.part')) continue;

                const filePath = path.join(dir, file);
                let score = 0;

                // Strip common download source prefixes: _oceanofpdf.com_, [annas_archive], etc.
                const cleanName = fLower.replace(/^(_oceanofpdf\.com_|oceanofpdf|_annas_archive_|\[.*?\])/g, '');

                for (const token of rawTokens) {
                    if (cleanName.includes(token)) {
                        score += token.length >= 4 ? 3 : 2;
                    }
                }

                // If downloaded recently (within last 45 minutes), give a substantial recency boost
                try {
                    const stats = fs.statSync(filePath);
                    const ageMinutes = (now - stats.mtimeMs) / (1000 * 60);
                    if (ageMinutes < 45) {
                        score += 3;
                    }
                } catch(e) {}

                const minScore = rawTokens.length === 1 ? 2 : 3;
                if (score >= minScore && score > maxScore) {
                    maxScore = score;
                    bestMatch = filePath;
                }
            }
        } catch (err) {}
    }

    return bestMatch;
}

app.get('/api/check-local', async (req, res) => {
    const query = req.query.q || '';
    const id = req.query.id || '';
    if (!query && !id) return res.json({ found: false });

    try {
        const localFile = findMatchingLocalBook(query, id);
        if (localFile) {
            console.log(`[POLL] Auto-detected local download for "${query}": ${localFile}`);
            const { extractChaptersFromFile } = require('./epubParser');
            const chapters = await extractChaptersFromFile(localFile);
            if (chapters && chapters.length > 0) {
                return res.json({
                    found: true,
                    filePath: localFile,
                    fileName: path.basename(localFile),
                    chapters,
                    source: 'LocalDownload'
                });
            }
        }
    } catch (e) {
        console.error('[POLL] Error:', e.message);
    }

    res.json({ found: false });
});

// ── 2.6 BOOK UPLOAD / DROP ENDPOINT ──
// Allows dragging & dropping or choosing .epub/.pdf files directly in browser
app.post('/api/upload-book', express.raw({ type: ['application/epub+zip', 'application/pdf', 'application/octet-stream', '*/*'], limit: '120mb' }), async (req, res) => {
    try {
        const originalName = req.query.name || `book_${Date.now()}.epub`;
        const safeName = originalName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const destPath = path.join(LOCAL_DOWNLOADS_DIR, `${Date.now()}_${safeName}`);

        fs.writeFileSync(destPath, req.body);
        console.log(`[UPLOAD] Saved uploaded book to: ${destPath}`);

        const { extractChaptersFromFile } = require('./epubParser');
        const chapters = await extractChaptersFromFile(destPath);

        if (chapters && chapters.length > 0) {
            return res.json({ success: true, fileName: safeName, chapters });
        }
        res.status(400).json({ success: false, error: 'Could not parse text chapters from this file.' });
    } catch (err) {
        console.error('[UPLOAD] Error processing file:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/books/:id/chapters', async (req, res) => {
    const id    = req.params.id;
    let rawQuery = (req.query.q || id)
        .replace(/^itunes-\d+-?/, '')
        .replace(/itunes-/g, '')
        .replace(/telegram manga cruise vault.*$/i, '')
        .replace(/animmaster vault.*$/i, '')
        .replace(/@\w+/g, '')
        .replace(/via telegram/gi, '')
        .replace(/\btelegram\b/gi, '')
        .replace(/\s+by\s+.*/i, '')
        .replace(/\bManga Artist\b/gi, '')
        .replace(/\bEnglish[\s·]*Full Chapter Set\b/gi, '')
        .replace(/\bFull Chapter Set\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    let cleanQuery = (rawQuery || 'Book')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/\s*\[[^\]]*\]\s*/g, ' ')
        .replace(/\s*\|+.*$/g, '')
        .replace(/\s+/g, ' ')
        .trim() || rawQuery || 'Book';
    const cacheKey = `${id}:${cleanQuery}`;
    const cachedChapters = getCachedChapters(cacheKey);

    const isManga = id.startsWith('mangadex-') || id.startsWith('mangapill-') || id.startsWith('mangabuddy-') || id.startsWith('mangadna-') || id.startsWith('manhwa18-') ||
                    /manga|manhwa|manhua|webtoon|comic|spearman|resurrection|mount hua|solo leveling|jujutsu|demon slayer|chainsaw|blue lock|one piece|naruto|bleach|hero|leveling|assassin|swordmaster|borderland|dungeon|delicious|hidden fire|secret class|boarding diary|silent war|the boxer|lookism|nano machine|wind breaker|eleceed|tower of god|god of high school|omniscient/i.test(cleanQuery);

    // ── 0. FIRST CHECK: Auto-Detect Local Downloaded EPUB or PDF (Top Priority for Novels & Books) ──
    if (!isManga) {
        const localBookFile = findMatchingLocalBook(cleanQuery, id);
        if (localBookFile) {
            console.log(`[CHAPTERS] Instant local EPUB/PDF match for "${cleanQuery}": ${localBookFile}`);
            const { extractChaptersFromFile } = require('./epubParser');
            const localChapters = await extractChaptersFromFile(localBookFile);
            if (localChapters && localChapters.length > 0) {
                const payload = {
                    chapters: localChapters,
                    metadata: {
                        title: cleanQuery,
                        author: 'Downloaded Book',
                        status: 'Completed',
                        type: 'Book',
                        format: 'Book'
                    },
                    type: 'book',
                    format: 'Book',
                    source: 'LocalDownload',
                    isLocal: true,
                    fileName: path.basename(localBookFile)
                };
                setCachedChapters(cacheKey, payload);
                return res.json(payload);
            }
        }
    }

    const hasValidCached = cachedChapters && Array.isArray(cachedChapters.chapters) && cachedChapters.chapters.length > 0 &&
        (cachedChapters.type === 'manga' || isManga || cachedChapters.chapters.some(c => (c.html && c.html.length > 50) || c.url || c.images || c.pages || c.chUrl || c.chapterId));
    if (hasValidCached) {
        return res.json(cachedChapters);
    }

    const getUniversalChapters = require('./universalNovelEngine');
    try {
        // --- ROYAL ROAD WEB NOVEL HANDLER ---
        if (id.startsWith('royalroad-')) {
            const fictionId = id.replace(/^royalroad-/, '');
            const { getRoyalRoadChapters } = require('./royalroad');
            const rrChapters = await getRoyalRoadChapters(fictionId).catch(() => []);
            if (rrChapters && rrChapters.length > 0) {
                console.log(`[CHAPTERS] RoyalRoad Engine served ${rrChapters.length} genuine web novel chapters for fiction "${fictionId}"`);
                const payload = { chapters: rrChapters, metadata: rrChapters.metadata || {}, type: 'webnovel', format: 'Web Novel', source: 'RoyalRoadEngine' };
                setCachedChapters(cacheKey, payload);
                return res.json(payload);
            }
        }

        // --- PUBLISHED BOOK HANDLER (Apple Books & Digital Vault) ---
        if (id.startsWith('itunes-') || id.startsWith('book-')) {
            // Check public domain Gutenberg or Standard Ebooks before falling back
            const { findEpubUrl, extractChaptersFromUrl } = require('./epubParser');
            const onlineEpubUrl = await findEpubUrl(cleanQuery).catch(() => null);
            if (onlineEpubUrl) {
                const onlineChapters = await extractChaptersFromUrl(onlineEpubUrl).catch(() => []);
                if (onlineChapters && onlineChapters.length > 0) {
                    const payload = {
                        chapters: onlineChapters,
                        metadata: { title: cleanQuery, author: 'Author', status: 'Completed', type: 'Book', format: 'Book' },
                        type: 'book',
                        format: 'Book',
                        source: 'OnlineEpub'
                    };
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            }

            const payload = {
                chapters: [],
                isAwaitingDownload: true,
                metadata: {
                    title: cleanQuery,
                    author: 'Author',
                    status: 'Completed',
                    type: 'Book',
                    format: 'Book'
                },
                type: 'book',
                format: 'Book',
                source: 'AwaitingDownload'
            };
            return res.json(payload);
        }

        // ── 0.1 GOD-LEVEL ASSASSIN DEDICATED OFFLINE & STREAMING ENGINE ──
        const isGodLevelAssassin = id.includes('god-level-assassin') || id.includes('god_level_assassin') ||
                                  (cleanQuery.toLowerCase().includes('god') && cleanQuery.toLowerCase().includes('assassin')) ||
                                  (cleanQuery.toLowerCase().includes('shadow') && (cleanQuery.toLowerCase().includes('assassin') || cleanQuery.toLowerCase().includes('god')));
        if (isGodLevelAssassin) {
            const { getGodLevelAssassinChapters } = require('./godLevelAssassinManhwa');
            const chapters = getGodLevelAssassinChapters(133);
            console.log(`[CHAPTERS] Served ${chapters.length} chapters (offline downloaded + full list) for God-level Assassin`);
            const payload = { chapters, type: 'manga', format: 'Manga & Manhwa', source: 'RealImageEngine' };
            setCachedChapters(cacheKey, payload);
            return res.json(payload);
        }

        if (isManga || id.startsWith('mangadex-') || id.startsWith('mangapill-') || id.startsWith('mangabuddy-') || id.startsWith('mangadna-') || id.startsWith('manhwa18-')) {
            // --- 0.2 MANGADEX DIRECT ID HANDLER ---
            if (id.startsWith('mangadex-')) {
                const { fetchRealMangaChaptersById } = require('./mangadex');
                const mdChapters = await fetchRealMangaChaptersById(id.replace(/^mangadex-/, '')).catch(() => null);
                if (mdChapters && mdChapters.length > 0) {
                    console.log(`[CHAPTERS] MangaDex Engine served ${mdChapters.length} genuine chapters for "${id}"`);
                    const payload = { chapters: mdChapters, metadata: mdChapters.metadata || {}, type: 'manga', format: 'Manga & Manhwa', source: 'MangaDex' };
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            }

            // --- 0.25 MANGADNA HANDLER ---
            if (id.startsWith('mangadna-')) {
                const dnaChapters = await fetchMangaDNAChapters(id);
                if (dnaChapters && dnaChapters.length > 0) {
                    const payload = { chapters: dnaChapters, metadata: dnaChapters.metadata || {}, type: 'manga', format: 'Manga & Manhwa', source: 'MangaDNA' };
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            }

            // --- 0.3 MANGABUDDY HANDLER ---
            if (id.startsWith('mangabuddy-')) {
                const { fetchMangaBuddyChapters } = require('./mangabuddy');
                const mbChapters = await fetchMangaBuddyChapters(id);
                if (mbChapters && mbChapters.length > 0) {
                    console.log(`[CHAPTERS] MangaBuddy Engine served ${mbChapters.length} genuine chapters for "${id}"`);
                    const payload = { chapters: mbChapters, metadata: mbChapters.metadata || {}, type: 'manga', format: 'Manga & Manhwa', source: 'MangaBuddy' };
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            }

            // --- 0.4 MANGAPILL HANDLER ---
            if (id.startsWith('mangapill-')) {
                const { fetchMangapillChapters } = require('./mangapill');
                const mangapillChapters = await fetchMangapillChapters(id);
                if (mangapillChapters && mangapillChapters.length > 0) {
                    console.log(`[CHAPTERS] Mangapill Engine served ${mangapillChapters.length} genuine chapters for "${id}"`);
                    const payload = { chapters: mangapillChapters, metadata: mangapillChapters.metadata || {}, type: 'manga', format: 'Manga & Manhwa', source: 'Mangapill' };
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            }

            // --- 0.5 MANHWA18 HANDLER ---
            if (id.startsWith('manhwa18-')) {
                const { fetchManhwa18Chapters } = require('./manhwa18');
                const m18Chapters = await fetchManhwa18Chapters(id);
                if (m18Chapters && m18Chapters.length > 0) {
                    console.log(`[CHAPTERS] Manhwa18 Engine served ${m18Chapters.length} genuine chapters for "${id}"`);
                    const payload = { chapters: m18Chapters, metadata: m18Chapters.metadata || {}, type: 'manga', format: 'Manga & Manhwa', source: 'Manhwa18' };
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            }

            // 1. Check RAM Telegram index for instant chapter list (Top Priority, 0ms)
            const { getTelegramIndexChapters } = require('./telegramIndex');
            const indexedChapters = await getTelegramIndexChapters(cleanQuery).catch(() => null);
            if (indexedChapters && indexedChapters.length > 0) {
                console.log(`[CHAPTERS] Served ${indexedChapters.length} exact chapters from Telegram RAM index for "${cleanQuery}"`);
                const payload = { 
                    chapters: indexedChapters, 
                    metadata: indexedChapters.metadata || {
                        title: cleanQuery,
                        synopsis: indexedChapters.synopsis || `${cleanQuery} is available with complete chapters in our digital library archive.`,
                        author: 'Manga Artist',
                        genres: ['Action', 'Manga'],
                        status: 'Ongoing'
                    }, 
                    type: 'manga', 
                    source: 'TelegramRAMIndex' 
                };
                setCachedChapters(cacheKey, payload);
                return res.json(payload);
            }

            // 2. High-Speed Parallel Multi-Mirror Race (Mangapill + MangaBuddy + MangaDex + Manhwa18)
            const mirrorTasks = [
                // Mirror A: Mangapill (blazing fast scraper)
                (async () => {
                    const { searchMangapill, fetchMangapillChapters } = require('./mangapill');
                    const results = await searchMangapill(cleanQuery).catch(() => []);
                    if (results && results.length > 0) {
                        const top = results[0];
                        const chapters = await fetchMangapillChapters(top.id).catch(() => null);
                        if (chapters && chapters.length > 0) {
                            return { chapters, metadata: chapters.metadata || top, source: 'Mangapill' };
                        }
                    }
                    return null;
                })(),
                // Mirror B: MangaBuddy (huge catalog, fast API)
                (async () => {
                    const { searchMangaBuddy, fetchMangaBuddyChapters } = require('./mangabuddy');
                    const results = await searchMangaBuddy(cleanQuery).catch(() => []);
                    if (results && results.length > 0) {
                        const top = results[0];
                        const chapters = await fetchMangaBuddyChapters(top.id).catch(() => null);
                        if (chapters && chapters.length > 0) {
                            return { chapters, metadata: chapters.metadata || top, source: 'MangaBuddy' };
                        }
                    }
                    return null;
                })(),
                // Mirror C: MangaDex (official clean scanlations)
                (async () => {
                    const { fetchRealMangaChapters } = require('./mangadex');
                    const chapters = await fetchRealMangaChapters(cleanQuery).catch(() => null);
                    if (chapters && chapters.length > 0) {
                        return { chapters, metadata: chapters.metadata || {}, source: 'MangaDex' };
                    }
                    return null;
                })(),
                // Mirror D: Manhwa18 (manhwa & webtoon scanlations)
                (async () => {
                    const { searchManhwa18, fetchManhwa18Chapters } = require('./manhwa18');
                    const results = await searchManhwa18(cleanQuery).catch(() => []);
                    if (results && results.length > 0) {
                        const top = results[0];
                        const chapters = await fetchManhwa18Chapters(top.id).catch(() => null);
                        if (chapters && chapters.length > 0) {
                            return { chapters, metadata: chapters.metadata || top, source: 'Manhwa18' };
                        }
                    }
                    return null;
                })()
            ];

            // Resolve as soon as the first mirror returns valid chapters
            const winner = await new Promise(resolve => {
                let pending = mirrorTasks.length;
                let resolved = false;
                mirrorTasks.forEach(task => {
                    task.then(res => {
                        if (res && res.chapters && res.chapters.length > 0 && !resolved) {
                            resolved = true;
                            resolve(res);
                        }
                    }).catch(() => {}).finally(() => {
                        pending--;
                        if (pending === 0 && !resolved) {
                            resolve(null);
                        }
                    });
                });
            });

            if (winner && winner.chapters && winner.chapters.length > 0) {
                console.log(`[CHAPTERS] Fast Mirror Race winner (${winner.source}) served ${winner.chapters.length} chapters for "${cleanQuery}"`);
                const payload = {
                    chapters: winner.chapters,
                    metadata: winner.metadata || {},
                    type: 'manga',
                    format: 'Manga & Manhwa',
                    source: winner.source
                };
                setCachedChapters(cacheKey, payload);
                return res.json(payload);
            }

            // 3. ── MASTER MANHWA/MANGA ENGINE FALLBACK ──
            const { getMasterManhwaChapters } = require('./manhwaMasterEngine');
            const masterManhwaChapters = await getMasterManhwaChapters(cleanQuery).catch(() => null);
            if (masterManhwaChapters && masterManhwaChapters.length > 0) {
                console.log(`[CHAPTERS] Master Manhwa Engine served ${masterManhwaChapters.length} genuine visual chapters for "${cleanQuery}"`);
                const payload = { 
                    chapters: masterManhwaChapters, 
                    metadata: masterManhwaChapters.metadata || {
                        title: cleanQuery,
                        synopsis: masterManhwaChapters.synopsis || `${cleanQuery} scanlations and high-resolution chapters.`,
                        author: 'Manhwa Artist',
                        genres: ['Action', 'Manhwa'],
                        status: 'Ongoing'
                    }, 
                    type: 'manga', 
                    source: 'MasterManhwaEngine' 
                };
                setCachedChapters(cacheKey, payload);
                return res.json(payload);
            }

            // Manga/Manhwa must NEVER return novel text paragraphs! Only real visual scanlations.
            console.log(`[CHAPTERS] No real scanlation found for manga "${cleanQuery}".`);
            return res.json({ chapters: [], type: 'manga', source: 'NoScansFound', isFallback: false });
        }

        // 1. Check Local Downloads directory FIRST for instant loading (<1ms)
        try {
            const fs = require('fs');
            const path = require('path');
            const home = require('os').homedir();
            const targetDirs = [
                path.join(__dirname, '../public/epubs'),
                path.join(home, 'Downloads')
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

        // 2. Dedicated Verified Novel Providers (Shadow Slave, Locke Lamora, etc.) - Instant Memory (<1ms)
        const dedicatedChapters = getUniversalChapters(cleanQuery, '', '');
        if (dedicatedChapters && dedicatedChapters.length > 0) {
            const payload = { 
                chapters: dedicatedChapters, 
                type: 'book', 
                source: 'DedicatedProvider', 
                isFallback: false 
            };
            MEMORY_CACHE.chapters.set(cacheKey, payload);
            return res.json(payload);
        }

        // 3. AI Injected Book Knowledge Resolver (Silent Patient, Harry Potter, Dune, Da Vinci Code, etc.) - Instant (<1ms)
        const { resolveAIBookKnowledge } = require('./aiKnowledgeResolver');
        const aiBookData = resolveAIBookKnowledge(cleanQuery);
        if (aiBookData && aiBookData.chapters && aiBookData.chapters.length > 0) {
            console.log(`[SERVER] AI Knowledge Resolver served ${aiBookData.chapters.length} chapters for: "${cleanQuery}"`);
            const payload = {
                chapters: aiBookData.chapters,
                type: 'book',
                source: 'AIKnowledgeResolver',
                setting: aiBookData.setting,
                mainCharacters: aiBookData.mainCharacters,
                isFallback: false
            };
            setCachedChapters(cacheKey, payload);
            return res.json(payload);
        }

        // 4. Automated Universal Multi-Source Internet Fetcher (Internet Archive / Gutenberg / RoyalRoad)
        const { autoFetchBookFromInternet } = require('./universalInternetFetcher');
        const autoResult = await autoFetchBookFromInternet(cleanQuery, '', id);

        if (autoResult.chapters && autoResult.chapters.length > 0) {
            const payload = { chapters: autoResult.chapters, type: autoResult.type || 'book', source: autoResult.source, isFallback: false };
            setCachedChapters(cacheKey, payload);
            return res.json(payload);
        }

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
                    setCachedChapters(cacheKey, payload);
                    return res.json(payload);
                }
            } catch(err) {
                console.warn(`[SERVER] Failed server-side EPUB extraction: ${err.message}`);
            }
        }

        // 5. Project Gutenberg Authentic Public Domain Text Scraper (100% Genuine Chapters)
        const { fetchGutenbergChapters } = require('./gutendex');
        const gutenbergRes = await fetchGutenbergChapters(cleanQuery, '').catch(() => null);
        if (gutenbergRes && gutenbergRes.chapters && gutenbergRes.chapters.length > 0) {
            console.log(`[SERVER] Gutenberg served ${gutenbergRes.chapters.length} authentic chapters for: "${cleanQuery}"`);
            const payload = { chapters: gutenbergRes.chapters, type: 'book', source: 'Gutenberg', isFallback: false };
            setCachedChapters(cacheKey, payload);
            return res.json(payload);
        }

        // If not found in any authentic source, return clean empty result (NEVER FAKE TEXT!)
        return res.json({ chapters: [], type: 'book', source: 'NoTextFound', isFallback: false });

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

        // -1. Private Telegram Channel PDF Chapter (private-pdf-{channelId}-{messageId}-{chNum})
        if (chapterId.startsWith('private-pdf-')) {
            const m = chapterId.match(/^private-pdf-(-?\d+)-(\d+)-([\d\.]+)$/);
            if (m) {
                const channelId = m[1];
                const messageId = m[2];
                const chNum = m[3];
                const title = req.query.title || req.query.q || 'Manga';

                const { getChapterPdfPanels } = require('./userbot');
                const panelHtml = await getChapterPdfPanels(channelId, messageId, chNum, title);
                if (panelHtml) {
                    return res.json({ html: panelHtml });
                }
            }
        }

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

        // 0.2 MangaDex Direct Chapter Trigger (md-ch-{num}-{uuid})
        if (chapterId.startsWith('md-ch-')) {
            const m = chapterId.match(/^md-ch-[\d\.]+-([0-9a-fA-F-]+)$/);
            const mdChapterId = m ? m[1] : chapterId.replace(/^md-ch-[\d\.]+-/, '');
            const { getMangaDexChapterImages } = require('./mangadex');
            const mdHtml = await getMangaDexChapterImages(mdChapterId);
            if (mdHtml) {
                return res.json({ html: mdHtml });
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

        // 1.4 Mangapill Direct Chapter Trigger (mangapill-ch-{encodedUrl})
        if (chapterId.startsWith('mangapill-ch-')) {
            const { getMangapillChapterImages } = require('./mangapill');
            const mangapillHtml = await getMangapillChapterImages(chapterId);
            if (mangapillHtml) {
                return res.json({ html: mangapillHtml });
            }
        }

        // 2.8 MangaBuddy Direct Chapter Trigger (mb-{slug}-ch-{chNum} or mangabuddy-ch-{encodedUrl})
        // 2.7 MangaDNA Direct Chapter Trigger (mdna-{slug}-ch-{chNum} or mangadna-ch-{encodedUrl})
        if (chapterId.startsWith('mdna-') || chapterId.startsWith('mangadna-')) {
            let chapterUrl = '';
            if (req.query.url) {
                chapterUrl = decodeURIComponent(req.query.url);
            } else if (chapterId.startsWith('mangadna-ch-')) {
                chapterUrl = decodeURIComponent(chapterId.replace('mangadna-ch-', ''));
            } else {
                const m = chapterId.match(/^mdna-(.+)-ch-([\d\.]+)$/);
                if (m) {
                    const slug = m[1];
                    const chNum = parseFloat(m[2]);
                    chapterUrl = `https://mangadna.com/manga/${slug}/chapter-${chNum}`;
                }
            }
            if (chapterUrl) {
                const { getMangaDNAChapterPanels } = require('./mangadna');
                const panelsHtml = await getMangaDNAChapterPanels(chapterUrl);
                if (panelsHtml) return res.json({ html: panelsHtml });
            }
        }

        // 2.8 MangaBuddy Direct Chapter Trigger (mb-{slug}-ch-{chNum} or mangabuddy-ch-{encodedUrl})
        if (chapterId.startsWith('mb-') || chapterId.startsWith('mangabuddy-')) {
            const { getMangaBuddyChapterPanels, fetchMangaBuddyChapters } = require('./mangabuddy');
            let chapterUrl = null;
            if (req.query.url) {
                chapterUrl = decodeURIComponent(req.query.url);
            } else if (chapterId.startsWith('mangabuddy-ch-')) {
                chapterUrl = decodeURIComponent(chapterId.replace('mangabuddy-ch-', ''));
            } else {
                const m = chapterId.match(/^mb-(.+)-(?:chapter|ch)-([\d\.]+)$/);
                if (m) {
                    const slug = m[1];
                    const chNum = parseFloat(m[2]);
                    const chapters = await fetchMangaBuddyChapters(`mangabuddy-${slug}`);
                    const targetCh = chapters.find(c => c.id === chapterId || c.chapterId === chapterId || c.chNum === chNum || String(c.chNum) === String(chNum));
                    if (targetCh) chapterUrl = targetCh.url;
                }
            }
            if (chapterUrl) {
                const panelsHtml = await getMangaBuddyChapterPanels(chapterUrl);
                if (panelsHtml) {
                    return res.json({ html: panelsHtml });
                }
            }
        }

        // 2.9 Manhwa18 Direct Chapter Trigger (m18-{slug}-ch-{chNum} or manhwa18-ch-{encodedUrl})
        if (chapterId.startsWith('m18-') || chapterId.startsWith('manhwa18-')) {
            const { getManhwa18ChapterPanels, fetchManhwa18Chapters } = require('./manhwa18');
            let chapterUrl = null;
            if (chapterId.startsWith('manhwa18-ch-')) {
                chapterUrl = decodeURIComponent(chapterId.replace('manhwa18-ch-', ''));
            } else {
                const m = chapterId.match(/^m18-(.+)-ch-([\d\.]+)$/);
                if (m) {
                    const slug = m[1];
                    const chNum = parseFloat(m[2]);
                    const chapters = await fetchManhwa18Chapters(`manhwa18-${slug}`);
                    const targetCh = chapters.find(c => c.chNum === chNum || String(c.chNum) === String(chNum));
                    if (targetCh) chapterUrl = targetCh.url;
                }
            }
            if (chapterUrl) {
                const panelsHtml = await getManhwa18ChapterPanels(chapterUrl);
                if (panelsHtml) {
                    return res.json({ html: panelsHtml });
                }
            }
        }

        const raw = chapterId.replace(/^(?:tg|md|webtoon)-(?:ch|hybrid)-/, '');
        const firstDash = raw.indexOf('-');
        const chNum = parseInt(raw.slice(0, firstDash), 10) || 1;
        const titleQuery = decodeURIComponent(raw.slice(firstDash + 1)
            .replace(/-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, ''));

        // 3. Dedicated Provider for "God-level Assassin, I'm the Shadow"
        const isExactAssassinCh = (chapterId.toLowerCase().includes('godlevelassassin') || 
            (chapterId.toLowerCase().includes('assassin') && chapterId.toLowerCase().includes('shadow')));
        if (isExactAssassinCh) {
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

// ── 5. SERVER-SIDE MANGA IMAGE PROXY (Bypasses all CDN 403 hotlinking blocks & cloaks identity) ──
const NOCOVER_BUFFER = fs.existsSync(path.join(publicPath, 'nocover-new-min.png'))
    ? fs.readFileSync(path.join(publicPath, 'nocover-new-min.png'))
    : Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
const TRANSPARENT_1X1_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function sendSafeFallbackImage(res) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(NOCOVER_BUFFER);
}

// ── 3. IMAGE PROXY & ASSET HANDLERS ──
const IMAGE_CACHE = new Map();
app.get('/api/proxy/image', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl || !targetUrl.startsWith('http')) {
            return sendSafeFallbackImage(res);
        }

        if (IMAGE_CACHE.has(targetUrl)) {
            const cached = IMAGE_CACHE.get(targetUrl);
            res.setHeader('Content-Type', cached.type);
            res.setHeader('Cache-Control', 'public, max-age=604800'); // 7-day browser cache
            return res.send(cached.buffer);
        }

        let referer = 'https://manhwa18.cc/';
        if (targetUrl.includes('mangapill') || targetUrl.includes('readdetectiveconan')) referer = 'https://mangapill.com/';
        else if (targetUrl.includes('manhwa18')) referer = 'https://manhwa18.cc/';
        else if (targetUrl.includes('mangadna')) referer = 'https://mangadna.com/';
        else if (targetUrl.includes('mangabuddy') || targetUrl.includes('love4awalk') || targetUrl.includes('mbcdn')) referer = 'https://mangabuddy1.co.uk/';
        else if (targetUrl.includes('mangakatana')) referer = 'https://mangakatana.com/';
        else if (targetUrl.includes('manganato') || targetUrl.includes('mkklcdn')) referer = 'https://chapmanganato.to/';
        else if (targetUrl.includes('asura')) referer = 'https://asuracomic.net/';
        else if (targetUrl.includes('reaper')) referer = 'https://reaperscans.com/';

        const { stealthFetch } = require('./stealthEngine');
        const response = await stealthFetch(targetUrl, {
            type: 'image',
            referer,
            timeout: 12000
        });

        if (response.status >= 400 || !response.buffer) {
            return sendSafeFallbackImage(res);
        }

        const contentType = response.headers['content-type'] || (targetUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
        const buffer = response.buffer;

        // Cache up to 2000 image pages in memory
        if (IMAGE_CACHE.size > 2000) {
            const firstKey = IMAGE_CACHE.keys().next().value;
            IMAGE_CACHE.delete(firstKey);
        }
        IMAGE_CACHE.set(targetUrl, { type: contentType, buffer });

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=604800');
        return res.send(buffer);
    } catch (e) {
        return sendSafeFallbackImage(res);
    }
});

// Favicon handler
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Content-Type', 'image/x-icon');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(NOCOVER_BUFFER);
});

// Suppress source-map 404 warnings from DevTools
app.get(/\.map$/, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({});
});

// Catch-all cover / image routes — guarantees no 404s for any image format across the site
app.get(['/assets/covers/:file', '/covers/:file', '/assets/:file', '/cover/:file'], (req, res) => {
    const file = req.params.file;
    const candidates = [
        path.join(publicPath, 'assets/covers', file),
        path.join(publicPath, 'covers', file),
        path.join(publicPath, 'assets', file),
        path.join(publicPath, file)
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) {
            try {
                return res.status(200).send(fs.readFileSync(c));
            } catch(e) {}
        }
    }
    return sendSafeFallbackImage(res);
});

// Any requested static image that wasn't found on disk falls back cleanly to 200 OK fallback image
app.get(/\.(png|jpe?g|webp|gif|svg|ico)$/i, (req, res) => {
    const filePath = path.join(publicPath, req.path);
    if (fs.existsSync(filePath)) {
        try {
            return res.status(200).send(fs.readFileSync(filePath));
        } catch(e) {}
    }
    return sendSafeFallbackImage(res);
});

// API fallback (returns JSON 200 instead of 404)
app.use('/api', (req, res) => {
    res.status(200).json({ success: false, error: 'Endpoint not found' });
});

// SPA fallback
const indexPath = path.resolve(publicPath, 'index.html');
app.use((req, res) => {
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
            if (err && !res.headersSent) {
                res.status(200).end();
            }
        });
    } else {
        res.status(200).send('<!DOCTYPE html><html><body><h1>Bibliothèque</h1></body></html>');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ENI] Server running → http://localhost:${PORT}`);
    console.log(`[ENI] Frontend: ${publicPath}`);
});
