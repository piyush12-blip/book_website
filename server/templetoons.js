/**
 * TempleToons Autonomous Integration Module
 * Real-time search, chapter scraping, and high-res WebP/JPEG panel extraction for https://templetoons.com
 */

const { stealthFetch } = require('./stealthEngine');

const BASE_URL = 'https://templetoons.com';

const TEMPLE_SEARCH_CACHE = new Map();
const TEMPLE_CHAPTERS_CACHE = new Map();
const TEMPLE_PAGES_CACHE = new Map();

async function fetchTempleJson(url, options = {}) {
    const res = await stealthFetch(url, { ...options, type: 'json' });
    try {
        const data = JSON.parse(res.text);
        return { status: res.status, headers: res.headers, data };
    } catch(e) {
        return { status: res.status, headers: res.headers, data: null, raw: res.text };
    }
}

async function fetchTempleHtml(url, options = {}) {
    return await stealthFetch(url, { ...options, type: 'html' });
}

/**
 * Search TempleToons catalog with memory cache
 */
async function searchTempleToons(query) {
    if (!query || query.trim().length < 2) return [];
    
    let cleanQ = query
        .replace(/alternative\s*names?[:\s][\s\S]*/i, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2014\u2013]/g, ' ')
        .replace(/[【】\[\]\(\)~]/g, ' ')
        .replace(/[\\\/\|;:_+*#@!]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    if (!cleanQ || cleanQ.length < 2) return [];

    if (TEMPLE_SEARCH_CACHE.has(cleanQ)) {
        return TEMPLE_SEARCH_CACHE.get(cleanQ);
    }

    try {
        const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(cleanQ)}`;
        const res = await fetchTempleJson(searchUrl, { timeout: 6000 });
        
        let projects = [];
        if (res.status === 200 && res.data && Array.isArray(res.data.projects)) {
            projects = res.data.projects;
        }

        const COLORS = ['teal', 'navy', 'burgundy', 'midnight', 'sage', 'rust', 'ochre', 'brown'];

        const mapped = projects.map((p, idx) => {
            const color = COLORS[idx % COLORS.length];
            const coverUrl = p.thumbnail || null;
            const slug = p.series_slug || p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const isAdult = !!(p.badge && p.badge.includes('+18') || p.adult);

            const proxiedCover = coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : null;

            return {
                id: `temple-${slug}`,
                title: p.title,
                author: p.author || 'Manga & Manhwa',
                cover: proxiedCover || color,
                image: proxiedCover,
                lines: (p.title || '').split(' ').slice(0, 3).join('<br>'),
                genre: isAdult ? 'Adult & Smut' : 'Manga & Manhwa',
                mood: p.badge || (isAdult ? 'Adult Manhwa +18' : 'Manga / Manhwa'),
                pages: 50,
                rating: 5,
                synopsis: p.alternative_names ? `Alternative Names: ${p.alternative_names}` : `${p.title} is available in full high-definition WebP scanlations on TempleToons.`,
                hasEpub: false,
                format: 'Manga & Manhwa'
            };
        });

        TEMPLE_SEARCH_CACHE.set(cleanQ, mapped);
        return mapped;
    } catch (e) {
        console.error('[TEMPLETOONS] Search error:', e.message);
        return [];
    }
}

/**
 * Fetch all chapters for a TempleToons series
 */
async function fetchTempleToonsChapters(slugOrId) {
    const cleanSlug = slugOrId.replace(/^temple-/, '').replace(/\s+/g, '-').toLowerCase();

    if (TEMPLE_CHAPTERS_CACHE.has(cleanSlug)) {
        return TEMPLE_CHAPTERS_CACHE.get(cleanSlug);
    }

    try {
        const comicPageUrl = `${BASE_URL}/comic/${cleanSlug}`;
        const res = await fetchTempleHtml(comicPageUrl, { timeout: 8000 });
        if (res.status !== 200) return null;

        const html = res.text;

        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const seriesTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : cleanSlug.replace(/-/g, ' ');

        // Extract all chapter slugs from page
        const chRegex = /chapter-[0-9.]+/g;
        const matches = [...html.matchAll(chRegex)].map(m => m[0]);
        const uniqueSlugs = [...new Set(matches)];

        if (uniqueSlugs.length === 0) return null;

        // Sort ascending chronologically
        uniqueSlugs.sort((a, b) => {
            const numA = parseFloat(a.replace('chapter-', '')) || 0;
            const numB = parseFloat(b.replace('chapter-', '')) || 0;
            return numA - numB;
        });

        console.log(`[TEMPLETOONS] Extracted ${uniqueSlugs.length} genuine chapters for "${cleanSlug}"`);

        // Pre-fetch Chapter 1 images for instant rendering
        const ch1Slug = uniqueSlugs[0];
        const ch1Pages = await fetchTempleToonsChapterPages(cleanSlug, ch1Slug);
        let ch1Html = '';
        if (ch1Pages.length > 0) {
            const pageImgs = ch1Pages.map((url, i) => {
                const proxied = `/api/proxy/image?url=${encodeURIComponent(url)}`;
                return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
                    `<img src="${proxied}" alt="Page ${i + 1}" loading="eager" decoding="async" referrerpolicy="no-referrer" ` +
                    `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:500px;background:#000;object-fit:contain;">` +
                    `</div>`;
            }).join('');

            ch1Html = `
                <div style="background:#000;min-height:100vh;padding:0;margin:0 0 2rem 0;">
                    <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                        ${pageImgs}
                    </div>
                </div>`;
        }

        const chapters = uniqueSlugs.map((chSlug, idx) => {
            const chNum = chSlug.replace('chapter-', '');
            const chName = `Chapter ${chNum}`;
            let panelHtml = '';
            const triggerKey = `temple-ch-${encodeURIComponent(`${cleanSlug}/${chSlug}`)}`;

            if (idx === 0 && ch1Html) {
                panelHtml = ch1Html;
            } else {
                panelHtml = `
                    <div class="lazy-manga-trigger" data-chapter-id="${triggerKey}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                        <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                            <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                ${chName.toUpperCase()}
                            </div>
                            <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${seriesTitle.toUpperCase()}</h2>
                            <span style="color:#38bdf8;font-size:0.85rem;font-weight:600;">⚡ Click or scroll to load ${chName} panels</span>
                        </div>
                    </div>`;
            }

            return {
                title: chName,
                chapterId: triggerKey,
                html: panelHtml
            };
        });

        TEMPLE_CHAPTERS_CACHE.set(cleanSlug, chapters);
        return chapters;
    } catch (e) {
        console.error(`[TEMPLETOONS] Error fetching chapters for ${cleanSlug}:`, e.message);
        return null;
    }
}

