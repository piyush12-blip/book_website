const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const MANHWA_CACHE = new Map();

// ── 1. FAST SCRAPER VIA MGEKO CDN (Sub-second HTTP fetch) ───────────────────────
async function fetchMgekoManhwa(titleQuery) {
    const slug = titleQuery.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/^-|-$/g, '');

    const candidates = [
        `https://mgeko.cc/manga/${slug}/all-chapters/`,
        `https://mgeko.cc/manga/${slug}/`
    ];

    for (const url of candidates) {
        try {
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0' },
                timeout: 4000
            });
            const html = res.data || '';
            const $ = cheerio.load(html);
            const chapterLinks = [];

            $('a').each((i, el) => {
                const href = $(el).attr('href') || '';
                const text = $(el).text().trim();
                const m = href.match(/chapter-(\d+)/i) || text.match(/chapter\s*(\d+)/i);
                if (m) {
                    const num = parseInt(m[1], 10);
                    chapterLinks.push({ num, href: href.startsWith('http') ? href : `https://mgeko.cc${href}` });
                }
            });

            if (chapterLinks.length > 0) {
                // Deduplicate by chapter number and sort ascending (Ch 1 -> Ch Max)
                const uniqueChs = new Map();
                for (const c of chapterLinks) {
                    if (!uniqueChs.has(c.num)) uniqueChs.set(c.num, c);
                }
                const sortedNums = [...uniqueChs.keys()].sort((a, b) => a - b);
                
                console.log(`[MANHWA-ENGINE] Mgeko matched "${titleQuery}" with ${sortedNums.length} chapters!`);
                return { source: 'Mgeko', chapters: sortedNums.map(n => uniqueChs.get(n)) };
            }
        } catch(e) {}
    }
    return null;
}

// ── 2. STEALTH PUPPETEER EXTRACTOR (For Cloudflare Protected Translation Hubs) ───
let browserPromise = null;
function getBrowser() {
    if (!browserPromise) {
        browserPromise = puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserPromise;
}

async function fetchThunderscansManhwa(titleQuery) {
    const slug = titleQuery.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/^-|-$/g, '');

    const candidates = [
        `https://en-thunderscans.com/comics/${slug}/`,
        `https://en-thunderscans.com/${slug}/`
    ];

    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
        
        for (const url of candidates) {
            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                const chapterLinks = await page.evaluate(() => {
                    const links = [];
                    document.querySelectorAll('a').forEach(a => {
                        const href = a.href || '';
                        const text = a.innerText || '';
                        const m = href.match(/chapter-(\d+)/i) || text.match(/chapter\s*(\d+)/i);
                        if (m) {
                            links.push({ num: parseInt(m[1], 10), href });
                        }
                    });
                    return links;
                });

                if (chapterLinks && chapterLinks.length > 0) {
                    const uniqueChs = new Map();
                    for (const c of chapterLinks) {
                        if (!uniqueChs.has(c.num)) uniqueChs.set(c.num, c);
                    }
                    const sortedNums = [...uniqueChs.keys()].sort((a, b) => a - b);
                    console.log(`[MANHWA-ENGINE] Thunderscans matched "${titleQuery}" with ${sortedNums.length} chapters!`);
                    await page.close();
                    return { source: 'Thunderscans', chapters: sortedNums.map(n => uniqueChs.get(n)) };
                }
            } catch(e) {}
        }
        await page.close();
    } catch(e) {
        console.error('[MANHWA-ENGINE] Puppeteer error:', e.message);
    }
    return null;
}

