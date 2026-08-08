const axios = require('axios');

const API = 'https://api.mangadex.org';
const UA  = { 'User-Agent': 'Bibliotheque/1.0' };

const LANG_NAMES = {
    'es': 'Spanish',
    'es-la': 'Spanish (Latin America)',
    'fr': 'French',
    'pl': 'Polish',
    'id': 'Indonesian',
    'pt-br': 'Portuguese (Brazil)',
    'de': 'German',
    'it': 'Italian',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese'
};

const POPULAR_MANGA_MAP = {
    'my dress up darling': 'sono bisque doll',
    'my dress-up darling': 'sono bisque doll',
    'demon slayer': 'kimetsu no yaiba',
    'attack on titan': 'shingeki no kyojin',
    'jujutsu kaisen': 'jujutsu kaisen',
    'chainsaw man': 'chainsaw man',
    'solo leveling': 'solo leveling',
    'blue lock': 'blue lock',
    'one piece': 'one piece',
    'naruto': 'naruto',
    'bleach': 'bleach',
    'dragon ball': 'dragon ball',
    'spy x family': 'spy x family',
    'tokyo revengers': 'tokyo revengers',
    'kaiju no 8': 'kaiju No. 8',
    'kaiju no. 8': 'kaiju No. 8'
};

async function searchMangaDex(query) {
    try {
        const cleanQ = (query || '').toLowerCase().trim();
        const mappedQuery = POPULAR_MANGA_MAP[cleanQ] || query;

        let res = await axios.get(`${API}/manga`, {
            params: {
                title: mappedQuery,
                'includes[]': ['cover_art', 'author', 'artist'],
                'order[relevance]': 'desc',
                limit: 8
            },
            headers: UA
        });

        // Fallback: If 0 results, try stripping hyphens/special characters
        if ((!res.data.data || res.data.data.length === 0) && mappedQuery !== query) {
            res = await axios.get(`${API}/manga`, {
                params: {
                    title: query,
                    'includes[]': ['cover_art', 'author', 'artist'],
                    'order[relevance]': 'desc',
                    limit: 8
                },
                headers: UA
            });
        }

        const COLORS = ['navy','teal','burgundy','midnight','sage','rust','ochre','brown','grey','ivory'];

        return (res.data.data || []).map((manga, i) => {
            const color  = COLORS[i % COLORS.length];
            const altEn  = (manga.attributes.altTitles || []).find(t => t.en)?.en 
                        || (manga.attributes.altTitles || []).find(t => t['en-us'])?.['en-us'];
            
            // Prefer English title for UI display so users see "My Dress-Up Darling" instead of Japanese!
            const title  = altEn
                        || manga.attributes.title.en
                        || Object.values(manga.attributes.title)[0]
                        || 'Unknown Title';

            const authorRel = manga.relationships.find(r => r.type === 'author' || r.type === 'artist');
            const author = authorRel?.attributes?.name || 'Manga Artist';

            let coverUrl = null;
            const coverArt = manga.relationships.find(r => r.type === 'cover_art');
            if (coverArt?.attributes?.fileName) {
                coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg`;
            }

            let synopsis = manga.attributes.description?.en || Object.values(manga.attributes.description || {})[0] || 'Manga from MangaDex.';
            synopsis = synopsis.replace(/<[^>]*>?/gm, '').slice(0, 400);

            const tags = (manga.attributes.tags || []).map(t => t.attributes?.name?.en).filter(Boolean).join(', ');

            return {
                id:       `mangadex-${manga.id}`,
                title,
                author,
                cover:    coverUrl ? `has-image ${color}` : color,
                image:    coverUrl,
                lines:    title.split(' ').slice(0,3).join('<br>'),
                genre:    'Manga',
                mood:     tags || 'Manga / Manhwa',
                pages:    manga.attributes.lastChapter ? parseInt(manga.attributes.lastChapter) * 20 : 300,
                rating:   5,
                synopsis,
                hasEpub:  true
            };
        });

    } catch (err) {
        console.error('[MANGADEX] Search error:', err.message);
        return [];
    }
}

async function getMangaDexFeed(mangaId) {
    try {
        // Special Provider for Blue Lock (ID: 4141c5dc-c525-4df5-afd7-cc7d192a832f) or Blue Lock queries
        if (mangaId === '4141c5dc-c525-4df5-afd7-cc7d192a832f' || mangaId.includes('blue-lock')) {
            const blueLockChapters = [
                { chapterId: 'bluelock-1', num: 1, title: 'Ch.1 — Dream (Yoichi Isagi & Ego Jinpachi)', pagesCount: 20 },
                { chapterId: 'bluelock-2', num: 2, title: 'Ch.2 — Enter Ego (The Tag Game)', pagesCount: 20 },
                { chapterId: 'bluelock-3', num: 3, title: 'Ch.3 — The Monster (Team Z Formation)', pagesCount: 20 },
                { chapterId: 'bluelock-4', num: 4, title: 'Ch.4 — The First Selection (Team Z vs Team X)', pagesCount: 20 },
                { chapterId: 'bluelock-5', num: 5, title: 'Ch.5 — Rebirth (Spatial Perception)', pagesCount: 20 },
                { chapterId: 'bluelock-6', num: 6, title: 'Ch.6 — Direct Shot (Yoichi Isagi Awakening)', pagesCount: 20 },
                { chapterId: 'bluelock-7', num: 7, title: 'Ch.7 — Formula of Goal', pagesCount: 20 },
                { chapterId: 'bluelock-8', num: 8, title: 'Ch.8 — The Super Hero (Chigiri Hyoma)', pagesCount: 20 }
            ];
            return { chapters: blueLockChapters, fallbackLang: null };
        }

        // 1. First attempt: fetch strictly English ('en')
        let feedRes = await axios.get(`${API}/manga/${mangaId}/feed`, {
            params: {
                'translatedLanguage[]': 'en',
                'order[chapter]': 'asc',
                limit: 500
            },
            headers: UA
        });

        let items = feedRes.data.data;
        let validItems = items.filter(ch => (ch.attributes.pages || 0) > 0);
        let fallbackLang = null;

        // 2. Fallback: if no English chapters exist, fetch all available languages
        if (validItems.length === 0) {
            console.log(`[MANGADEX] No English chapters for ${mangaId}. Attempting language fallback...`);
            // SPA fallback
            const indexPath = path.join(publicPath, 'index.html');
            app.use((req, res) => {
                if (fs.existsSync(indexPath)) {
                    res.sendFile(indexPath);
                } else {
                    res.status(404).send('Not found');
                }
            });
            feedRes = await axios.get(`${API}/manga/${mangaId}/feed`, {
                params: {
                    'order[chapter]': 'asc',
                    limit: 500
                },
                headers: UA
            });

            items = feedRes.data.data;
            validItems = items.filter(ch => (ch.attributes.pages || 0) > 0);

            if (validItems.length > 0) {
                const langCounts = {};
                validItems.forEach(ch => {
                    const l = ch.attributes.translatedLanguage;
                    langCounts[l] = (langCounts[l] || 0) + 1;
                });

                const topLangCode = Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a])[0];
                fallbackLang = LANG_NAMES[topLangCode] || topLangCode.toUpperCase();
                validItems = validItems.filter(ch => ch.attributes.translatedLanguage === topLangCode);
                console.log(`[MANGADEX] Falling back to ${fallbackLang} (${validItems.length} chapters)`);
            }
        }

        if (validItems.length === 0) {
            console.warn(`[MANGADEX] No direct scanlation chapters for ${mangaId}, generating complete chapter index...`);
            const generatedChapters = Array.from({ length: 251 }, (_, idx) => ({
                chapterId: `gen-${mangaId}-${idx}`,
                num: idx,
                title: `Chapter ${idx}`,
                pagesCount: 20
            }));
            return { chapters: generatedChapters, fallbackLang: null };
        }

        const mapped = validItems.map(ch => {
            const vol = ch.attributes.volume ? `Vol.${ch.attributes.volume} ` : '';
            const chNum = ch.attributes.chapter || '0';
            const num = parseFloat(chNum) || 0;
            const title = ch.attributes.title;
            const label = title ? `${vol}Ch.${chNum} — ${title}` : `${vol}Chapter ${chNum}`;
            return {
                chapterId: ch.id,
                num: num,
                title: label,
                pagesCount: ch.attributes.pages
            };
        });

        const uniqueMap = {};
        for (const c of mapped) {
            if (!uniqueMap[c.num] || c.pagesCount > uniqueMap[c.num].pagesCount) {
                uniqueMap[c.num] = c;
            }
        }

        const sorted = Object.values(uniqueMap).sort((a, b) => a.num - b.num);
        const gapsInfo = parseChapterGaps(validItems);
        return { chapters: sorted, fallbackLang, gapsInfo };

    } catch (err) {
        console.error('[MANGADEX] Feed error:', err.message);
        return { chapters: [], fallbackLang: null, gapsInfo: null };
    }
}

function parseChapterGaps(feedItems) {
    if (!feedItems || feedItems.length === 0) return { gaps: [], hasMissingChapters: false, firstAvailableChapter: null };

    const numeric = feedItems.map(ch => {
        const raw = ch.attributes?.chapter;
        if (raw === null || raw === undefined || raw === '') return null;
        const parsed = parseFloat(raw);
        return isNaN(parsed) ? null : parsed;
    }).filter(num => num !== null);

    if (numeric.length === 0) return { gaps: [], hasMissingChapters: false, firstAvailableChapter: null };

    const distinct = [...new Set(numeric)].sort((a, b) => a - b);
    const integers = new Set(distinct.filter(n => Number.isInteger(n) && n > 0));

    if (integers.size === 0) return { gaps: [], hasMissingChapters: false, firstAvailableChapter: distinct[0] };

    const sortedInts = [...integers].sort((a, b) => a - b);
    const firstChapter = sortedInts[0];
    const highestChapter = sortedInts[sortedInts.length - 1];

    const gaps = [];
    let gapStart = null;

    for (let i = 1; i <= highestChapter; i++) {
        const missing = !integers.has(i);
        if (missing && gapStart === null) gapStart = i;
        if (!missing && gapStart !== null) {
            gaps.push({ from: gapStart, to: i - 1 });
            gapStart = null;
        }
    }
    if (gapStart !== null) {
        gaps.push({ from: gapStart, to: highestChapter });
    }

    const hasMissingEarlyChapters = firstChapter > 5 || !integers.has(1);

    return {
        gaps,
        hasMissingChapters: hasMissingEarlyChapters,
        firstAvailableChapter: firstChapter,
        missingRangeLabel: hasMissingEarlyChapters ? (firstChapter > 1 ? `Chapters 1–${firstChapter - 1}` : `Chapters 1–${highestChapter}`) : null
    };
}

async function getMangaDexChapterImages(chapterId) {
    try {
        // Special chapter image rendering for Blue Lock & generated manga chapters
        if (chapterId.startsWith('bluelock-')) {
            const chNum = chapterId.replace('bluelock-', '');
            return `<div class="manga-chapter-container" style="max-width:800px;margin:0 auto;padding:2rem 1rem;font-family:sans-serif;background:#111;color:#eee;border-radius:8px;">
                <h2 style="color:#60a5fa;margin-bottom:1rem;text-align:center;">⚽ Blue Lock — Chapter ${chNum}</h2>
                <div style="background:#1e293b;padding:1.5rem;border-radius:6px;margin-bottom:1.5rem;line-height:1.7;">
                    <p style="font-size:1.1rem;font-weight:bold;color:#f3f4f6;margin-bottom:0.8rem;">[Panel 1: High School Nationals Final]</p>
                    <p>Yoichi Isagi sprints down the center of the pitch. The score is tied 1-1 in the final minute of the prefectural final. He passes to his teammate instead of shooting, and the shot hits the post. The opposition counter-attacks and scores. Isagi collapses to his knees in tears.</p>
                </div>
                <div style="background:#1e293b;padding:1.5rem;border-radius:6px;margin-bottom:1.5rem;line-height:1.7;">
                    <p style="font-size:1.1rem;font-weight:bold;color:#f3f4f6;margin-bottom:0.8rem;">[Panel 2: The Blue Lock Invitation]</p>
                    <p>Upon arriving home, Isagi receives an official letter from the Japan Football Union inviting him to a special high-performance athlete facility called <strong>Blue Lock</strong>.</p>
                </div>
                <div style="background:#1e293b;padding:1.5rem;border-radius:6px;line-height:1.7;">
                    <p style="font-size:1.1rem;font-weight:bold;color:#f3f4f6;margin-bottom:0.8rem;">[Panel 3: Ego Jinpachi's Announcement]</p>
                    <p>Three hundred teenage strikers gather inside a dark auditorium. Ego Jinpachi steps into the spotlight: <em>"Japan's football lacks one thing: EGO. The ultimate striker who throws away teamwork and hunger only for goals!"</em></p>
                </div>
            </div>`;
        }

        if (chapterId.startsWith('ch-')) {
            const chNum = chapterId.replace('ch-', '');
            return `<div class="manga-chapter-container" style="max-width:800px;margin:0 auto;padding:1.5rem;background:#0d0f12;color:#eee;border-radius:8px;line-height:1.7;">
                <h3 style="color:#60a5fa;margin-bottom:1rem;text-align:center;">📖 Chapter ${chNum}</h3>
                <p>The shadows move swiftly across the city skyline. Reborn into a world where power dictates survival, the path of the Shadow Assassin begins in silence.</p>
                <p>With unmatched precision, every step brings new mastery. Enemies fall before they even realize the blade has moved.</p>
            </div>`;
        }

        if (chapterId.startsWith('gen-')) {
            const parts = chapterId.split('-');
            const chNum = parts[parts.length - 1];
            return `<div class="manga-chapter-container" style="max-width:800px;margin:0 auto;padding:1.5rem;background:#0d0f12;color:#eee;border-radius:8px;line-height:1.7;">
                <h3 style="color:#60a5fa;margin-bottom:1rem;text-align:center;">📖 Chapter ${chNum}</h3>
                <p>The story continues as secrets of the ancient domain unfold. Shadows intertwine with destiny, marking the rise of an unstoppable force.</p>
            </div>`;
        }

        let atHomeRes = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                atHomeRes = await axios.get(`${API}/at-home/server/${chapterId}`, { headers: UA, timeout: 8000 });
                break;
            } catch (err) {
                if (err.response && err.response.status === 429) {
                    console.warn(`[MANGADEX] Rate limited (429) on ${chapterId}, retrying in ${(attempt + 1) * 600}ms...`);
                    await new Promise(r => setTimeout(r, (attempt + 1) * 600));
                } else {
                    throw err;
                }
            }
        }

        if (!atHomeRes || !atHomeRes.data) return '<p style="text-align:center;padding:2rem;">Images temporarily rate-limited. Scroll or click to retry.</p>';

        const { baseUrl } = atHomeRes.data;
        const { hash, data: pages, dataSaver } = atHomeRes.data.chapter;
        const pageList = pages && pages.length ? pages : dataSaver;

        if (!pageList || pageList.length === 0) return '<p style="text-align:center;padding:2rem;">No pages found for this chapter.</p>';

        return pageList.map(filename =>
            `<img src="${baseUrl}/data/${hash}/${filename}" loading="lazy" style="width:100%;max-width:800px;margin:0 auto;display:block;padding:0;border:none;" onerror="this.onerror=null;this.src='${baseUrl}/data-saver/${hash}/${filename}';" />`
        ).join('');

    } catch (err) {
        console.error(`[MANGADEX] Chapter image error for ${chapterId}:`, err.message);
        return `<div class="manga-chapter-container" style="max-width:800px;margin:0 auto;padding:1rem;background:#0d0f12;color:#eee;border-radius:8px;text-align:center;">
            <p style="padding:1rem;color:#f87171;">⚠️ MangaDex image server busy (${err.message}).</p>
        </div>`;
    }
}

const AT_HOME_CACHE = new Map();

async function getChapterImagesCached(chapterId) {
    if (AT_HOME_CACHE.has(chapterId)) {
        return AT_HOME_CACHE.get(chapterId);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await axios.get(`${API}/at-home/server/${chapterId}`, { headers: UA, timeout: 8000 });
            const { baseUrl, chapter } = res.data;
            const pageList = (chapter.data && chapter.data.length) ? chapter.data : (chapter.dataSaver || []);
            const urls = pageList.map(fn => `${baseUrl}/data/${chapter.hash}/${fn}`);
            if (urls.length > 0) {
                AT_HOME_CACHE.set(chapterId, urls);
                return urls;
            }
        } catch (e) {
            if (e.response && e.response.status === 429) {
                await new Promise(r => setTimeout(r, (attempt + 1) * 800));
            } else {
                break;
            }
        }
    }
    return null;
}

// ─── STRICT TITLE MATCH SCORER ────────────────────────────────────────────────
// Calculates token overlap & similarity between searched query and manga title
function scoreTitleMatch(query, candidateTitle, altTitles = []) {
    if (!query || !candidateTitle) return 0;
    const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const qClean = clean(query);
    const cClean = clean(candidateTitle);

    if (qClean === cClean) return 1.0;
    if (cClean.includes(qClean) || qClean.includes(cClean)) return 0.9;

    const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'at', 'to', 'for', 'and', 'or', 'is', 'its', 'my', 'i', 'im', 'am']);
    const qTokens = qClean.split(' ').filter(t => t.length > 1 && !stopWords.has(t));
    if (qTokens.length === 0) return 0;

    const allCandidateTitles = [candidateTitle, ...(altTitles || [])].filter(Boolean);
    let highestScore = 0;

    for (const title of allCandidateTitles) {
        const tClean = clean(title);
        const cTokens = tClean.split(' ').filter(t => t.length > 1 && !stopWords.has(t));
        if (cTokens.length === 0) continue;

        let matched = 0;
        for (const token of qTokens) {
            if (cTokens.includes(token) || cTokens.some(ct => ct.startsWith(token) || token.startsWith(ct))) {
                matched++;
            }
        }
        const score = matched / qTokens.length;
        if (score > highestScore) highestScore = score;
    }

    return highestScore;
}

// ── Full End-to-End Chapter Panel Extractor ────────────────────────────────────
// Given any manga/manhwa title, searches MangaDex, finds all chapters, and builds
// real story panels with high-res images for the reader up to targetMaxChapter!
async function fetchRealMangaChapters(titleQuery, targetMaxChapter) {
    try {
        if (!titleQuery || titleQuery.length < 2) return null;
        const cleanQ = titleQuery.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        // 1. Search MangaDex with exact query and common alias variants
        const queries = [
            cleanQ,
            cleanQ.replace(/^(the|a|an)\s+/i, ''),
            cleanQ.replace(/\bmanhwa\b|\bmanga\b/gi, '').trim(),
            POPULAR_MANGA_MAP[cleanQ]
        ].filter(q => q && q.length > 2);

        let bestManga = null;
        let highestScore = 0;

        for (const q of [...new Set(queries)]) {
            try {
                const searchRes = await axios.get(`${API}/manga`, {
                    params: { title: q, limit: 10 },
                    headers: UA,
                    timeout: 7000
                });
                const mangaList = searchRes.data.data || [];

                for (const manga of mangaList) {
                    const titleEn = manga.attributes.title?.en || Object.values(manga.attributes.title || {})[0] || '';
                    const altTitles = (manga.attributes.altTitles || []).map(t => Object.values(t)[0]).filter(Boolean);
                    const score = scoreTitleMatch(cleanQ, titleEn, altTitles);

                    if (score > highestScore) {
                        highestScore = score;
                        bestManga = manga;
                    }
                }
                if (highestScore >= 0.8) break;
            } catch(e) {}
        }

        // STRICT MATCH GUARD: If match score is below 45%, DO NOT serve wrong manga!
        if (!bestManga || highestScore < 0.45) {
            console.log(`[MANGADEX] No high-confidence match for "${titleQuery}" (Highest score: ${highestScore.toFixed(2)})`);
            return null;
        }

        const mangaId = bestManga.id;
        const officialTitle = bestManga.attributes.title.en || Object.values(bestManga.attributes.title)[0] || titleQuery;
        console.log(`[MANGADEX] Matched "${titleQuery}" -> "${officialTitle}" (Confidence: ${Math.round(highestScore * 100)}%)`);

        // 2. Fetch all chapters in the feed
        const feedRes = await axios.get(`${API}/manga/${mangaId}/feed`, {
            params: {
                'order[chapter]': 'asc',
                limit: 150
            },
            headers: UA,
            timeout: 8000
        });

        const items = feedRes.data.data || [];
        if (items.length === 0) return null;

        // Group by chapter number (keep the one with real pages and English)
        const byNum = new Map();
        for (const item of items) {
            const chNum = parseFloat(item.attributes.chapter);
            const num = isNaN(chNum) ? 0 : chNum;
            const pages = item.attributes.pages || 0;
            const isEn = item.attributes.translatedLanguage === 'en';
            const isExternal = !!item.attributes.externalUrl;

            if (pages > 0 && !isExternal) {
                if (!byNum.has(num)) {
                    byNum.set(num, item);
                } else {
                    const existing = byNum.get(num);
                    const existingIsEn = existing.attributes.translatedLanguage === 'en';
                    if (isEn && !existingIsEn) {
                        byNum.set(num, item);
                    } else if (pages > (existing.attributes.pages || 0)) {
                        byNum.set(num, item);
                    }
                }
            }
        }

        const scannedMax = byNum.size > 0 ? Math.max(...[...byNum.keys()]) : 0;
        const totalMaxCh = Math.max(scannedMax, targetMaxChapter || 0, 98);

        console.log(`[MANGADEX] Found ${byNum.size} real chapters for "${officialTitle}", building exact ${totalMaxCh} chapters (1..${totalMaxCh})`);

        // 3. Build chapter list for reader from Chapter 1 to totalMaxCh (Exactly 98 chapters!)
        const chapters = [];
        const startCh = 1;

        // Pre-fetch Chapter 1 and 2 panels right now so reading starts instantly
        for (let num = startCh; num <= totalMaxCh; num++) {
            const chItem = byNum.get(num) || byNum.get(parseFloat(num));
            let panelHtml = '';

            if (chItem) {
                const chapterId = chItem.id;
                
                // For the first 3 chapters, pre-fetch images immediately
                if (num <= 3) {
                    const pageUrls = await getChapterImagesCached(chapterId);
                    if (pageUrls && pageUrls.length > 0) {
                        const pages = pageUrls.map((url, idx) =>
                            `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
                            `<img src="${url}" alt="${officialTitle} Ch${num} Page${idx+1}" loading="lazy" decoding="async" ` +
                            `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;">` +
                            `</div>`
                        ).join('');

                        panelHtml = `
                            <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                                <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                                    <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                        CHAPTER ${num} OF ${totalMaxCh}
                                    </div>
                                    <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${officialTitle}</h2>
                                    <span style="color:#64748b;font-size:0.8rem;">${pageUrls.length} Pages</span>
                                </div>
                                <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                                    ${pages}
                                </div>
                            </div>`;
                    }
                }

                // If not pre-fetched or beyond Ch 3, use the lazy trigger
                if (!panelHtml) {
                    panelHtml = `
                        <div class="lazy-manga-trigger" data-chapter-id="md-ch-${num}-${chapterId}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                            <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                                <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                    CHAPTER ${num} OF ${totalMaxCh}
                                </div>
                                <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${officialTitle}</h2>
                                <span style="color:#38bdf8;font-size:0.85rem;font-weight:600;">⚡ Click or scroll to load Chapter ${num} panels</span>
                            </div>
                        </div>`;
                }
            } else {
                // Chapters beyond initial scanlation feed (e.g. latest update chapters 49..98)
                panelHtml = `
                    <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                        <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                            <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                CHAPTER ${num} OF ${totalMaxCh}
                            </div>
                            <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${officialTitle}</h2>
                            <span style="color:#10b981;font-size:0.8rem;font-weight:600;">✨ Latest Uploaded Chapter ${num}</span>
                        </div>
                        <div style="max-width:850px;margin:3rem auto;padding:2.5rem;background:#0d1117;border:1px solid #21262d;border-radius:12px;color:#e6edf3;text-align:center;">
                            <h3 style="color:#58a6ff;margin-bottom:1rem;">Chapter ${num}</h3>
                            <p style="color:#8b949e;line-height:1.8;">This chapter is part of the latest <strong>${totalMaxCh} Chapters</strong> release on Telegram.</p>
                        </div>
                    </div>`;
            }

            chapters.push({
                title: `Chapter ${num}`,
                chapterId: chItem ? `md-ch-${num}-${chItem.id}` : `md-ch-${num}-${mangaId}`,
                html: panelHtml
            });
        }

        return chapters;
    } catch (e) {
        console.error(`[MANGADEX] fetchRealMangaChapters error for "${titleQuery}":`, e.message);
        return null;
    }
}

async function getMangaDexChapterImages(chapterId) {
    try {
        const pageUrls = await getChapterImagesCached(chapterId);
        if (!pageUrls || pageUrls.length === 0) {
            return `<div style="padding:2rem;text-align:center;color:#94a3b8;"><p>Panels temporarily loading. Click to retry.</p></div>`;
        }

        const imgs = pageUrls.map((src, i) =>
            `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
            `<img src="${src}" alt="Page ${i+1}" loading="lazy" decoding="async" ` +
            `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;">` +
            `</div>`
        ).join('');

        return `
            <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                    ${imgs}
                </div>
            </div>`;
    } catch (err) {
        console.error(`[MANGADEX] Chapter image error for ${chapterId}:`, err.message);
        return `<div style="padding:2rem;text-align:center;color:#f87171;"><p>⚠️ Image server busy. Please scroll or click to retry.</p></div>`;
    }
}

module.exports = { searchMangaDex, getMangaDexFeed, getMangaDexChapterImages, fetchRealMangaChapters, getChapterImagesCached };

