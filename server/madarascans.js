/**
 * MadaraScans Autonomous Integration Module (Stealth & DNS Bypass Enhanced)
 * Real-time search, chapter scraping, and WebP panel extraction for https://madarascans.org
 */

const { stealthFetch, sleepJitter } = require('./stealthEngine');

const BASE_URL = 'https://madarascans.org';

const MADARA_SEARCH_CACHE = new Map();
const MADARA_CHAPTERS_CACHE = new Map();
const MADARA_PAGES_CACHE = new Map();

function sleep(ms) {
    return sleepJitter(ms, ms + 50);
}

async function fetchMadara(url, options = {}) {
    const isImage = url.includes('/wp-content/uploads/') || url.endsWith('.webp') || url.endsWith('.jpg') || url.endsWith('.png');
    const type = isImage ? 'image' : 'html';
    return await stealthFetch(url, { ...options, type });
}

/**
 * Search MadaraScans catalog with memory cache and smart query segmentation
 */
async function searchMadaraScans(query) {
    if (!query || query.trim().length < 2) return [];
    
    // Normalize unicode punctuation and smart quotes
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

    if (MADARA_SEARCH_CACHE.has(cleanQ)) {
        return MADARA_SEARCH_CACHE.get(cleanQ);
    }

    try {
        // Collect query variations to search: full cleaned query + primary title segment if long
        const queriesToTry = [cleanQ];
        const words = cleanQ.split(/\s+/);
        if (words.length > 5) {
            // Also try the first 5-6 core words
            queriesToTry.push(words.slice(0, 5).join(' '));
        }

        const allResults = [];
        const seenSlugs = new Set();

        for (const qTry of queriesToTry) {
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(qTry)}&post_type=wp-manga`;
            const res = await fetchMadara(searchUrl, { timeout: 6000 });
            if (res.status !== 200) continue;

            const html = res.text;
            const linkRegex = /<a[^>]+href=["'](https:\/\/madarascans\.org\/series\/([^"'\/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = linkRegex.exec(html)) !== null) {
                const slug = m[2];
                if (seenSlugs.has(slug) || slug === 'series') continue;
                seenSlugs.add(slug);

                const inner = m[3];
                const imgMatch = inner.match(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
                const titleMatch = inner.match(/<(?:h[1-6]|span|strong)[^>]*>([^<]+)<\/(?:h[1-6]|span|strong)>/i)
                    || [null, inner.replace(/<[^>]+>/g, '').trim()];

                let rawTitle = (titleMatch[1] || '').trim() || slug.replace(/-/g, ' ');
                const formattedTitle = rawTitle.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const coverImage = imgMatch ? imgMatch[1] : null;

                allResults.push({
                    slug,
                    title: formattedTitle,
                    coverImage
                });
            }

            // If we found results on the first attempt, no need to query further
            if (allResults.length > 0) break;
        }

        const results = allResults;

        const COLORS = ['teal', 'navy', 'burgundy', 'midnight', 'sage', 'rust', 'ochre', 'brown'];

        const mapped = results.map((s, idx) => {
            const color = COLORS[idx % COLORS.length];
            const coverUrl = s.coverImage ? (s.coverImage.startsWith('http') ? s.coverImage : `${BASE_URL}${s.coverImage}`) : null;

            return {
                id: `madara-${s.slug}`,
                title: s.title,
                author: 'Manga / Manhwa',
                cover: coverUrl ? `has-image ${color}` : color,
                image: coverUrl ? `/api/proxy/image?url=${encodeURIComponent(coverUrl)}` : null,
                lines: (s.title || '').split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga & Manhwa',
                mood: 'Action / Fantasy',
                pages: 50,
                rating: 5,
                synopsis: `${s.title} is available in full high-definition WebP scanlations.`,
                hasEpub: false,
                format: 'Manga & Manhwa'
            };
        });

        MADARA_SEARCH_CACHE.set(cleanQ, mapped);
        return mapped;
    } catch (e) {
        console.error('[MADARASCANS] Search error:', e.message);
        return [];
    }
}

/**
 * Fetch chapter images for a specific MadaraScans chapter URL
 */
async function fetchMadaraScansChapterPages(chUrl) {
    if (MADARA_PAGES_CACHE.has(chUrl)) {
        return MADARA_PAGES_CACHE.get(chUrl);
    }

    try {
        await sleep(Math.floor(Math.random() * 100) + 50);

        const res = await fetchMadara(chUrl, { timeout: 8000 });
        if (res.status !== 200) return [];

        const html = res.text;
        const images = [...html.matchAll(/<img[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["']/gi)].map(m => m[1]);
        const cleanPages = images.filter(src => {
            const s = src.toLowerCase();
            return !s.includes('logo') && !s.includes('icon') && !s.includes('avatar') && !s.includes('emoji') && !s.includes('wp-content/themes/') && !s.includes('discord');
        });

        const uniquePages = [...new Set(cleanPages)];
        if (uniquePages.length > 0) {
            MADARA_PAGES_CACHE.set(chUrl, uniquePages);
        }

        return uniquePages;
    } catch (e) {
        console.error(`[MADARASCANS] Error fetching chapter pages for ${chUrl}:`, e.message);
        return [];
    }
}

/**
 * Build full chapter list for MadaraScans series
 */
async function fetchMadaraScansChapters(seriesIdOrSlug) {
    const cleanSlug = seriesIdOrSlug.replace(/^madara-/, '').replace(/\s+/g, '-').toLowerCase();

    if (MADARA_CHAPTERS_CACHE.has(cleanSlug)) {
        return MADARA_CHAPTERS_CACHE.get(cleanSlug);
    }

    try {
        const seriesUrl = `${BASE_URL}/series/${cleanSlug}/`;
        const res = await fetchMadara(seriesUrl, { timeout: 8000 });
        if (res.status !== 200) return null;

        const html = res.text;

        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<]+)<\/title>/i);
        const seriesTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : cleanSlug.replace(/-/g, ' ');

        const chItemRegex = /<a[^>]+href=["'](https:\/\/madarascans\.org\/[^"']+)["'][^>]*class=["'][^"']*ch-main-anchor[^"']*["'][\s\S]*?<span[^>]*class=["'][^"']*ch-num[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
        const chaptersList = [];
        let cm;
        while ((cm = chItemRegex.exec(html)) !== null) {
            const chUrl = cm[1].trim();
            const chName = cm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            chaptersList.push({ chUrl, chName });
        }

        if (chaptersList.length === 0) {
            const fallbackRegex = /<a[^>]+href=["'](https:\/\/madarascans\.org\/[^"']*(?:chapter|ch-)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
            while ((cm = fallbackRegex.exec(html)) !== null) {
                const chUrl = cm[1].trim();
                const chName = cm[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                if (!chaptersList.some(c => c.chUrl === chUrl) && !chUrl.includes('/series/')) {
                    chaptersList.push({ chUrl, chName: chName || 'Chapter' });
                }
            }
        }

        chaptersList.reverse();

        console.log(`[MADARASCANS] Extracted ${chaptersList.length} genuine chapters for "${cleanSlug}"`);

        if (chaptersList.length === 0) return null;

        const ch1Pages = await fetchMadaraScansChapterPages(chaptersList[0].chUrl);
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

        const chapters = chaptersList.map((ch, idx) => {
            const chNum = idx + 1;
            let panelHtml = '';
            const encUrl = encodeURIComponent(ch.chUrl);

            if (idx === 0 && ch1Html) {
                panelHtml = ch1Html;
            } else {
                panelHtml = `
                    <div class="lazy-manga-trigger" data-chapter-id="madara-ch-${encUrl}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                        <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                            <div style="display:inline-block;background:#16a34a;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                ${ch.chName.toUpperCase()}
                            </div>
                            <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${seriesTitle.toUpperCase()}</h2>
                            <span style="color:#4ade80;font-size:0.85rem;font-weight:600;">⚡ Click or scroll to load ${ch.chName} panels</span>
                        </div>
                    </div>`;
            }

            return {
                title: ch.chName || `Chapter ${chNum}`,
                chapterId: `madara-ch-${encUrl}`,
                html: panelHtml
            };
        });

        MADARA_CHAPTERS_CACHE.set(cleanSlug, chapters);
        return chapters;
    } catch (e) {
        console.error(`[MADARASCANS] fetchMadaraScansChapters error for "${seriesIdOrSlug}":`, e.message);
        return null;
    }
}

/**
 * Lazy chapter loader for MadaraScans triggers
 */
async function getMadaraScansChapterImages(chapterTriggerId) {
    if (!chapterTriggerId.startsWith('madara-ch-')) return null;
    const rawUrl = decodeURIComponent(chapterTriggerId.replace('madara-ch-', ''));

    const pages = await fetchMadaraScansChapterPages(rawUrl);
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
    searchMadaraScans,
    fetchMadaraScansChapters,
    fetchMadaraScansChapterPages,
    getMadaraScansChapterImages
};
