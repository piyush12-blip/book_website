/**
 * Mangapill Autonomous Integration Module (Stealth & High-Speed Scraping)
 * Real-time search, chapter indexing, and image extraction for https://mangapill.com
 */

const cheerio = require('cheerio');
const { stealthFetch, sleepJitter } = require('./stealthEngine');

const BASE_URL = 'https://mangapill.com';

// In-Memory Chapter, Search & Page Caches
const MANGAPILL_SEARCH_CACHE = new Map();
const MANGAPILL_CHAPTERS_CACHE = new Map();
const MANGAPILL_PAGES_CACHE = new Map();

function sleep(ms) {
    return sleepJitter(ms, ms + 30);
}

async function fetchHtml(url, options = {}) {
    return await stealthFetch(url, {
        ...options,
        type: 'html',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://mangapill.com/'
        }
    });
}

/**
 * Search Mangapill catalog with rich metadata (Type, Year, Status, Alt Title, Covers)
 */
async function searchMangapill(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim().toLowerCase();

    if (MANGAPILL_SEARCH_CACHE.has(cleanQ)) {
        return MANGAPILL_SEARCH_CACHE.get(cleanQ);
    }

    const results = [];
    const seenHrefs = new Set();

    // 1. Query quick-search endpoint (Rich metadata: Exact type badge, year, publishing status, subtitles)
    try {
        const qsUrl = `${BASE_URL}/quick-search?q=${encodeURIComponent(cleanQ)}`;
        const res = await fetchHtml(qsUrl, { timeout: 5000 });
        if (res.status === 200 && res.text) {
            const $ = cheerio.load(res.text);

            $('a[href^="/manga/"]').each((i, el) => {
                const href = $(el).attr('href');
                if (!href || seenHrefs.has(href)) return;

                const parts = href.split('/').filter(Boolean);
                if (parts.length < 3) return;

                const mangaId = parts[1];
                const slug = parts[2];

                const title = $(el).find('.font-black').first().text().trim() || slug.replace(/-/g, ' ');
                const altTitle = $(el).find('.text-sm.text-secondary').first().text().trim();
                const imgEl = $(el).find('img').first();
                const coverUrl = imgEl.attr('data-src') || imgEl.attr('src') || null;

                const metaDivs = $(el).find('.flex.flex-wrap.gap-3.text-xs.text-secondary > div');
                let rawType = (metaDivs.eq(0).text().trim() || 'manga').toUpperCase();
                const year = metaDivs.eq(1).text().trim() || '';
                const status = metaDivs.eq(2).text().trim() || '';

                if (altTitle.toLowerCase().includes('light novel') || title.toLowerCase().includes('shousetsu') || title.toLowerCase().includes('novel')) {
                    rawType = 'LIGHT NOVEL';
                } else if (rawType === 'ONE-SHOT' || title.toLowerCase().includes('one-shot') || title.toLowerCase().includes('oneshot')) {
                    rawType = 'ONE-SHOT';
                } else if (rawType === 'MANHWA' || slug.includes('manhwa')) {
                    rawType = 'MANHWA';
                } else if (rawType === 'MANHUA' || slug.includes('manhua')) {
                    rawType = 'MANHUA';
                } else if (rawType === 'MANGA' || rawType === 'UNKNOWN') {
                    rawType = 'MANGA';
                }

                seenHrefs.add(href);
                results.push({
                    id: `mangapill-${mangaId}-${slug}`,
                    rawPath: href,
                    title,
                    altTitle,
                    coverImage: coverUrl,
                    genre: rawType,
                    year,
                    status
                });
            });
        }
    } catch (e) {
        console.error('[MANGAPILL] Quick search error:', e.message);
    }

    // 2. Query full search endpoint if quick-search returned few items or to broaden reach
    if (results.length < 5) {
        try {
            const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(cleanQ)}`;
            const res = await fetchHtml(searchUrl, { timeout: 6000 });
            if (res.status === 200 && res.text) {
                const $ = cheerio.load(res.text);

                $('div.my-3, div.grid > div').each((i, el) => {
                    const linkTag = $(el).find('a[href^="/manga/"]').first();
                    const href = linkTag.attr('href');
                    if (!href || seenHrefs.has(href)) return;

                    const parts = href.split('/').filter(Boolean);
                    if (parts.length < 3) return;

                    const mangaId = parts[1];
                    const slug = parts[2];

                    const titleEl = $(el).find('div.font-black, div.font-bold, div.text-sm, h2, a.mb-2 div').first();
                    let title = titleEl.text().trim();
                    if (!title) title = slug.replace(/-/g, ' ');

                    const imgEl = $(el).find('img').first();
                    const coverUrl = imgEl.attr('data-src') || imgEl.attr('src') || null;

                    const typeEl = $(el).find('div.text-xs, span.bg-purple-500, span.bg-green-500').first();
                    let genre = (typeEl.text().trim() || 'Manga').toUpperCase();
                    if (title.toLowerCase().includes('novel') || title.toLowerCase().includes('shousetsu')) genre = 'LIGHT NOVEL';

                    seenHrefs.add(href);
                    results.push({
                        id: `mangapill-${mangaId}-${slug}`,
                        rawPath: href,
                        title,
                        altTitle: '',
                        coverImage: coverUrl,
                        genre,
                        year: '',
                        status: ''
                    });
                });
            }
        } catch (e) {
            console.error('[MANGAPILL] Full search error:', e.message);
        }
    }

    const COLORS = ['teal', 'navy', 'burgundy', 'midnight', 'sage', 'rust', 'ochre', 'brown'];

    const mapped = results.map((s, idx) => {
        const color = COLORS[idx % COLORS.length];
        const coverUrl = s.coverImage;
        const proxiedCover = coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : null;
        const metaParts = [];
        if (s.genre) metaParts.push(s.genre);
        if (s.year) metaParts.push(s.year);
        if (s.status) metaParts.push(s.status);

        return {
            id: s.id,
            title: s.title,
            altTitle: s.altTitle || '',
            author: metaParts.join(' · ') || 'Manga & Comics',
            cover: proxiedCover || color,
            image: proxiedCover,
            lines: (s.title || '').split(' ').slice(0, 3).join('<br>'),
            genre: s.genre || 'MANGA',
            mood: s.status || 'High-Res',
            year: s.year || '',
            status: s.status || '',
            pages: 100,
            rating: 5,
            synopsis: `${s.title}${s.altTitle ? ` (${s.altTitle})` : ''}. Format: ${s.genre}, Status: ${s.status || 'Available'}. High-resolution scanlations from Mangapill.`,
            hasEpub: false,
            format: s.genre || 'MANGA',
            _isDirectSearchMatch: true
        };
    });

    MANGAPILL_SEARCH_CACHE.set(cleanQ, mapped);
    return mapped;
}

/**
 * Fetch chapter images for a specific Mangapill chapter URL
 */
async function fetchMangapillChapterPages(chUrl) {
    if (MANGAPILL_PAGES_CACHE.has(chUrl)) {
        return MANGAPILL_PAGES_CACHE.get(chUrl);
    }

    try {
        await sleep(Math.floor(Math.random() * 50) + 20);
        const fullUrl = chUrl.startsWith('http') ? chUrl : `${BASE_URL}${chUrl}`;
        const res = await fetchHtml(fullUrl, { timeout: 8000 });
        if (res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        const pages = [];

        $('picture img, img[data-src], img.lazy, #reader img, img[src*="cdn."]').each((i, el) => {
            const src = $(el).attr('data-src') || $(el).attr('src');
            if (src && !pages.includes(src)) {
                const sLower = src.toLowerCase();
                if (!sLower.includes('logo') && !sLower.includes('icon') && !sLower.includes('avatar') && !sLower.includes('ad.')) {
                    pages.push(src);
                }
            }
        });

        if (pages.length > 0) {
            MANGAPILL_PAGES_CACHE.set(chUrl, pages);
        }

        return pages;
    } catch (e) {
        console.error(`[MANGAPILL] Error fetching chapter pages for ${chUrl}:`, e.message);
        return [];
    }
}

/**
 * Build full chapter list for a Mangapill manga
 */
async function fetchMangapillChapters(seriesId) {
    const raw = seriesId.replace(/^mangapill-/, '');
    const firstDash = raw.indexOf('-');
    if (firstDash === -1) return null;

    const mangaNum = raw.slice(0, firstDash);
    const mangaSlug = raw.slice(firstDash + 1);
    const cacheKey = `${mangaNum}-${mangaSlug}`;

    if (MANGAPILL_CHAPTERS_CACHE.has(cacheKey)) {
        return MANGAPILL_CHAPTERS_CACHE.get(cacheKey);
    }

    try {
        const mangaUrl = `${BASE_URL}/manga/${mangaNum}/${mangaSlug}`;
        const res = await fetchHtml(mangaUrl, { timeout: 8000 });
        if (res.status !== 200 || !res.text) return null;

        const $ = cheerio.load(res.text);
        const chaptersList = [];

        $('#chapters a[href*="/chapters/"], a[href*="/chapters/"]').each((i, el) => {
            const chHref = $(el).attr('href');
            const chName = $(el).text().replace(/\s+/g, ' ').trim();
            if (chHref && !chaptersList.some(c => c.chUrl === chHref)) {
                chaptersList.push({
                    chUrl: chHref,
                    chName: chName || `Chapter ${chaptersList.length + 1}`
                });
            }
        });

        if (chaptersList.length === 0) return null;

        // Mangapill lists chapters newest-first, reverse to show Chapter 1 first
        chaptersList.reverse();

        const formatted = chaptersList.map((ch, idx) => {
            const chNumMatch = ch.chName.match(/(?:Chapter|Ch\.?)\s*(\d+(?:\.\d+)?)/i);
            const displayNum = chNumMatch ? chNumMatch[1] : (idx + 1);

            return {
                title: ch.chName,
                chapterNum: displayNum,
                chapterId: `mangapill-ch-${encodeURIComponent(ch.chUrl)}`,
                html: null,
                isVisualManga: true,
                chUrl: ch.chUrl
            };
        });

        // Scrape Mangapill Rich Series Metadata
        let metaTitle = $('h1').first().text().trim() || mangaSlug.replace(/-/g, ' ');
        let author = '';
        let artist = '';
        let year = '';
        let status = '';
        let genres = [];

        $('div.grid > div, div.flex > div').each((i, el) => {
            const t = $(el).text().replace(/\s+/g, ' ').trim();
            if (t.startsWith('Author')) author = t.replace(/^Author\s*/i, '').trim();
            if (t.startsWith('Artist')) artist = t.replace(/^Artist\s*/i, '').trim();
            if (t.startsWith('Year')) year = t.replace(/^Year\s*/i, '').trim();
            if (t.startsWith('Status')) status = t.replace(/^Status\s*/i, '').trim();
            if (t.startsWith('Genres')) genres = t.replace(/^Genres\s*/i, '').split(/\s+/).filter(Boolean);
        });

        const synopsis = $('p.text--secondary, p[class*="text--secondary"], p.text-sm').map((i, el) => $(el).text().trim()).get().find(t => 
            t.length > 30 && 
            !t.toLowerCase().includes('discontinue') && 
            !t.toLowerCase().includes('mangapill') &&
            !t.toLowerCase().includes('chapter not found')
        ) || '';

        const finalAuthor = author || artist || 'Manga Artist';

        const metadata = {
            title: metaTitle,
            author: finalAuthor,
            artist: artist,
            year: year,
            status: status || 'Publishing',
            genres: genres,
            synopsis: synopsis
        };

        formatted.metadata = metadata;
        MANGAPILL_CHAPTERS_CACHE.set(cacheKey, formatted);
        return formatted;
    } catch (e) {
        console.error(`[MANGAPILL] Error fetching chapters for ${seriesId}:`, e.message);
        return null;
    }
}

/**
 * Return full scrollable HTML panels for a single Mangapill chapter
 */
async function getMangapillChapterImages(chapterKey) {
    try {
        const encodedUrl = chapterKey.replace(/^mangapill-ch-/, '');
        const chUrl = decodeURIComponent(encodedUrl);

        console.log(`[MANGAPILL] Extracting panels for chapter URL: ${chUrl}`);
        const pages = await fetchMangapillChapterPages(chUrl);

        if (!pages || pages.length === 0) {
            return `
                <div style="max-width:700px;margin:3rem auto;padding:2rem;background:#0d0f12;border:1px solid #1e293b;border-radius:12px;text-align:center;color:#94a3b8;">
                    <div style="font-size:2.5rem;margin-bottom:1rem;">⚠️</div>
                    <h3 style="color:#38bdf8;margin-bottom:.75rem;">Chapter Pages Temporarily Unavailable</h3>
                    <p style="font-size:.93rem;line-height:1.7;">Could not retrieve images from Mangapill CDN.<br>Please try reloading or switching chapters.</p>
                </div>`;
        }

        const imageElements = pages.map((src, pIdx) => {
            const proxied = `/api/proxy/image?url=${encodeURIComponent(src)}`;
            return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
                `<img src="${proxied}" alt="Page ${pIdx + 1}" loading="lazy" decoding="async" ` +
                `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:400px;background:#05070a;object-fit:contain;">` +
                `</div>`;
        }).join('');

        return `
            <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                    ${imageElements}
                </div>
            </div>`;
    } catch (e) {
        console.error('[MANGAPILL] Panel assembly error:', e.message);
        return null;
    }
}

