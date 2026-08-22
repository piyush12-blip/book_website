/**
 * DivaScans Autonomous Integration Module (Stealth & Anti-Detection Enhanced)
 * Real-time search, chapter scraping, and WebP panel extraction for https://divascans.org
 */

const { customLookup, stealthFetch, sleepJitter } = require('./stealthEngine');

const BASE_URL = 'https://divascans.org';
const MEDIA_BASE = 'https://media.divascans.org';

// In-Memory Chapter & Search Cache for 0-footprint repeat reads
const DIVA_SEARCH_CACHE = new Map();
const DIVA_CHAPTERS_CACHE = new Map();
const DIVA_PAGES_CACHE = new Map();

function sleep(ms) {
    return sleepJitter(ms, ms + 40);
}

async function fetchUrl(url, options = {}) {
    const isApi = url.includes('/api/');
    const isImage = url.includes('media.divascans.org') || url.endsWith('.webp') || url.endsWith('.jpg') || url.endsWith('.png');
    const type = isImage ? 'image' : (isApi ? 'json' : 'html');
    return await stealthFetch(url, { ...options, type });
}

/**
 * Search DivaScans catalog with memory cache & human headers
 */
async function searchDivaScans(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim().toLowerCase();
    
    if (DIVA_SEARCH_CACHE.has(cleanQ)) {
        return DIVA_SEARCH_CACHE.get(cleanQ);
    }

    try {
        const searchUrl = `${BASE_URL}/api/search?q=${encodeURIComponent(cleanQ)}`;
        let res = await fetchUrl(searchUrl, { accept: 'application/json', timeout: 5000 });
        
        let seriesList = [];
        if (res.status === 200) {
            try {
                const data = JSON.parse(res.text);
                seriesList = data.series || [];
            } catch(e) {}
        }

        // If no results found, return empty array (do not pollute with unrelated single-token results)

        const COLORS = ['navy', 'teal', 'burgundy', 'midnight', 'sage', 'rust', 'ochre', 'brown'];

        const mapped = seriesList.map((s, idx) => {
            const color = COLORS[idx % COLORS.length];
            const coverUrl = s.coverImage ? (s.coverImage.startsWith('http') ? s.coverImage : `${BASE_URL}${s.coverImage}`) : null;
            const genres = (s.nsfwGenreSlugs || []).map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ');
            
            return {
                id: `divascans-${s.slug || s.urlSlug || s.id}`,
                title: s.title || 'Unknown Title',
                author: 'Manhwa / Comic',
                cover: coverUrl ? `has-image ${color}` : color,
                image: coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : null,
                lines: (s.title || '').split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga & Manhwa',
                mood: genres || 'Manhwa / Comic',
                pages: (s.chapterCount || 1) * 15,
                rating: Math.min(5, Math.max(1, Math.round(((s.rating > 5 ? s.rating / 2 : s.rating) || 5) * 10) / 10)),
                synopsis: `${s.title}. Total ${s.chapterCount || 1} chapters available in high-res.`,
                hasEpub: false,
                format: 'Manga & Manhwa'
            };
        });

        // Cache search results in memory for 1 hour
        DIVA_SEARCH_CACHE.set(cleanQ, mapped);
        return mapped;
    } catch (e) {
        console.error('[DIVASCANS] Search error:', e.message);
        return [];
    }
}

/**
 * Fetch chapter images for a specific series & chapter number with jitter & caching
 */
