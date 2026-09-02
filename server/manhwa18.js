/**
 * Manhwa18.cc Autonomous Integration Scraper
 * High-speed search, 100% full chapter archive extraction, and image panel loader.
 */

const cheerio = require('cheerio');
const { stealthFetch, sleepJitter } = require('./stealthEngine');

const BASE_URL = 'https://manhwa18.cc';

const MANHWA18_SEARCH_CACHE = new Map();
const MANHWA18_CHAPTERS_CACHE = new Map();
const MANHWA18_PAGES_CACHE = new Map();

/**
 * Search Manhwa18.cc for titles
 */
async function searchManhwa18(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim().toLowerCase();

    if (MANHWA18_SEARCH_CACHE.has(cleanQ)) {
        return MANHWA18_SEARCH_CACHE.get(cleanQ);
    }

    try {
        // Generate Smart Query Variants to handle punctuation (., -, ', etc.)
        const queryVariants = [cleanQ];
        const noPunctSpace = cleanQ.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (noPunctSpace && !queryVariants.includes(noPunctSpace)) queryVariants.push(noPunctSpace);

        const strippedPunct = cleanQ.replace(/['’\.\-_]/g, '').trim();
        if (strippedPunct && !queryVariants.includes(strippedPunct)) queryVariants.push(strippedPunct);

        const singularStem = cleanQ.replace(/['’]s\b/gi, '').replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        if (singularStem && !queryVariants.includes(singularStem)) queryVariants.push(singularStem);

        const results = [];
        const seenSlugs = new Set();

        // Run search variants in parallel
        await Promise.all(queryVariants.slice(0, 3).map(async (vQ) => {
            try {
                const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(vQ)}`;
                const res = await stealthFetch(searchUrl, { type: 'html', timeout: 5000 }).catch(() => null);
                if (!res || res.status !== 200 || !res.text) return;

                const $ = cheerio.load(res.text);

                $('div.manga-item, div.story-item, div.item, article, div.thumb').each((i, el) => {
                    const linkEl = $(el).find('a[href*="/webtoon/"]').first();
                    let href = linkEl.attr('href') || '';
                    if (!href || href.includes('/chapter-')) return;

                    const slugMatch = href.match(/\/webtoon\/([^/?#]+)/);
                    if (!slugMatch) return;
                    const slug = slugMatch[1];
                    if (seenSlugs.has(slug)) return;
                    seenSlugs.add(slug);

                    // Clean title
                    const titleEl = $(el).find('h3 a, .title a, a[title]').first();
                    let rawTitle = titleEl.attr('title') || titleEl.text() || $(el).find('h3').first().text() || '';
                    rawTitle = rawTitle.replace(/18\+/g, '').replace(/Chapter\s*[\d\.]+/gi, '').replace(/\s+/g, ' ').trim();
                    if (!rawTitle || rawTitle.length < 2) {
                        rawTitle = slug.replace(/-\d+$/, '').replace(/-/g, ' ');
                    }

                    const title = rawTitle.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                    let imgUrl = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
                    if (imgUrl && imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
                    if (imgUrl && imgUrl.startsWith('/')) imgUrl = BASE_URL + imgUrl;

                    const proxiedCover = imgUrl ? `/api/proxy/image?url=${encodeURIComponent(imgUrl)}` : null;

                    results.push({
                        id: `manhwa18-${slug}`,
                        slug,
                        title,
                        author: 'Manhwa Artist',
                        cover: proxiedCover || 'burgundy',
                        image: proxiedCover,
                        lines: title.split(' ').slice(0, 3).join('<br>'),
                        genre: 'Manga & Manhwa',
                        mood: 'Manhwa (+18)',
                        pages: 50,
                        rating: 5,
                        synopsis: '',
                        hasEpub: false,
                        format: 'Manga & Manhwa',
                        _isDirectSearchMatch: true,
                        _source: 'Manhwa18'
                    });
                });
            } catch(err) {}
        }));

        MANHWA18_SEARCH_CACHE.set(cleanQ, results);
        return results;
    } catch(e) {
        console.error('[MANHWA18] Search error:', e.message);
        return [];
    }
}

/**
 * Fetch 100% complete chapters for a Manhwa18 series
 */
async function fetchManhwa18Chapters(id) {
    const slug = id.replace(/^manhwa18-/, '');
    if (!slug) return [];

    if (MANHWA18_CHAPTERS_CACHE.has(slug)) {
        return MANHWA18_CHAPTERS_CACHE.get(slug);
    }

    try {
        const seriesUrl = `${BASE_URL}/webtoon/${slug}`;
        const res = await stealthFetch(seriesUrl, { type: 'html', timeout: 7000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return [];

        const $ = cheerio.load(res.text);
        const rawChapters = [];

        const baseSlug = slug.replace(/-\d+$/, '');
        $('a[href*="/webtoon/"]').each((i, el) => {
            let href = $(el).attr('href') || '';
            if (!href.includes('/chapter-')) return;
            if (!href.includes(slug) && !href.includes(baseSlug)) return;
            if (href.startsWith('/')) href = BASE_URL + href;

            // Extract chapter number
            const numMatch = href.match(/chapter-([\d\.]+)/i);
            if (!numMatch) return;
            const chNum = parseFloat(numMatch[1]);
            if (isNaN(chNum)) return;

            let cleanTitle = `Chapter ${chNum}`;
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (text && text.toLowerCase().includes('chapter')) {
                cleanTitle = text.replace(/Read\s+(?:First|Last)/gi, '').trim();
                if (!cleanTitle.toLowerCase().includes('chapter')) cleanTitle = `Chapter ${chNum}`;
            }

            if (!rawChapters.some(c => c.chNum === chNum)) {
                rawChapters.push({
                    chNum,
                    title: cleanTitle,
                    url: href
                });
            }
        });

        // Sort ascending (Chapter 1 -> Chapter N)
        rawChapters.sort((a, b) => a.chNum - b.chNum);

        const structured = rawChapters.map(ch => ({
            id: `m18-${slug}-ch-${ch.chNum}`,
            chapterId: `m18-${slug}-ch-${ch.chNum}`,
            title: ch.title,
            chNum: ch.chNum,
            url: ch.url,
            html: `<div class="lazy-manga-trigger" data-m18-url="${encodeURIComponent(ch.url)}" data-chapter="${ch.chNum}"><p>⚡ Loading ${ch.title} panels from Manhwa18...</p></div>`
        }));

        // Scrape Rich Series Metadata
        let metaTitle = $('h1').first().text().replace(/18\+/g, '').trim();
        let altTitle = '';
        let author = '';
        let artist = '';
        let genres = [];
        let status = '';

        $('div, p, li, tr').each((i, el) => {
            const t = $(el).text().trim();
            if (t.startsWith('Alternative:')) altTitle = t.replace('Alternative:', '').trim();
            if (t.startsWith('Author(s)')) author = t.replace('Author(s)', '').trim();
            if (t.startsWith('Artist(s)')) artist = t.replace('Artist(s)', '').trim();
            if (t.startsWith('Genre(s)')) genres = t.replace('Genre(s)', '').split(/\s+/).filter(Boolean);
            if (t.startsWith('Status')) status = t.replace('Status', '').trim();
        });

        const synopsis = $('.summary, .description, .dsct, .panel-story-info-description').first().text().trim() ||
                         $('p').map((i, el) => $(el).text().trim()).get().find(t => t.length > 40 && !t.toLowerCase().includes('manhwa18')) || '';

        const finalAuthor = author || artist || 'Manhwa Artist';

        const metadata = {
            title: metaTitle,
            altTitle: altTitle,
            author: finalAuthor,
            artist: artist,
            genres: genres,
            status: status,
            synopsis: synopsis
        };

        // Prefetch first chapter images immediately
        if (structured.length > 0) {
            const panelsHtml = await getManhwa18ChapterPanels(structured[0].url).catch(() => null);
            if (panelsHtml) {
                structured[0].html = panelsHtml;
            }
        }

        structured.metadata = metadata;
        MANHWA18_CHAPTERS_CACHE.set(slug, structured);
        return structured;
    } catch(e) {
        console.error(`[MANHWA18] fetchChapters error: ${e.message}`);
        return [];
    }
}

/**
 * Extract full image panels for a Manhwa18 chapter
 */
async function getManhwa18ChapterPanels(chapterUrl) {
    if (MANHWA18_PAGES_CACHE.has(chapterUrl)) {
        return MANHWA18_PAGES_CACHE.get(chapterUrl);
    }

    try {
        const res = await stealthFetch(chapterUrl, { type: 'html', timeout: 7000 }).catch(() => null);
        if (!res || res.status !== 200 || !res.text) return null;

        const $ = cheerio.load(res.text);
        const images = [];

        $('.read-content img, .chapter-content img, #chapter-content img, img[src*=".jpg"], img[src*=".webp"], img[src*=".png"]').each((i, el) => {
            let src = $(el).attr('data-src') || $(el).attr('src') || '';
            if (src.startsWith('//')) src = 'https:' + src;
            if (src.startsWith('/')) src = BASE_URL + src;

            if (src && !images.includes(src)) {
                const sLower = src.toLowerCase();
                if (!sLower.includes('logo') && !sLower.includes('icon') && !sLower.includes('banner') && !sLower.includes('avatar') && !sLower.includes('fb') && !sLower.includes('discord')) {
                    images.push(src);
                }
            }
        });

        if (images.length === 0) return null;

        const pageDivs = images.map((src, i) => {
            const proxied = `/api/proxy/image?url=${encodeURIComponent(src)}`;
            return `
                <div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">
                    <img src="${proxied}" alt="Page ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer"
                         style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:400px;background:#05070a;object-fit:contain;">
                </div>`;
        }).join('');

        const html = `
            <div class="manga-image-scroll" style="display:flex;flex-direction:column;align-items:center;background:#000;width:100%;margin:0 auto;">
                ${pageDivs}
            </div>`;

        MANHWA18_PAGES_CACHE.set(chapterUrl, html);
        return html;
    } catch(e) {
        console.error(`[MANHWA18] Error fetching panels for ${chapterUrl}: ${e.message}`);
        return null;
    }
}

module.exports = {
    searchManhwa18,
    fetchManhwa18Chapters,
    getManhwa18ChapterPanels
};