/**
 * Fetch popular / trending titles from Mangapill homepage with valid covers
 */
async function fetchMangapillPopular() {
    try {
        const res = await fetchHtml(BASE_URL, { timeout: 8000 });
        if (res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        const list = [];
        const seenSlugs = new Set();

        $('div.grid > div, div.flex.flex-col').each((i, el) => {
            const mangaLink = $(el).find('a[href^="/manga/"]').first();
            const mangaHref = mangaLink.attr('href');
            if (!mangaHref) return;

            const parts = mangaHref.split('/').filter(Boolean);
            if (parts.length < 3) return;
            const mangaId = parts[1];
            const slug = parts[2];

            if (seenSlugs.has(slug)) return;

            const imgEl = $(el).find('img').first();
            const coverUrl = imgEl.attr('data-src') || imgEl.attr('src') || null;

            const titleText = mangaLink.text().trim() || $(el).find('.font-black, .line-clamp-2, h2, h3, .text-sm').first().text().trim() || slug.replace(/-/g, ' ');
            const rawTitle = titleText.replace(/\s+/g, ' ').trim();

            if (rawTitle.length < 2 || rawTitle.toLowerCase().startsWith('chapter')) return;

            seenSlugs.add(slug);
            const proxiedCover = coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : null;

            list.push({
                id: `mangapill-${mangaId}-${slug}`,
                mangaId: mangaId,
                slug: slug,
                title: rawTitle,
                author: 'Manga Artist',
                cover: proxiedCover,
                banner: proxiedCover,
                image: proxiedCover,
                tags: ['Action', 'Manga', 'Popular', 'Trending'],
                year: 2026,
                status: 'Ongoing',
                rating: 5,
                format: 'Manga',
                synopsis: `${rawTitle} is currently trending on Mangapill with full scanlations and high-resolution panels.`
            });
        });

        const { POPULAR_MANGA_CATALOG } = require('./mangaCatalogIndex');

        // Scrape metadata in parallel for top 12 popular items
        const enrichedList = await Promise.all(list.slice(0, 24).map(async (item, idx) => {
            // 1. Check curated catalog
            const catalogMatch = POPULAR_MANGA_CATALOG.find(c => 
                (c.mangaId && String(c.mangaId) === String(item.mangaId)) ||
                (c.slug && c.slug === item.slug) ||
                (c.title && c.title.toLowerCase() === item.title.toLowerCase())
            );

            if (catalogMatch) {
                return {
                    ...item,
                    author: catalogMatch.author || item.author,
                    synopsis: catalogMatch.synopsis || item.synopsis,
                    tags: catalogMatch.tags || (catalogMatch.genre ? [catalogMatch.genre] : item.tags),
                    year: catalogMatch.year || item.year,
                    status: catalogMatch.status || item.status,
                    genre: catalogMatch.genre || item.genre
                };
            }

            // 2. For top 10 hero banner slides, fetch genuine page metadata if not in catalog
            if (idx < 10) {
                try {
                    const mangaUrl = `${BASE_URL}/manga/${item.mangaId}/${item.slug}`;
                    const detRes = await fetchHtml(mangaUrl, { timeout: 4000 }).catch(() => null);
                    if (detRes && detRes.status === 200 && detRes.text) {
                        const $d = cheerio.load(detRes.text);
                        const realSynopsis = $d('p.text--secondary, p[class*="text--secondary"], .description').first().text().trim();
                        let realType = '';
                        let realStatus = '';
                        let realYear = '';
                        const realGenres = [];

                        $d('div.grid > div, div.flex > div, div').each((_, el) => {
                            const pText = $d(el).text().replace(/\s+/g, ' ').trim();
                            if (pText.startsWith('Type')) realType = pText.replace(/^Type\s*/i, '').trim();
                            if (pText.startsWith('Status')) realStatus = pText.replace(/^Status\s*/i, '').trim();
                            if (pText.startsWith('Year')) realYear = pText.replace(/^Year\s*/i, '').trim();
                        });

                        $d('a[href*="genre="], a[href*="/genre/"], a[href*="/mangas/genre/"]').each((_, el) => {
                            const g = $d(el).text().trim();
                            if (g && !realGenres.includes(g)) realGenres.push(g);
                        });

                        return {
                            ...item,
                            synopsis: (realSynopsis && realSynopsis.length > 30) ? realSynopsis : item.synopsis,
                            tags: realGenres.length > 0 ? realGenres : item.tags,
                            year: realYear || item.year,
                            status: realStatus || item.status,
                            format: realType ? realType.toUpperCase() : item.format
                        };
                    }
                } catch(e) {}
            }

            return item;
        }));

        return [...enrichedList, ...list.slice(24)];
    } catch (e) {
        console.error('[MANGAPILL] Error fetching popular:', e.message);
        return [];
    }
}

module.exports = {
    searchMangapill,
    fetchMangapillChapters,
    getMangapillChapterImages,
    fetchMangapillChapterPages,
    fetchMangapillPopular
};
