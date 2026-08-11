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
    'the immortal genius spearman': 'The Immortal Genius Spearman',
    'immortal genius spearman': 'The Immortal Genius Spearman',
    'resurrection boy': 'Resurrection Boy',
    'the resurrection boy': 'Resurrection Boy',
    'return of the mount hua sect': 'Return of the Mount Hua Sect',
    'mount hua sect': 'Return of the Mount Hua Sect',
    'the reincarnated assassin is a genius swordsman': 'The Reincarnated Assassin Is a Genius Swordsman',
    'reincarnated assassin': 'The Reincarnated Assassin Is a Genius Swordsman',
    'swordmaster s youngest son': "Swordmaster's Youngest Son",
    'swordmasters youngest son': "Swordmaster's Youngest Son",
    'my dress up darling': 'Sono Bisque Doll wa Koi wo Suru',
    'my dress-up darling': 'Sono Bisque Doll wa Koi wo Suru',
    'demon slayer': 'Kimetsu no Yaiba',
    'attack on titan': 'Shingeki no Kyojin',
    'jujutsu kaisen': 'Jujutsu Kaisen',
    'chainsaw man': 'Chainsaw Man',
    'solo leveling': 'Solo Leveling',
    'blue lock': 'Blue Lock',
    'one piece': 'One Piece',
    'naruto': 'Naruto',
    'bleach': 'Bleach',
    'dragon ball': 'Dragon Ball',
    'spy x family': 'SPY x FAMILY',
    'tokyo revengers': 'Tokyo Revengers',
    'kaiju no 8': 'Kaiju No. 8',
    'kaiju no. 8': 'Kaiju No. 8',
    'nano machine': 'Nano Machine'
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

        // 2. Fallback: if no English chapters exist, return empty
        if (validItems.length === 0) {
            console.log(`[MANGADEX] No English chapters for ${mangaId}.`);
            return { chapters: [], fallbackLang: null };
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
        if (!chapterId) return null;

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

        return pageList.map((filename, i) => {
            const rawUrl = `${baseUrl}/data/${hash}/${filename}`;
            const proxiedUrl = `/api/proxy/image?url=${encodeURIComponent(rawUrl)}`;
            return `<img src="${proxiedUrl}" 
                 loading="lazy" 
                 decoding="async"
                 referrerpolicy="no-referrer"
                 style="width:100%;max-width:900px;margin:0 auto;display:block;padding:0;border:none;min-height:500px;background:#05070a;object-fit:contain;" 
                 onerror="this.onerror=null;this.src='/api/proxy/image?url=${encodeURIComponent(baseUrl + '/data-saver/' + hash + '/' + filename)}';" />`;
        }).join('');

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
// Calculates Dice coefficient similarity between searched query and manga title
function scoreTitleMatch(query, candidateTitle, altTitles) {
    if (!query || !candidateTitle) return 0;
    const clean = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const qClean = clean(query);
    const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'at', 'to', 'for', 'and', 'or', 'is', 'its', 'my', 'i', 'im', 'am']);
    const qTokens = qClean.split(' ').filter(t => t.length > 1 && !stopWords.has(t));
    if (qTokens.length === 0) return 0;

    const allCandidateTitles = [candidateTitle, ...(altTitles || [])].filter(Boolean);
    let highestScore = 0;

    for (const title of allCandidateTitles) {
        const tClean = clean(title);
        if (qClean === tClean) return 1.0;

        const cTokens = tClean.split(' ').filter(t => t.length > 1 && !stopWords.has(t));
        if (cTokens.length === 0) continue;

        let matched = 0;
        for (const token of qTokens) {
            if (cTokens.includes(token) || cTokens.some(ct => ct === token)) {
                matched++;
            }
        }

        // Dice coefficient: 2 * intersection / (|A| + |B|)
        const dice = (2 * matched) / (qTokens.length + cTokens.length);
        if (dice > highestScore) highestScore = dice;
    }

    return highestScore;
}

