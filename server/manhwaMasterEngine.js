const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const MANHWA_CACHE = new Map();

function isGenuineTitleMatch(query, candidateTitle, candidateUrl) {
    const cleanQ = (query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanCand = (candidateTitle || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanUrl = (candidateUrl || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (cleanCand.includes(cleanQ) || cleanQ.includes(cleanCand)) return true;
    if (cleanUrl.includes(cleanQ.replace(/\s+/g, '-'))) return true;

    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'of', 'in', 'a', 'an', 'to', 'is', 'i', 'my', 'as', 's']);
    const qWords = cleanQ.split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));
    if (qWords.length === 0) return false;

    const candWords = new Set((cleanCand + ' ' + cleanUrl).split(/\s+/));
    let matched = 0;
    for (const w of qWords) {
        if (candWords.has(w)) matched++;
    }

    if (qWords.length <= 2) return matched === qWords.length;
    return (matched / qWords.length) >= 0.65;
}

// ── 0. DYNAMIC ACCURATE SCRAPER VIA MANGAKATANA (100% Genuine Title Matching) ────
async function fetchMangaKatanaManhwa(titleQuery) {
    const cleanQ = (titleQuery || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanQ || cleanQ.length < 2) return null;

    const searchTerms = [
        cleanQ.replace(/\s+/g, '-'),
        cleanQ.replace(/\s+/g, '+')
    ];

    for (const sTerm of searchTerms) {
        try {
            const sUrl = `https://mangakatana.com/?search=${sTerm}`;
            const sRes = await axios.get(sUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                timeout: 6000
            });
            const $ = cheerio.load(sRes.data);

            // 1. Direct comic detail page (when redirected to /manga/...)
            const heading = $('h1.heading').text().trim();
            const altName = $('.alt_name').text().trim();
            const directChs = [];
            $('.chapters .chapter a, .chapter a').each((i, el) => {
                const href = $(el).attr('href') || '';
                const text = $(el).text().trim();
                const m = href.match(/\/c([0-9.]+)/i) || text.match(/chapter\s*([0-9.]+)/i);
                if (m) directChs.push({ num: parseFloat(m[1]), href, text });
            });

            if (heading && directChs.length > 0 && isGenuineTitleMatch(cleanQ, heading + ' ' + altName, sRes.request?.res?.responseUrl || '')) {
                const uniqueMap = new Map();
                for (const c of directChs) {
                    if (!uniqueMap.has(c.num)) uniqueMap.set(c.num, c);
                }
                const sortedNums = [...uniqueMap.keys()].sort((a, b) => a - b);
                console.log(`[MANHWA-ENGINE] MangaKatana (Direct) verified "${heading}" for query "${titleQuery}" (${sortedNums.length} chapters)`);
                return { source: 'MangaKatana', chapters: sortedNums.map(n => uniqueMap.get(n)) };
            }

            // 2. Search results list with smart precision ranking
            const candidates = [];
            $('.item').each((i, el) => {
                const a = $(el).find('h3 a, .title a').first();
                const href = a.attr('href');
                const title = a.text().trim();
                const alt = $(el).text().trim();
                if (href && title && isGenuineTitleMatch(cleanQ, title + ' ' + alt, href)) {
                    let score = 50;
                    const cLow = title.toLowerCase().trim();
                    if (cLow === cleanQ) score = 1000;
                    else if (href.toLowerCase().includes(`/${cleanQ.replace(/\s+/g, '-')}.`)) score = 900;
                    else if (cLow.startsWith(cleanQ)) score = 500 - (cLow.length - cleanQ.length);
                    else score = 100 - Math.abs(cLow.length - cleanQ.length);
                    candidates.push({ href, title, score });
                }
            });

            candidates.sort((a, b) => b.score - a.score);
            const matchedItem = candidates.length > 0 ? candidates[0] : null;

            if (matchedItem) {
                const detRes = await axios.get(matchedItem.href, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                    timeout: 6000
                });
                const $d = cheerio.load(detRes.data);
                const dHeading = $d('h1.heading').text().trim() || matchedItem.title;
                const dChs = [];
                $d('.chapters .chapter a, .chapter a').each((i, el) => {
                    const href = $(el).attr('href') || '';
                    const text = $(el).text().trim();
                    const m = href.match(/\/c([0-9.]+)/i) || text.match(/chapter\s*([0-9.]+)/i);
                    if (m) dChs.push({ num: parseFloat(m[1]), href, text });
                });

                if (dChs.length > 0) {
                    const uniqueMap = new Map();
                    for (const c of dChs) {
                        if (!uniqueMap.has(c.num)) uniqueMap.set(c.num, c);
                    }
                    const sortedNums = [...uniqueMap.keys()].sort((a, b) => a - b);
                    console.log(`[MANHWA-ENGINE] MangaKatana verified "${dHeading}" for query "${titleQuery}" (${sortedNums.length} chapters)`);
                    return { source: 'MangaKatana', chapters: sortedNums.map(n => uniqueMap.get(n)) };
                }
            }
        } catch(e) {}
    }
    return null;
}

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
            const pageTitle = $('h1').first().text().trim();
            if (pageTitle && !isGenuineTitleMatch(titleQuery, pageTitle, url)) {
                continue;
            }

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
                const uniqueChs = new Map();
                for (const c of chapterLinks) {
                    if (!uniqueChs.has(c.num)) uniqueChs.set(c.num, c);
                }
                const sortedNums = [...uniqueChs.keys()].sort((a, b) => a - b);
                
                console.log(`[MANHWA-ENGINE] Mgeko verified "${pageTitle || titleQuery}" with ${sortedNums.length} chapters!`);
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
                const pageTitle = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
                if (pageTitle && !isGenuineTitleMatch(titleQuery, pageTitle, url)) {
                    continue;
                }

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
                    console.log(`[MANHWA-ENGINE] Thunderscans verified "${pageTitle || titleQuery}" with ${sortedNums.length} chapters!`);
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
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://mangakatana.com/' },
            timeout: 6000
        });

        // 1. Check MangaKatana thzq array
        const m = res.data.match(/var\s+thzq\s*=\s*\[([\s\S]*?)\];/);
        if (m) {
            const urls = [...m[1].matchAll(/'(https:\/\/[^']+)'/g)].map(x => x[1]);
            if (urls.length > 0) {
                MANHWA_CACHE.set(chapterUrl, urls);
                return urls;
            }
        }

        // 2. Generic HTML img tags
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

async function getMasterManhwaChapters(titleQuery) {
    if (!titleQuery || titleQuery.length < 2) return null;
    
    // Split multi-alias titles (e.g., "Return of the Mount Hua Sect || Return of the Flowery Mountain Sect")
    const aliases = (titleQuery || '')
        .split(/\s*\|\|\s*|\s*\|\s*|\s*\/\s*/)
        .map(a => a.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase())
        .filter(a => a.length >= 2);

    if (aliases.length === 0) {
        aliases.push(titleQuery.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim());
    }

    let result = null;
    for (const q of aliases) {
        result = await fetchMangaKatanaManhwa(q);
        if (result) break;
        result = await fetchMgekoManhwa(q);
        if (result) break;
        result = await fetchThunderscansManhwa(q);
        if (result) break;
    }

    if (!result || !result.chapters || result.chapters.length === 0) {
        return null;
    }

    const { source, chapters } = result;
    const sorted = chapters; // Return ALL full chapters (no chapter cut-off)

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