// ── 3. FETCH IMAGE PANELS FOR A SPECIFIC CHAPTER ───────────────────────────────
async function getManhwaChapterPanels(chapterUrl) {
    if (MANHWA_CACHE.has(chapterUrl)) {
        return MANHWA_CACHE.get(chapterUrl);
    }

    try {
        // Fast path: Axios HTTP
        const res = await axios.get(chapterUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 5000
        });
        const html = res.data || '';
        const imgs = [...html.matchAll(/data-src="([^"]+)"|<img[^>]+src="([^"]+)"/gi)]
            .map(m => m[1] || m[2])
            .filter(s => /\.(jpg|png|webp|jpeg)/i.test(s) && !s.includes('logo') && !s.includes('icon') && !s.includes('avatar') && !s.includes('banner'));

        if (imgs.length >= 3) {
            MANHWA_CACHE.set(chapterUrl, imgs);
            return imgs;
        }
    } catch(e) {}

    // Fallback: Puppeteer for dynamic/protected images
    try {
        const browser = await getBrowser();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
        await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 2500));

        const imgs = await page.evaluate(() => {
            const list = [];
            document.querySelectorAll('img').forEach(img => {
                const src = img.src || img.getAttribute('data-src') || '';
                if (src && /\.(jpg|png|webp|jpeg)/i.test(src) && !src.includes('logo') && !src.includes('icon') && !src.includes('banner')) {
                    list.push(src);
                }
            });
            return list;
        });

        await page.close();
        if (imgs.length > 0) {
            MANHWA_CACHE.set(chapterUrl, imgs);
            return imgs;
        }
    } catch(e) {}

    return [];
}

// ── 4. MAIN EXPORT: BUILD FULL CHAPTER SET FOR FRONTEND ────────────────────────
async function getMasterManhwaChapters(titleQuery) {
    if (!titleQuery || titleQuery.length < 2) return null;
    const cleanQ = titleQuery.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Try Fast Mgeko first, then Thunderscans
    let result = await fetchMgekoManhwa(cleanQ);
    if (!result) {
        result = await fetchThunderscansManhwa(cleanQ);
    }

    if (!result || !result.chapters || result.chapters.length === 0) {
        return null;
    }

    const { source, chapters } = result;
    const sorted = chapters; // Return ALL full chapters (no 100 chapter cut-off)

    // Pre-fetch Chapter 1 images so reader opens instantly with 0 delay!
    const firstCh = sorted[0];
    const firstChImgs = await getManhwaChapterPanels(firstCh.href);

    const formattedChapters = sorted.map((ch, idx) => {
        const chNum = ch.num || (idx + 1);
        let panelHtml = '';

        if (idx === 0 && firstChImgs.length > 0) {
            const pages = firstChImgs.map((src, pIdx) => {
                const proxied = `/api/proxy/image?url=${encodeURIComponent(src)}`;
                return `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
                    `<img src="${proxied}" alt="${titleQuery} Ch${chNum} Page${pIdx+1}" loading="eager" decoding="async" ` +
                    `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:400px;background:#05070a;object-fit:contain;">` +
                    `</div>`;
            }).join('');

            panelHtml = `
                <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                    <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                        <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                            CHAPTER ${chNum} OF ${sorted.length}
                        </div>
                        <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${titleQuery}</h2>
                        <span style="color:#64748b;font-size:0.8rem;">${firstChImgs.length} HD Story Panels • ${source}</span>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                        ${pages}
                    </div>
                </div>`;
        } else {
            panelHtml = `
                <div class="lazy-manga-trigger" data-chapter-id="manhwa-live-${encodeURIComponent(ch.href)}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                    <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                        <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                            CHAPTER ${chNum} OF ${sorted.length}
                        </div>
                        <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${titleQuery}</h2>
                        <span style="color:#38bdf8;font-size:0.85rem;font-weight:600;">⚡ Click or scroll to load Chapter ${chNum} panels</span>
                    </div>
                </div>`;
        }

        return {
            title: `Chapter ${chNum}`,
            chapterId: `manhwa-live-${encodeURIComponent(ch.href)}`,
            html: panelHtml
        };
    });

    return formattedChapters;
}

module.exports = {
    getMasterManhwaChapters,
    getManhwaChapterPanels
};