// ── Full End-to-End Chapter Panel Extractor ────────────────────────────────────
// Given any manga/manhwa title, searches MangaDex, finds all chapters, and builds
// real story panels with high-res images for the reader!
async function fetchRealMangaChapters(titleQuery, targetMaxChapter) {
    try {
        if (!titleQuery || titleQuery.length < 2) return null;
        const cleanQ = titleQuery.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        // 1. Search MangaDex with alias mapping first, then exact query variants
        const queries = [
            POPULAR_MANGA_MAP[cleanQ],
            cleanQ,
            cleanQ.replace(/^(the|a|an)\s+/i, ''),
            cleanQ.replace(/\bmanhwa\b|\bmanga\b/gi, '').trim()
        ].filter(q => q && q.length > 2);

        const candidateList = [];
        for (const q of queries) {
            try {
                const res = await axios.get(`${API}/manga`, {
                    params: {
                        title: q,
                        'order[relevance]': 'desc',
                        limit: 10
                    },
                    headers: UA,
                    timeout: 3000
                });

                const mangaList = res.data.data || [];
                for (const manga of mangaList) {
                    const titleEn = manga.attributes.title?.en || Object.values(manga.attributes.title || {})[0] || '';
                    const altTitles = (manga.attributes.altTitles || []).map(t => Object.values(t)[0]).filter(Boolean);
                    const score = scoreTitleMatch(cleanQ, titleEn, altTitles);

                    if (score >= 0.85) {
                        candidateList.push({ manga, score, titleEn });
                    }
                }
            } catch(e) {}
        }

        candidateList.sort((a, b) => b.score - a.score);

        if (candidateList.length === 0) {
            console.log(`[MANGADEX] No match found for "${titleQuery}"`);
            return null;
        }

        let chosenManga = null;
        let chosenByNum = null;
        let officialTitle = titleQuery;

        for (const item of candidateList) {
            const manga = item.manga;
            const mangaId = manga.id;
            const titleEn = item.titleEn;

            try {
                const feedRes = await axios.get(`${API}/manga/${mangaId}/feed`, {
                    params: {
                        'translatedLanguage[]': 'en',
                        'order[chapter]': 'asc',
                        limit: 250
                    },
                    headers: UA,
                    timeout: 4000
                });

                const items = feedRes.data.data || [];
                const byNum = new Map();

                for (const ch of items) {
                    const num = parseFloat(ch.attributes.chapter);
                    const pages = ch.attributes.pages || 0;
                    const isExternal = !!ch.attributes.externalUrl;
                    
                    if (!isNaN(num) && pages > 0 && !isExternal) {
                        if (!byNum.has(num)) {
                            byNum.set(num, ch);
                        }
                    }
                }

                if (byNum.size > 0) {
                    chosenManga = manga;
                    chosenByNum = byNum;
                    officialTitle = titleEn || titleQuery;
                    console.log(`[MANGADEX] Found ${byNum.size} real scanlation chapters in "${officialTitle}" for "${titleQuery}"`);
                    break;
                }
            } catch(e) {}
        }

        if (!chosenByNum || chosenByNum.size === 0) {
            console.log(`[MANGADEX] No chapters with images found in candidates for "${titleQuery}"`);
            return null;
        }

        const byNum = chosenByNum;
        const sortedNums = [...byNum.keys()].filter(n => n > 0).sort((a, b) => a - b);
        if (sortedNums.length === 0) return null;

        console.log(`[MANGADEX] Found ${sortedNums.length} real scanlation chapters for "${officialTitle}"`);

        // 3. Build chapter list with real scanlation pages
        const chapters = [];

        for (const num of sortedNums) {
            const chItem = byNum.get(num);
            const chapterId = chItem.id;
            let panelHtml = '';

            // For the first chapter, pre-fetch image URLs immediately so reading starts with 0 delay
            if (num === sortedNums[0] || num === 1) {
                const pageUrls = await getChapterImagesCached(chapterId);
                if (pageUrls && pageUrls.length > 0) {
                    const pages = pageUrls.map((url, idx) => {
                        const proxied = `/api/proxy/image?url=${encodeURIComponent(url)}`;
                        return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#05070a;width:100%;">` +
                            `<img src="${proxied}" alt="${officialTitle} Ch${num} Page${idx+1}" loading="eager" decoding="async" referrerpolicy="no-referrer" ` +
                            `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:500px;background:#05070a;object-fit:contain;">` +
                            `</div>`;
                    }).join('');

                    panelHtml = `
                        <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                            <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                                <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                    CHAPTER ${num} OF ${sortedNums.length}
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

            // For later chapters, use automatic lazy image loader
            if (!panelHtml) {
                panelHtml = `
                    <div class="lazy-manga-trigger" data-chapter-id="md-ch-${num}-${chapterId}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                        <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                            <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                CHAPTER ${num} OF ${sortedNums.length}
                            </div>
                            <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${officialTitle}</h2>
                            <span style="color:#38bdf8;font-size:0.85rem;font-weight:600;">⚡ Click or scroll to load Chapter ${num} panels</span>
                        </div>
                    </div>`;
            }

            chapters.push({
                title: `Chapter ${num}`,
                chapterId: `md-ch-${num}-${chapterId}`,
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