/**
 * Fetch image panel URLs for a specific chapter
 */
async function fetchTempleToonsChapterPages(seriesSlug, chapterSlug) {
    const cacheKey = `${seriesSlug}/${chapterSlug}`;
    if (TEMPLE_PAGES_CACHE.has(cacheKey)) {
        return TEMPLE_PAGES_CACHE.get(cacheKey);
    }

    try {
        const apiUrl = `${BASE_URL}/api/comic/${seriesSlug}/${chapterSlug}`;
        const res = await fetchTempleJson(apiUrl, { timeout: 8000 });
        
        let panelUrls = [];
        if (res.status === 200 && res.data && res.data.chapter_data && Array.isArray(res.data.chapter_data.images)) {
            panelUrls = res.data.chapter_data.images.map(img => typeof img === 'string' ? img : (img.url || img.src || ''));
        }

        const cleanUrls = panelUrls.filter(u => !!u && u.startsWith('http'));
        if (cleanUrls.length > 0) {
            TEMPLE_PAGES_CACHE.set(cacheKey, cleanUrls);
        }

        return cleanUrls;
    } catch (e) {
        console.error(`[TEMPLETOONS] Error fetching pages for ${cacheKey}:`, e.message);
        return [];
    }
}

/**
 * Lazy chapter loader for TempleToons triggers
 */
async function getTempleToonsChapterImages(chapterTriggerId) {
    if (!chapterTriggerId.startsWith('temple-ch-')) return null;
    const rawKey = decodeURIComponent(chapterTriggerId.replace('temple-ch-', ''));
    const parts = rawKey.split('/');
    if (parts.length < 2) return null;
    const [seriesSlug, chapterSlug] = parts;

    const pages = await fetchTempleToonsChapterPages(seriesSlug, chapterSlug);
    if (!pages || pages.length === 0) {
        return `<div style="padding:2rem;text-align:center;color:#94a3b8;"><p>Chapter panels currently loading or not uploaded yet.</p></div>`;
    }

    const imgs = pages.map((src, i) => {
        const proxied = `/api/proxy/image?url=${encodeURIComponent(src)}`;
        return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
            `<img src="${proxied}" alt="Page ${i + 1}" loading="lazy" decoding="async" referrerpolicy="no-referrer" ` +
            `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:500px;background:#000;object-fit:contain;">` +
            `</div>`;
    }).join('');

    return `
        <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
            <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                ${imgs}
            </div>
        </div>`;
}

module.exports = {
    searchTempleToons,
    fetchTempleToonsChapters,
    fetchTempleToonsChapterPages,
    getTempleToonsChapterImages
};