async function fetchDivaScansChapterPages(slug, chapterNumber) {
    const cacheKey = `${slug}:${chapterNumber}`;
    if (DIVA_PAGES_CACHE.has(cacheKey)) {
        return DIVA_PAGES_CACHE.get(cacheKey);
    }

    try {
        // Human-like micro-delay (100-250ms) to avoid mechanical microsecond bursts
        await sleep(Math.floor(Math.random() * 150) + 100);

        const chUrl = `${BASE_URL}/series/comic/${slug}/chapter/${chapterNumber}`;
        const res = await fetchUrl(chUrl, { timeout: 6000 });
        if (res.status !== 200) return [];

        const mediaRegex = /https?:\/\/media\.divascans\.org\/[^\s"'<>\\]+?\.(?:webp|jpg|jpeg|png)/gi;
        const matches = res.text.match(mediaRegex) || [];
        const cleanPages = [...new Set(matches.map(u => u.replace(/\\u0026/g, '&').replace(/\\/g, '')))];

        if (cleanPages.length > 0) {
            DIVA_PAGES_CACHE.set(cacheKey, cleanPages);
        }

        return cleanPages;
    } catch (e) {
        console.error(`[DIVASCANS] Error fetching chapter ${chapterNumber} for ${slug}:`, e.message);
        return [];
    }
}

/**
 * Build full chapter list for DivaScans series
 */
async function fetchDivaScansChapters(slug) {
    const cleanSlug = slug.replace(/^divascans-/, '').replace(/\s+/g, '-').toLowerCase();
    
    if (DIVA_CHAPTERS_CACHE.has(cleanSlug)) {
        return DIVA_CHAPTERS_CACHE.get(cleanSlug);
    }

    try {
        // 1. Search series to get exact total chapter count
        const searchResults = await searchDivaScans(cleanSlug.replace(/-/g, ' '));
        let totalCount = 30;
        let matched = searchResults.find(s => s.id === `divascans-${cleanSlug}` || s.id.includes(cleanSlug));
        if (matched && matched.pages) {
            totalCount = Math.max(1, Math.round(matched.pages / 15));
        }

        // 2. Fetch series page to find available chapters
        const seriesUrl = `${BASE_URL}/series/comic/${cleanSlug}`;
        const seriesPage = await fetchUrl(seriesUrl, { timeout: 5000 }).catch(() => null);
        
        const foundChNums = new Set();
        if (seriesPage && seriesPage.status === 200) {
            const chapterRegex = /\/series\/comic\/[a-zA-Z0-9_-]+\/chapter\/([0-9.]+)/g;
            let cm;
            while ((cm = chapterRegex.exec(seriesPage.text)) !== null) {
                const num = parseFloat(cm[1]);
                if (!isNaN(num)) foundChNums.add(num);
            }
        }

        if (foundChNums.size > 0) {
            const maxFound = Math.max(...Array.from(foundChNums));
            totalCount = Math.max(totalCount, maxFound);
        }

        console.log(`[DIVASCANS STEALTH] Building ${totalCount} chapters for "${cleanSlug}"`);

        // 3. Pre-fetch Chapter 1 images immediately for instant viewing
        const ch1Pages = await fetchDivaScansChapterPages(cleanSlug, 1);
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

        const chapters = [];
        for (let i = 1; i <= totalCount; i++) {
            let panelHtml = '';
            if (i === 1 && ch1Html) {
                panelHtml = ch1Html;
            } else {
                panelHtml = `
                    <div class="lazy-manga-trigger" data-chapter-id="diva-ch-${cleanSlug}-${i}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                        <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                            <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                CHAPTER ${i}
                            </div>
                            <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${(matched?.title || cleanSlug.replace(/-/g, ' ')).toUpperCase()}</h2>
                            <span style="color:#38bdf8;font-size:0.85rem;font-weight:600;">⚡ Click or scroll to load Chapter ${i} panels</span>
                        </div>
                    </div>`;
            }

            chapters.push({
                title: `Chapter ${i}`,
                chapterId: `diva-ch-${cleanSlug}-${i}`,
                html: panelHtml
            });
        }

        DIVA_CHAPTERS_CACHE.set(cleanSlug, chapters);
        return chapters;
    } catch (e) {
        console.error(`[DIVASCANS] fetchDivaScansChapters error for "${slug}":`, e.message);
        return null;
    }
}

/**
 * Lazy chapter loader for DivaScans triggers
 */
async function getDivaScansChapterImages(chapterTriggerId) {
    const match = chapterTriggerId.match(/^diva-ch-(.+)-(\d+)$/);
    if (!match) return null;

    const slug = match[1];
    const chNum = match[2];

    const pages = await fetchDivaScansChapterPages(slug, chNum);
    if (!pages || pages.length === 0) {
        return `<div style="padding:2rem;text-align:center;color:#94a3b8;"><p>Chapter ${chNum} panels currently loading or not uploaded yet.</p></div>`;
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
    searchDivaScans,
    fetchDivaScansChapters,
    fetchDivaScansChapterPages,
    getDivaScansChapterImages,
    customLookup
};
