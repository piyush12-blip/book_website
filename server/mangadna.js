/**
 * MangaDNA Autonomous Integration Module
 */

const cheerio = require('cheerio');
const { stealthFetch, sleepJitter } = require('./stealthEngine');

const BASE_URL = 'https://mangadna.com';

const MANGADNA_SEARCH_CACHE = new Map();
const MANGADNA_CHAPTERS_CACHE = new Map();

async function fetchHtml(url, options = {}) {
    return await stealthFetch(url, {
        ...options,
        type: 'html',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'text/html,application/xhtml+xml',
            'Referer': BASE_URL
        }
    });
}

async function searchMangaDNA(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim().toLowerCase();

    if (MANGADNA_SEARCH_CACHE.has(cleanQ)) {
        return MANGADNA_SEARCH_CACHE.get(cleanQ);
    }

    try {
        const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(cleanQ)}`;
        const res = await fetchHtml(searchUrl, { timeout: 6000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        const results = [];
        const seenSlugs = new Set();
        const COLORS = ['navy', 'teal', 'burgundy', 'midnight', 'sage', 'rust', 'ochre', 'brown'];

        // MangaDNA uses .home-item cards for search results
        $('.home-item, .series-box, .manga-item').each((i, card) => {
            const mainLink = $(card).find('a[href*="/manga/"]').first();
            const href = mainLink.attr('href') || '';
            const match = href.match(/\/manga\/([^\/]+)$/);
            if (!match) return;

            const slug = match[1];
            if (seenSlugs.has(slug)) return;
            seenSlugs.add(slug);

            let title = mainLink.text().trim() || mainLink.attr('title') || $(card).find('.title, h3').text().trim();
            if (!title) return;

            let img = $(card).find('img').attr('src') || $(card).find('img').attr('data-src');
            if (img && img.startsWith('/')) img = BASE_URL + img;

            const color = COLORS[results.length % COLORS.length];

            results.push({
                id: `mangadna-${slug}`,
                title: title,
                author: 'Manga Artist',
                cover: img ? `/api/proxy/image?url=${encodeURIComponent(img)}` : color,
                image: img ? `/api/proxy/image?url=${encodeURIComponent(img)}` : null,
                lines: title.split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga & Manhwa',
                mood: 'Action',
                pages: 150,
                rating: 4.8,
                synopsis: '',
                hasEpub: false,
                format: 'Manga & Manhwa',
                _isDirectSearchMatch: true,
                _source: 'MangaDNA'
            });
        });

        // Fallback for standalone links
        if (results.length === 0) {
            $('a').each((i, el) => {
                const href = $(el).attr('href') || '';
                const match = href.match(/\/manga\/([^\/]+)$/);
                if (!match) return;

                const slug = match[1];
                if (seenSlugs.has(slug)) return;
                seenSlugs.add(slug);

                let title = $(el).attr('title') || $(el).text().trim();
                if (!title || title.toLowerCase().includes('chapter')) return;

                const color = COLORS[results.length % COLORS.length];
                results.push({
                    id: `mangadna-${slug}`,
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
                    _source: 'MangaDNA'
                });
            });
        }

        MANGADNA_SEARCH_CACHE.set(cleanQ, results);
        return results;
    } catch(err) {
        return [];
    }
}

async function fetchMangaDNAChapters(id) {
    const slug = id.replace(/^mangadna-/, '');
    if (!slug) return [];

    if (MANGADNA_CHAPTERS_CACHE.has(slug)) {
        return MANGADNA_CHAPTERS_CACHE.get(slug);
    }

    try {
        const seriesUrl = `${BASE_URL}/manga/${slug}`;
        const res = await fetchHtml(seriesUrl, { timeout: 7000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        let structuredChapters = [];

        // MangaDNA chapters - strictly match chapters belonging to this series slug
        $(`a[href*="/manga/${slug}/chapter-"]`).each((i, el) => {
            let chHref = $(el).attr('href') || '';
            let text = $(el).text().replace(/\s+/g, ' ').trim();
            if (!chHref) return;
            if (chHref.startsWith('/')) chHref = BASE_URL + chHref;

            const numMatch = chHref.match(/chapter-([\d\.]+)/i);
            const chNum = numMatch ? parseFloat(numMatch[1]) : (structuredChapters.length + 1);

            let cleanTitle = `Chapter ${chNum}`;
            if (text && text.toLowerCase().includes('chapter')) {
                cleanTitle = text.replace(/\s+/g, ' ').trim();
            }

            if (!structuredChapters.some(c => c.url === chHref)) {
                structuredChapters.push({
                    id: `mdna-${slug}-ch-${chNum}`,
                    chapterId: `mdna-${slug}-ch-${chNum}`,
                    title: cleanTitle,
                    chNum,
                    url: chHref,
                    html: `<div class="lazy-manga-trigger" data-mdna-url="${encodeURIComponent(chHref)}" data-chapter="${chNum}"><p>⚡ Loading panels from MangaDNA...</p></div>`
                });
            }
        });

        structuredChapters.sort((a, b) => a.chNum - b.chNum);

        // Metadata extraction from MangaDNA DOM
        let metaTitle = $('h1').first().text().trim() || slug.replace(/-/g, ' ');
        let author = '';
        let artist = '';
        let status = 'Ongoing';
        let type = 'Manga';
        const genres = [];

        // Parse key-value items from .post-content_item
        $('.post-content_item').each((i, el) => {
            const full = $(el).text().replace(/\s+/g, ' ').trim();
            const lower = full.toLowerCase();
            if (lower.includes('author')) {
                author = full.replace(/^author:?\s*/i, '').replace(/^author\(s\):?\s*/i, '').trim();
            } else if (lower.includes('artist')) {
                artist = full.replace(/^artist:?\s*/i, '').replace(/^artist\(s\):?\s*/i, '').trim();
            } else if (lower.includes('status')) {
                status = full.replace(/^status:?\s*/i, '').trim();
            } else if (lower.includes('type')) {
                type = full.replace(/^type:?\s*/i, '').trim();
            }
        });

        // Parse genres from tags and links
        $('.genres-content a, a[href*="/genre/"], a[href*="/genres/"]').each((i, el) => {
            const g = $(el).text().trim();
            if (g && !genres.includes(g)) genres.push(g);
        });

        // Parse genuine synopsis from .dsct or .panel-story-description
        let synopsis = $('.dsct').text().trim() || $('.panel-story-description').text().replace(/^Summary\s*/i, '').trim() || $('.description, .synopsis, .summary').first().text().trim() || '';

        // Extract high-res cover image from detail page
        let coverImg = $('.summary_image img, .manga-info-pic img, .manga-poster img').first().attr('src') || $('.summary_image img').first().attr('data-src');
        if (coverImg && coverImg.startsWith('/')) coverImg = BASE_URL + coverImg;

        const metadata = {
            title: metaTitle,
            author: (author && author !== 'Unknown') ? author : (artist || 'Manga Artist'),
            artist: artist || '',
            status: status || 'Ongoing',
            type: type || 'Manga',
            genres: genres,
            synopsis: synopsis,
            image: coverImg || null
        };

        structuredChapters.metadata = metadata;
        MANGADNA_CHAPTERS_CACHE.set(slug, structuredChapters);
        return structuredChapters;
    } catch(err) {
        return [];
    }
}

async function getMangaDNAChapterPanels(chapterUrl) {
    try {
        const res = await fetchHtml(chapterUrl, { timeout: 8000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return null;

        const $ = cheerio.load(res.text);
        const images = [];

        $('.chapter-content img, .reader-area img, .reading-content img').each((i, el) => {
            let src = $(el).attr('data-src') || $(el).attr('src') || $(el).attr('data-original');
            if (!src) return;
            if (src.startsWith('//')) src = 'https:' + src;
            else if (src.startsWith('/')) src = BASE_URL + src;
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
    searchMangaDNA,
    fetchMangaDNAChapters,
    getMangaDNAChapterPanels
};
