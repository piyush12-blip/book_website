/**
 * MangaBuddy Autonomous Integration Module
 * Real-time search, chapter scraping, and CDN panel extraction for https://mangabuddy1.co.uk
 */

const cheerio = require('./node_modules/cheerio');
const { stealthFetch, sleepJitter } = require('./stealthEngine');

const BASE_URL = 'https://mangabuddy1.co.uk';

// In-Memory Chapter, Search & Page Caches
const MANGABUDDY_SEARCH_CACHE = new Map();
const MANGABUDDY_CHAPTERS_CACHE = new Map();

function sleep(ms) {
    return sleepJitter(ms, ms + 40);
}

async function fetchHtml(url, options = {}) {
    return await stealthFetch(url, {
        ...options,
        type: 'html',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': `${BASE_URL}/home`
        }
    });
}

/**
 * Search MangaBuddy catalog via filter endpoint
 */
async function searchMangaBuddy(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim().toLowerCase();

    if (MANGABUDDY_SEARCH_CACHE.has(cleanQ)) {
        return MANGABUDDY_SEARCH_CACHE.get(cleanQ);
    }

    try {
        const searchUrl = `${BASE_URL}/filter?keyword=${encodeURIComponent(cleanQ)}`;
        const res = await fetchHtml(searchUrl, { timeout: 6000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        const results = [];
        const seenSlugs = new Set();
        const COLORS = ['navy', 'teal', 'burgundy', 'midnight', 'sage', 'rust', 'ochre', 'brown'];

        $('.comic-item, div:has(> a[href*="/series/"])').each((i, card) => {
            const seriesLinks = $(card).find('a[href*="/series/"]').filter((_, a) => {
                const href = $(a).attr('href') || '';
                return !href.includes('/chapter-') && !href.includes('/chapter_');
            });
            if (!seriesLinks.length) return;

            const mainLink = seriesLinks.last();
            const href = mainLink.attr('href') || '';
            const match = href.match(/\/series\/([^\/]+)$/);
            if (!match) return;

            const slug = match[1];
            if (seenSlugs.has(slug)) return;
            seenSlugs.add(slug);

            // Extract real title: check link text, title attribute, or inner headings
            let title = mainLink.attr('title') || mainLink.text().trim();
            if (!title || title === '18+ Show' || title === '18+') {
                seriesLinks.each((_, a) => {
                    const t = $(a).attr('title') || $(a).text().trim();
                    if (t && t !== '18+ Show' && t !== '18+' && !t.toLowerCase().includes('chapter')) {
                        title = t;
                    }
                });
            }
            if (!title) {
                const h = $(card).find('h1, h2, h3, h4, h5, .title, .name').text().trim();
                if (h) title = h;
            }
            if (title && title.includes('\n')) {
                title = title.split('\n')[0].trim();
            }
            if (!title || title.length < 2 || title.toLowerCase().includes('chapter')) return;

            // Find cover image from card or link
            let img = $(card).find('img').attr('data-src') || $(card).find('img').attr('src') || $(card).find('img').attr('data-original');
            if (img && img.startsWith('//')) img = 'https:' + img;
            else if (img && img.startsWith('/')) img = BASE_URL + img;

            const color = COLORS[results.length % COLORS.length];

            results.push({
                id: `mangabuddy-${slug}`,
                title: title,
                author: 'Manga Artist',
                cover: img ? 'has-image teal' : color,
                image: img || null,
                lines: title.split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga & Manhwa',
                mood: 'Action',
                pages: 150,
                rating: 4.8,
                synopsis: '',
                hasEpub: false,
                format: 'Manga & Manhwa',
                _isDirectSearchMatch: true,
                _source: 'MangaBuddy'
            });
        });

        // Fallback for standalone links if no .comic-item matched
        if (results.length === 0) {
            $('a[href*="/series/"]').each((i, el) => {
                const href = $(el).attr('href') || '';
                const match = href.match(/\/series\/([^\/]+)$/);
                if (!match) return;

                const slug = match[1];
                if (seenSlugs.has(slug)) return;
                seenSlugs.add(slug);

                let title = $(el).attr('title') || $(el).text().trim();
                if (title && title.includes('\n')) title = title.split('\n')[0].trim();
                if (!title || title.length < 2 || title.toLowerCase().includes('chapter') || title.includes('18+')) return;

                const color = COLORS[results.length % COLORS.length];
                results.push({
                    id: `mangabuddy-${slug}`,
                    title: title,
                    author: 'Manga Artist',
                    cover: color,
                    image: null,
                    lines: title.split(' ').slice(0, 3).join('<br>'),
                    genre: 'Manga & Manhwa',
                    mood: 'Action',
                    pages: 150,
                    rating: 4.8,
                    synopsis: '',
                    hasEpub: false,
                    format: 'Manga & Manhwa',
                    _isDirectSearchMatch: true,
                    _source: 'MangaBuddy'
                });
            });
        }

        MANGABUDDY_SEARCH_CACHE.set(cleanQ, results);
        return results;
    } catch(err) {
        console.error(`[MANGABUDDY] Search error: ${err.message}`);
        return [];
    }
}

/**
 * Fetch and parse all chapters for a MangaBuddy series
 */
async function fetchMangaBuddyChapters(id) {
    const slug = id.replace(/^mangabuddy-/, '');
    if (!slug) return [];

    if (MANGABUDDY_CHAPTERS_CACHE.has(slug)) {
        return MANGABUDDY_CHAPTERS_CACHE.get(slug);
    }

    try {
        const seriesUrl = `${BASE_URL}/series/${slug}`;
        const res = await fetchHtml(seriesUrl, { timeout: 7000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        const btn = $('#load-all-chapters-btn');
        const comicSlug = btn.attr('data-comic-slug') || slug.split('.')[0];
        const slugHash = btn.attr('data-comic-slug-hash') || slug;

        let structuredChapters = [];

        // 1. Try dedicated AJAX API for 100% complete chapters (e.g. all 200+ chapters)
        const apiUrl = `${BASE_URL}/get-chapter-list?slug=${encodeURIComponent(comicSlug)}`;
        const apiRes = await stealthFetch(apiUrl, {
            type: 'text',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': seriesUrl
            }
        }).catch(() => null);

        if (apiRes && apiRes.text) {
            try {
                const json = JSON.parse(apiRes.text);
                if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                    json.data.sort((a, b) => {
                        const numA = (a.chapter_num !== undefined && a.chapter_num !== null && !isNaN(parseFloat(a.chapter_num))) ? parseFloat(a.chapter_num) : (parseFloat((a.chapter_name || '').match(/(?:chapter|ch\.?)\s*([\d\.]+)/i)?.[1]) || 0);
                        const numB = (b.chapter_num !== undefined && b.chapter_num !== null && !isNaN(parseFloat(b.chapter_num))) ? parseFloat(b.chapter_num) : (parseFloat((b.chapter_name || '').match(/(?:chapter|ch\.?)\s*([\d\.]+)/i)?.[1]) || 0);
                        return numA - numB;
                    });
                    structuredChapters = json.data.map(ch => {
                        const chNum = (ch.chapter_num !== undefined && ch.chapter_num !== null && !isNaN(parseFloat(ch.chapter_num)))
                            ? parseFloat(ch.chapter_num)
                            : (parseFloat((ch.chapter_name || '').match(/(?:chapter|ch\.?)\s*([\d\.]+)/i)?.[1]) ?? (ch.chapter_id || 1));
                        const chSlug = ch.chapter_slug || `chapter-${chNum}`;
                        const chUrl = `${BASE_URL}/series/${slugHash}/${chSlug}`;
                        return {
                            id: `mb-${slugHash}-${chSlug}`,
                            chapterId: `mb-${slugHash}-${chSlug}`,
                            title: ch.chapter_name || `Chapter ${chNum}`,
                            chNum,
                            url: chUrl,
                            html: `<div class="lazy-manga-trigger" data-mb-url="${encodeURIComponent(chUrl)}" data-chapter="${chNum}"><p>⚡ Loading ${ch.chapter_name || `Chapter ${chNum}`} panels from MangaBuddy...</p></div>`
                        };
                    });
                }
            } catch(e) {}
        }

        // 2. Fallback to DOM parsing if API didn't return
        if (structuredChapters.length === 0) {
            const rawChapters = [];
            $('a[href*="/chapter-"], a[href*="/ch-"]').each((i, el) => {
                let chHref = $(el).attr('href') || '';
                let text = $(el).text().replace(/\s+/g, ' ').trim();
                if (!chHref) return;
                if (chHref.startsWith('/')) chHref = BASE_URL + chHref;

                const numMatch = chHref.match(/(?:chapter|ch)-([\d\.]+)/i);
                const chNum = (numMatch && !isNaN(parseFloat(numMatch[1]))) ? parseFloat(numMatch[1]) : (rawChapters.length + 1);

                let cleanTitle = `Chapter ${chNum}`;
                if (text && text.toLowerCase().includes('chapter')) {
                    cleanTitle = text
                        .replace(/\s*\d+\s*(?:minute|hour|day|month|year)s?\s*ago/gi, '')
                        .replace(/\s*•.*/g, '')
                        .replace(/\s*New\s*/gi, '')
                        .replace(/^Read\s+/i, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (!cleanTitle || !cleanTitle.toLowerCase().includes('chapter')) {
                        cleanTitle = `Chapter ${chNum}`;
                    }
                }

                const slugPartMatch = chHref.match(/\/(chapter-[\d\.]+|ch-[\d\.]+)$/i);
                const chSlugPart = slugPartMatch ? slugPartMatch[1] : `chapter-${chNum}`;

                if (!rawChapters.some(c => c.url === chHref)) {
                    rawChapters.push({
                        chNum,
                        chSlugPart,
                        title: cleanTitle,
                        url: chHref
                    });
                }
            });

            rawChapters.sort((a, b) => a.chNum - b.chNum);
            structuredChapters = rawChapters.map(ch => ({
                id: `mb-${slugHash}-${ch.chSlugPart}`,
                chapterId: `mb-${slugHash}-${ch.chSlugPart}`,
                title: ch.title,
                chNum: ch.chNum,
                url: ch.url,
                html: `<div class="lazy-manga-trigger" data-mb-url="${encodeURIComponent(ch.url)}" data-chapter="${ch.chNum}"><p>⚡ Loading ${ch.title} panels from MangaBuddy...</p></div>`
            }));
        }

        // Extract MangaBuddy rich series metadata
        let metaTitle = $('h1[itemprop="name"]').text().trim() || $('h1').last().text().trim() || slug.replace(/\.[a-zA-Z0-9]+$/, '').replace(/-/g, ' ');
        let author = '';
        let status = '';
        let type = '';
        const genres = [];

        let altTitle = '';
        $('h1, h2, div, p').each((i, el) => {
            const h = $(el).text().trim().toLowerCase();
            const parentText = $(el).parent().text().replace(/\s+/g, ' ').trim();
            if (h === 'author') author = parentText.replace(/^author\s*/i, '').trim();
            if (h === 'status') status = parentText.replace(/^status\s*/i, '').trim();
            if (h === 'type') type = parentText.replace(/^type\s*/i, '').trim();
            if (h.includes('alternative') || h.includes('other name')) {
                altTitle = parentText.replace(/^(?:alternative|other names?)\s*:?\s*/i, '').trim();
            }
        });

        $('a[href*="/genres/"], a[href*="/genre/"]').each((i, el) => {
            const g = $(el).text().trim();
            if (g && !genres.includes(g)) genres.push(g);
        });

        const synopsis = $('p').map((i, el) => $(el).text().trim()).get().find(t => 
            t.length > 30 && 
            !t.toLowerCase().includes('mangabuddy') && 
            !t.toLowerCase().includes('released') &&
            !t.toLowerCase().includes('review') &&
            !t.toLowerCase().includes('comment')
        ) || '';

        const finalAuthor = (author && author !== 'Updating' && author !== 'Unknown') ? author : 'Manga Artist';

        const metadata = {
            title: metaTitle,
            altTitle: altTitle,
            author: finalAuthor,
            status: status || 'Ongoing',
            type: type || 'Manga',
            genres: genres,
            synopsis: synopsis
        };

        // Prefetch first chapter panels immediately for instant reader opening
        if (structuredChapters.length > 0) {
            const panelsHtml = await getMangaBuddyChapterPanels(structuredChapters[0].url).catch(() => null);
            if (panelsHtml) {
                structuredChapters[0].html = panelsHtml;
            }
        }

        structuredChapters.metadata = metadata;
        MANGABUDDY_CHAPTERS_CACHE.set(slug, structuredChapters);
        return structuredChapters;
    } catch(err) {
        console.error(`[MANGABUDDY] fetchChapters error: ${err.message}`);
        return [];
    }
}

/**
 * Extract full high-res images from chapter reader page
 */
async function getMangaBuddyChapterPanels(chapterUrl) {
    try {
        const res = await fetchHtml(chapterUrl, { timeout: 8000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return null;

        const $ = cheerio.load(res.text);
        const images = [];

        $('img').each((i, el) => {
            let src = $(el).attr('data-src') || $(el).attr('src') || $(el).attr('data-original');
            if (!src) return;
            if (src.startsWith('//')) src = 'https:' + src;
            else if (src.startsWith('/')) src = BASE_URL + src;

            if (src.includes('logo') || src.includes('avatar') || src.includes('banner') || src.includes('discord') || src.includes('loading') || src.endsWith('.gif')) {
                return;
            }
            if (!images.includes(src)) images.push(src);
        });

        if (images.length === 0) return null;

        return `
        <div class="manga-image-scroll" style="display:flex;flex-direction:column;align-items:center;background:#000;width:100%;margin:0 auto;">
            ${images.map((img, idx) => `
                <img src="${img}" 
                     alt="Panel ${idx + 1}" 
                     loading="lazy"
                     style="width:100%;max-width:960px;height:auto;display:block;margin:0 auto;background:#050505;"
                     onerror="this.style.display='none';">
            `).join('')}
        </div>`;
    } catch(e) {
        return null;
    }
}

module.exports = {
    searchMangaBuddy,
    fetchMangaBuddyChapters,
    getMangaBuddyChapterPanels
};
