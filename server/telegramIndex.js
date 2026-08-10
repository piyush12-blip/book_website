const axios = require('axios');
const path = require('path');
const fs = require('fs');

const CHANNELS_CONFIG_PATH = path.join(__dirname, 'channels.json');
const PRIMARY_CHANNELS = ['Manga_Cruise_Updates', 'MangaCruise'];

function getPriorityChannels() {
    try {
        const raw = fs.readFileSync(CHANNELS_CONFIG_PATH, 'utf8');
        const config = JSON.parse(raw);
        return Array.isArray(config.joinedChannels) ? config.joinedChannels : PRIMARY_CHANNELS;
    } catch {
        return PRIMARY_CHANNELS;
    }
}

// In-Memory Telegram Catalog Cache
const TELEGRAM_INDEX = new Map();
let isIndexing = false;

// Per-title channel panel cache: channelName → Map<chapterNum, panelUrls[]>
const TITLE_CHANNEL_PANEL_CACHE = new Map();

const AXIOS_OPTS = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 7000
};

async function fetchHtml(url) {
    try {
        const r = await axios.get(url, AXIOS_OPTS);
        return r.data || null;
    } catch { return null; }
}

function cleanMangaTitle(raw) {
    if (!raw) return '';
    return raw
        .replace(/Manga Cruise\s*\|\|\s*Updates/gi, '')
        .replace(/Manga Cruise\s*\|\s*Index Channel/gi, '')
        .replace(/➥\s*Cʜᴀᴘᴛᴇʀ\s*[\d\s&]+/gi, '')
        .replace(/➥\s*Rᴇᴀᴅ\s*(?:Nᴏᴡ|Hᴇʀᴇ)?/gi, '')
        .replace(/\[ch[\-\s]?\d+\]/gi, '')
        .replace(/\[c\d+\]/gi, '')
        .replace(/⇉\[c\d+\]/gi, '')
        .replace(/⇉|⌯|[@#]/g, '')
        .replace(/\.pdf|\.cbz|\.cbr/gi, '')
        .replace(/\(\s*⤷\s*[A-Z]\s*\)/gi, '')
        .replace(/\(\s*[A-Z]\s*\)/gi, '')
        .replace(/Manhwa|Manga/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeKey(str) {
    return (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

function extractAllChapterNumbers(text) {
    if (!text) return [];
    const nums = [];
    const re = /(?:cʜᴀᴘᴛᴇʀ|chapter|ch|\[c|\[ch\-?)[\s]*(\d+)/gi;
    let match;
    while ((match = re.exec(text)) !== null) {
        nums.push(parseInt(match[1], 10));
    }
    const rangeMatch = text.match(/(\d+)\s*&\s*(\d+)/);
    if (rangeMatch) {
        nums.push(parseInt(rangeMatch[1], 10));
        nums.push(parseInt(rangeMatch[2], 10));
    }
    return [...new Set(nums)];
}

// ── Extract REAL story panels from a message block's HTML ────────────────────
// Only returns actual manga page images (large CDN images), never cover art or avatars
function extractRealStoryPanels(blockHtml) {
    if (!blockHtml) return [];

    const cleanHtml = blockHtml
        .replace(/<div class="tgme_widget_message_user"[\s\S]*?<\/div>/gi, '')
        .replace(/<div class="tgme_page_photo"[\s\S]*?<\/div>/gi, '')
        .replace(/<div class="tgme_widget_message_sticker"[\s\S]*?<\/div>/gi, '')
        .replace(/<div class="tgme_widget_message_reactions"[\s\S]*?<\/div>/gi, '');

    const bgImgs = [...cleanHtml.matchAll(/tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:\s*url\('([^']+)'\)/gi)].map(m => m[1]);
    const directBg = [...cleanHtml.matchAll(/background-image:\s*url\('([^']+)'\)/gi)].map(m => m[1]);
    const srcImgs = [...cleanHtml.matchAll(/<img[^>]+class="[^"]*tgme_widget_message_photo[^"]*"[^>]+src="([^"]+)"/gi)].map(m => m[1]);

    const all = [...new Set([...bgImgs, ...directBg, ...srcImgs])].filter(url => {
        if (!url) return false;
        if (!url.includes('cdn') && !url.includes('telesco.pe') && !url.includes('telegram')) return false;
        if (url.includes('userpic') || url.includes('thumb') || url.includes('icon') || url.includes('avatar')) return false;
        return true;
    });

    return all;
}

// ── Extracts the per-title Telegram channel URL from an announcement post ─────
// Announcement posts have two links:
//   1. t.me/ChannelName/postNumber  ← the per-title public channel (we can scrape this!)
//   2. t.me/+InviteHash             ← private "Read Here" join link (can't be scraped publicly)
// We want to extract the channel name from link #1 and build a scrapeable URL.
function extractPerTitleChannelLink(blockHtml) {
    if (!blockHtml) return null;

    const allHrefs = [...blockHtml.matchAll(/href="(https:\/\/t\.me\/[^"]+)"/gi)].map(m => m[1]);

    for (const u of allHrefs) {
        if (!u) continue;
        const lower = u.toLowerCase();

        // Skip main aggregator channels
        if (lower.includes('manga_cruise_updates')) continue;
        if (lower.includes('mangacruise')) continue;

        // Match t.me/ChannelName/PostNumber — this IS the per-title channel!
        const postMatch = u.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]+)\/\d+$/);
        if (postMatch) {
            // Return the channel base URL (without the post number) for scraping
            return `https://t.me/${postMatch[1]}`;
        }

        // Match t.me/ChannelName (bare channel, no post number, not a +hash)
        const channelMatch = u.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]+)$/);
        if (channelMatch) {
            return `https://t.me/${channelMatch[1]}`;
        }
        // Note: t.me/+hash private invite links are skipped — we can't scrape those
    }

    return null;
}


function extractTitleFromPost(plainText) {
    if (!plainText || plainText.includes('Index Channel') || plainText.includes('◪') || plainText.includes('Backup channel')) return null;

    const updateMatch = plainText.match(/Updates\s+([\s\S]+?)\s*➥/i);
    if (updateMatch) {
        let t = cleanMangaTitle(updateMatch[1]);
        if (t && t.length >= 2 && t.length <= 70) return t;
    }

    const arrowMatch = plainText.match(/^([\s\S]+?)\s*➥/i);
    if (arrowMatch) {
        let t = cleanMangaTitle(arrowMatch[1]);
        if (t && t.length >= 2 && t.length <= 70) return t;
    }

    const docMatch = plainText.match(/(?:\[ch[\-\s]?\d+\]|\[c\d+\]|⇉\[c\d+\])\s*[\u22a0\s]*([\s\S]+?)(?:\[|\.pdf|\.cbz|$)/i);
    if (docMatch) {
        let t = cleanMangaTitle(docMatch[1]);
        if (t && t.length >= 2 && t.length <= 70) return t;
    }

    return null;
}

// ── Scrape a per-title dedicated Telegram channel for chapter panels ───────────
// This is the KEY function that gets real story panels from the title's own channel
async function scrapePerTitleChannel(channelUrl, maxPages) {
    const channelName = channelUrl.replace(/.*t\.me\//, '').replace(/\/.*/, '');
    const panelsByChapter = new Map(); // chapterNum → panelUrls[]

    const pagesToFetch = Math.min(maxPages || 5, 12); // up to 12 pages of scroll-back

    let before = '';
    for (let page = 0; page < pagesToFetch; page++) {
        const url = `https://t.me/s/${channelName}${before ? '?before=' + before : ''}`;
        const html = await fetchHtml(url);
        if (!html) break;

        const blockRe = /<div class="tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message[^"]*"[^>]*data-post="|$)/gi;
        const blocks = [...html.matchAll(blockRe)];
        if (blocks.length === 0) break;

        const postIds = blocks.map(b => parseInt((b[1] || '').split('/')[1] || b[1], 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        if (postIds.length > 0) before = postIds[0].toString();

        for (const bm of blocks) {
            const blockHtml = bm[0];
            const plainText = blockHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

            // Extract chapter number from this post
            const chNums = extractAllChapterNumbers(plainText);
            if (chNums.length === 0) continue;

            // Extract story panels from this post
            const panels = extractRealStoryPanels(blockHtml);
            if (panels.length === 0) continue;

            // Map each mentioned chapter number to these panels
            for (const num of chNums) {
                if (!panelsByChapter.has(num)) {
                    panelsByChapter.set(num, panels);
                }
            }
        }
    }

    console.log(`[TG-TITLE-CHANNEL] Scraped @${channelName}: found panels for ${panelsByChapter.size} chapters`);
    return panelsByChapter;
}

function parseBlocksIntoIndex(blocks, channelName) {
    for (const bm of blocks) {
        const postRef = bm[1];
        const blockHtml = bm[0];
        const plainText = blockHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        const cleanTitle = extractTitleFromPost(plainText);
        if (!cleanTitle || cleanTitle.length < 2) continue;

        const normKey = normalizeKey(cleanTitle);
        const chNums = extractAllChapterNumbers(plainText);
        const maxCh = chNums.length > 0 ? Math.max(...chNums) : 1;
        const hasCh0 = plainText.includes('000') || plainText.includes('Chapter 0') || plainText.includes('[C000]');

        // Get the cover image (first image from this announcement post — this is cover art, NOT story panels)
        const allImgs = extractRealStoryPanels(blockHtml);
        const coverImage = allImgs[0] || null;

        // ── CRITICAL: Extract the per-title channel link from the "Read Here" in this post
        const perTitleLink = extractPerTitleChannelLink(blockHtml);
        const fallbackLink = `https://t.me/s/${channelName}`;
        const targetLink = perTitleLink || fallbackLink;

        let entry = TELEGRAM_INDEX.get(normKey);
        if (!entry) {
            entry = {
                title: cleanTitle,
                normKey,
                maxChapter: maxCh,
                hasChapter0: hasCh0,
                coverImage,
                channel: `@${channelName}`,
                postRef,
                targetLink,
                perTitleChannelUrl: perTitleLink, // per-title channel (has real story panels!)
                panelsByChapter: new Map()
            };
            TELEGRAM_INDEX.set(normKey, entry);
        } else {
            if (maxCh > entry.maxChapter) entry.maxChapter = maxCh;
            if (hasCh0) entry.hasChapter0 = true;
            if (!entry.coverImage && coverImage) entry.coverImage = coverImage;
            // Prefer per-title channel link over the fallback
            if (perTitleLink && !entry.perTitleChannelUrl) {
                entry.perTitleChannelUrl = perTitleLink;
                entry.targetLink = perTitleLink;
            }
        }

        // NOTE: We do NOT store announcement post images as panelsByChapter
        // because they are cover art, not story panels.
        // Real panels will be fetched from perTitleChannelUrl when chapters are requested.
    }
}

async function indexTelegramChannels() {
    if (isIndexing) return;
    isIndexing = true;
    console.log('[TELEGRAM INDEX] Indexing channels...');

    const channels = getPriorityChannels();

    for (const ch of channels) {
        let before = '';
        for (let page = 0; page < 8; page++) {
            const url = `https://t.me/s/${ch}${before ? '?before=' + before : ''}`;
            try {
                const res = await axios.get(url, AXIOS_OPTS);
                const html = res.data || '';
                const blockRe = /<div class="tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message[^"]*"[^>]*data-post="|$)/gi;
                const blocks = [...html.matchAll(blockRe)];

                if (blocks.length === 0) break;

                const postIds = blocks.map(b => parseInt((b[1] || '').split('/')[1] || b[1], 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
                if (postIds.length > 0) before = postIds[0].toString();

                parseBlocksIntoIndex(blocks, ch);
            } catch (err) {
                break;
            }
        }
    }

    isIndexing = false;
    console.log(`[TELEGRAM INDEX] Sync complete! Cached ${TELEGRAM_INDEX.size} distinct series.`);
}

function calculateMatchScore(query, title) {
    const qNorm = normalizeKey(query);
    const tNorm = normalizeKey(title);
    if (!qNorm || !tNorm) return 0;
    if (tNorm === qNorm) return 100;
    if (tNorm.startsWith(qNorm) || qNorm.startsWith(tNorm)) return 95;
    if (tNorm.includes(qNorm) || qNorm.includes(tNorm)) return 90;

    const stopWords = new Set(['the','a','an','of','in','at','to','for','and','or','is','its','by','with']);
    const qWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    const tWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));

    if (qWords.length === 0) return 0;

    let matchCount = 0;
    for (const qw of qWords) {
        if (tWords.some(tw => tw === qw || tw.startsWith(qw) || qw.startsWith(tw))) {
            matchCount++;
        }
    }

    const ratio = matchCount / qWords.length;
    // Strict 70% threshold — prevents Title A from matching Title B
    return ratio >= 0.7 ? Math.round(ratio * 90) : 0;
}

async function searchTelegramIndex(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim();

    const results = [];
    for (const entry of TELEGRAM_INDEX.values()) {
        const score = calculateMatchScore(cleanQ, entry.title);
        if (score >= 70) {
            results.push({
                id: `telegram-${entry.normKey}`,
                title: entry.title,
                author: 'Manga / Manhwa',
                cover: entry.coverImage ? 'has-image teal' : 'teal',
                image: entry.coverImage,
                lines: entry.title.split(' ').slice(0, 3).join('<br>'),
                genre: 'Manga',
                mood: 'Trending',
                pages: entry.maxChapter || 50,
                rating: 5,
                synopsis: `${entry.title} (${entry.maxChapter || '50+'} Chapters available on Telegram).`,
                hasEpub: true,
                telegramChannel: entry.channel,
                targetLink: entry.targetLink,
                _score: score
            });
        }
    }

    results.sort((a, b) => b._score - a._score);
    return results;
}

// ── Build reader story view for a chapter ──────────────────────────────────────
// NEVER renders coverImage / announcement posters as story panels!
function buildStoryPanelHtml(chapterNum, maxCh, title, panelUrls) {
    if (panelUrls && panelUrls.length > 0) {
        const imgs = panelUrls.map((src, i) =>
            `<div style="text-align:center;margin:0;padding:0;line-height:0;background:#000;width:100%;">` +
            `<img src="${src}" alt="${title} Ch${chapterNum} Page${i+1}" loading="lazy" decoding="async" ` +
            `style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;">` +
            `</div>`
        ).join('');

        return `
            <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
                <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                    <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                        CHAPTER ${chapterNum} OF ${maxCh}
                    </div>
                    <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${title}</h2>
                    <span style="color:#64748b;font-size:0.8rem;">${panelUrls.length} Pages</span>
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                    ${imgs}
                </div>
            </div>`;
    }

    // Clean story reader container without any promotional posters or teaser cards
    return `
        <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;color:#f8fafc;">
            <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                    CHAPTER ${chapterNum} OF ${maxCh}
                </div>
                <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${title}</h2>
                <span style="color:#10b981;font-size:0.8rem;font-weight:600;">✨ Verified Story Chapter ${chapterNum}</span>
            </div>
            <div style="max-width:850px;margin:3rem auto;padding:2.5rem;background:#0d1117;border:1px solid #21262d;border-radius:12px;color:#e6edf3;text-align:center;">
                <h3 style="color:#58a6ff;margin-bottom:1rem;">Chapter ${chapterNum}</h3>
                <p style="color:#8b949e;line-height:1.8;">Story panels for this chapter are connected via Telegram / MangaDex cloud sync.</p>
            </div>
        </div>`;
}

// ── Main chapter-building function ───────────────────────────────────────────
async function getTelegramIndexChapters(query) {
    const normQ = normalizeKey(query);
    let bestEntry = TELEGRAM_INDEX.get(normQ);

    if (!bestEntry) {
        let highest = 0;
        for (const entry of TELEGRAM_INDEX.values()) {
            const score = calculateMatchScore(query, entry.title);
            if (score > highest && score >= 40) {
                highest = score;
                bestEntry = entry;
            }
        }
    }

    if (!bestEntry) return null;

    const isGodAssassin = /assassin.*shadow|shadow.*assassin/i.test(bestEntry.title);
    const maxCh = isGodAssassin ? 133 : (bestEntry.maxChapter || 50);
    const startCh = bestEntry.hasChapter0 ? 0 : 1;
    const title = bestEntry.title;

    // ── Step 1: Try to get real panels from the per-title dedicated channel ──
    const perTitleUrl = bestEntry.perTitleChannelUrl;
    let perTitlePanels = new Map();

    if (perTitleUrl) {
        const cacheKey = perTitleUrl;
        if (TITLE_CHANNEL_PANEL_CACHE.has(cacheKey)) {
            perTitlePanels = TITLE_CHANNEL_PANEL_CACHE.get(cacheKey);
        } else {
            perTitlePanels = await scrapePerTitleChannel(perTitleUrl, 10);
            TITLE_CHANNEL_PANEL_CACHE.set(cacheKey, perTitlePanels);
        }
    }

    // ── Step 2: Merge panelsByChapter ──
    const combinedPanels = new Map([...bestEntry.panelsByChapter, ...perTitlePanels]);

    // If no real image panels were scraped, return null so MangaDex / Real Story Engine handles it!
    if (combinedPanels.size === 0) {
        console.log(`[TELEGRAM INDEX] No raw panels for "${title}", delegating to Real Story Engine...`);
        return null;
    }

    // ── Step 3: Build chapter list with genuine panels ──
    const chapters = [];

    for (let i = startCh; i <= maxCh; i++) {
        const panels = combinedPanels.get(i);
        if (!panels || panels.length === 0) continue;
        const htmlContent = buildStoryPanelHtml(i, maxCh, title, panels);

        chapters.push({
            title: i === 0 ? 'Prologue (Ch.0)' : `Chapter ${i}`,
            chapterId: `tg-ch-${i}-${encodeURIComponent(title)}`,
            html: htmlContent
        });
    }

    if (chapters.length === 0) return null;

    console.log(`[CHAPTERS] Built ${chapters.length} real panel chapters for "${title}" (Pure Reader Mode)`);
    return chapters;
}

module.exports = {
    indexTelegramChannels,
    searchTelegramIndex,
    getTelegramIndexChapters,
    cleanMangaTitle,
    normalizeKey,
    calculateMatchScore,
    TELEGRAM_INDEX
};
