const axios = require('axios');
const path  = require('path');
const fs    = require('fs');

const TELEGRAM_CONFIG = {
    apiId: 35943377,
    apiHash: '19a83ba030373609f74ae66222216439'
};

const CHANNELS_CONFIG_PATH = path.join(__dirname, 'channels.json');

// ─── PRIMARY channels tried first (in order) ─────────────────────────────────
const PRIMARY_CHANNELS = ['Manga_Cruise_Updates', 'MangaCruise'];

// ─── SECONDARY channels tried if primary fails ────────────────────────────────
const SECONDARY_CHANNELS = [
    'pornhwa_flix', 'PornhwaFlix', 'pornhwa_flare', 'PornhwaFlare',
    'doujinshi_flix', 'DoujinshiFlix', 'inyeon_manhwa',
    'OngoingSkylines', 'manhwa_zone', 'manhwa_english',
    'manga_archive', 'mangahub_english'
];

function getJoinedChannels() {
    try {
        const raw = fs.readFileSync(CHANNELS_CONFIG_PATH, 'utf8');
        const config = JSON.parse(raw);
        return Array.isArray(config.joinedChannels) ? config.joinedChannels : PRIMARY_CHANNELS;
    } catch(e) {
        return [...PRIMARY_CHANNELS, ...SECONDARY_CHANNELS];
    }
}

const JOINED_MAIN_CHANNELS = getJoinedChannels();

// ─── FUZZY TITLE NORMALIZER ────────────────────────────────────────────────────
// Strips all symbols, special chars, common words so "god level assassin" matches
// "God-level Assassin, I'm the Shadow" and vice versa
function normTitle(t) {
    return (t || '')
        .toLowerCase()
        // Remove chapter markers first so they don't pollute title matching
        .replace(/\[ch[\-\s]?[\d]+\]/gi, '')
        .replace(/\[c[\d]+\]/gi, '')
        .replace(/⇉|⌯|[@#]/g, '')
        // Strip non-ASCII (Korean, Chinese, emoji, arrows)
        .replace(/[^\x00-\x7F]/g, ' ')
        // Strip ALL punctuation and symbols
        .replace(/[^a-z0-9\s]/g, ' ')
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

// Compute how well needle matches haystack (0–100)
function titleMatchScore(haystack, needle) {
    const h = normTitle(haystack);
    const n = normTitle(needle);
    if (!h || !n) return 0;
    if (h === n) return 100;
    if (h.includes(n) || n.includes(h)) return 90;

    // Keyword overlap — only ignore generic articles and prepositions
    const stopWords = new Set(['the','a','an','of','in','at','to','for','and','or','is','its','by','with']);
    const nWords = n.split(' ').filter(w => w.length > 1 && !stopWords.has(w));
    const hWords = h.split(' ').filter(w => w.length > 1 && !stopWords.has(w));
    if (!nWords.length) return 0;

    const matches = nWords.filter(w => h.includes(w)).length;
    const reverseMatches = hWords.filter(w => n.includes(w)).length;
    const fwd  = (matches / nWords.length) * 80;
    const back = hWords.length > 0 ? (reverseMatches / hWords.length) * 80 : 0;
    return Math.round(Math.max(fwd, back));
}

// ─── CHAPTER NUMBER EXTRACTOR ──────────────────────────────────────────────────
// Handles all these patterns from @Manga_Cruise_Updates / @MangaCruise:
//   [Ch-133]  [Ch-000]  [C133]  [C000]
//   ⇉[C133] ⌯ God-level Assassin...
//   Chapter 133 / Ch 133 / #133
// Returns a number like 133 or 0, or null if no chapter number found
function extractChapterNumber(text) {
    const patterns = [
        /\[ch[\-\s]?(\d+)\]/i,          // [Ch-133] [Ch 133] [Ch133]
        /\[c(\d+)\]/i,                    // [C133] [C000]
        /⇉\[c(\d+)\]/i,                  // ⇉[C133]
        /chapter[\s#\-]*(\d+)/i,          // Chapter 133 / Chapter#133
        /ch[\.\s\-#]*(\d+)/i,             // Ch.133 / Ch 133
        /#(\d+)\b/,                        // #133
        /\bep(?:isode)?[\s\-#]*(\d+)/i,   // Episode 133
        /\bvol(?:ume)?[\s\-#]*(\d+)/i,    // Volume 1 (less reliable but a fallback)
    ];
    for (const re of patterns) {
        const m = text.match(re);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

// ─── PANEL IMAGE FILTER ────────────────────────────────────────────────────────
// Only keep actual CDN manga panel images, not avatars/thumbnails/channel icons
function isRealPanelImage(url) {
    if (!url) return false;
    // Must be a Telegram CDN URL
    if (!url.includes('cdn') && !url.includes('telesco.pe') && !url.includes('telegram')) return false;
    // Skip tiny icons and avatars (usually served at very small paths or contain 'userpic')
    if (url.includes('userpic') || url.includes('thumb') || url.includes('icon')) return false;
    return true;
}

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────
const AXIOS_OPTS = {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 5000
};

async function fetchHtml(url) {
    try {
        const r = await axios.get(url, AXIOS_OPTS);
        return r.data || null;
    } catch { return null; }
}

// ─── EXTRACT ALL CHAPTER POSTS FROM SCRAPED HTML ──────────────────────────────
// Returns array of { chapterNum, title, postRef, html (panel img tags) }
function parseChapterPosts(pageHtml, channelName, titleNeedle) {
    const results = [];

    // Grab every individual message block
    const blockRe = /<div class="tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message[^"]*"[^>]*data-post="|$)/gi;
    const blocks = [...pageHtml.matchAll(blockRe)];

    for (const bm of blocks) {
        const postRef = bm[1];
        const block   = bm[0];

        // Get the plain text of this post
        const text = block.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        // Does the text mention this manga title?
        const score = titleMatchScore(text, titleNeedle);
        if (score < 40) continue;

        // Try to extract a chapter number from the post text
        const chNum = extractChapterNumber(text);
        if (chNum === null) continue; // skip posts that have no chapter number

        // Strip user profile pictures / avatars completely
        const contentOnly = block.replace(/<div class="tgme_widget_message_user"[\s\S]*?<\/div>/gi, '');
        const bgImgs  = [...contentOnly.matchAll(/background-image:\s*url\('([^']+)'\)/gi)].map(m => m[1]);
        // Reject teaser/announcement posts (single poster with promo text)
        const isAnnouncement = text.toLowerCase().includes('manga cruise') ||
                               text.toLowerCase().includes('updated') ||
                               text.toLowerCase().includes('read here') ||
                               text.toLowerCase().includes('join channel') ||
                               text.toLowerCase().includes('join request') ||
                               text.toLowerCase().includes('join main');

        if (panels.length < 2 && isAnnouncement) continue;
        if (panels.length === 0) continue;

        const panelHtml = panels.map((src, i) =>
            `<div style="text-align:center;margin:.5rem 0;">` +
            `<img src="${src}" style="max-width:100%;border-radius:4px;" alt="Panel ${i+1}" loading="lazy">` +
            `</div>`
        ).join('');

        results.push({
            chapterNum: chNum,
            title:      `Chapter ${chNum}`,
            postRef,
            html: `<div class="tg-panels" style="max-width:800px;margin:0 auto;padding:.5rem;">${panelHtml}</div>`
        });
    }

    // Deduplicate by chapter number — keep the one with more panels
    const byChNum = new Map();
    for (const r of results) {
        const existing = byChNum.get(r.chapterNum);
        if (!existing || r.html.length > existing.html.length) {
            byChNum.set(r.chapterNum, r);
        }
    }

    return [...byChNum.values()].sort((a, b) => a.chapterNum - b.chapterNum);
}

// ─── SEARCH ONE CHANNEL FOR CHAPTERS ──────────────────────────────────────────
// Tries ?q= search on the channel, parses chapter posts
async function searchChannelForChapters(channelName, titleQuery) {
    // Manga_Cruise_Updates uses the clean title without special chars for best ?q= hits
    const qTitle = normTitle(titleQuery).replace(/\s+/g, ' ').trim();

    // Try a few query variants to maximise hits
    const queries = [
        qTitle,
        qTitle.split(' ').slice(0, 3).join(' '), // first 3 words
        qTitle.split(' ').slice(0, 2).join(' ')  // first 2 words
    ];

    for (const q of queries) {
        if (!q || q.length < 3) continue;
        const url  = `https://t.me/s/${channelName}?q=${encodeURIComponent(q)}`;
        const html = await fetchHtml(url);
        if (!html) continue;

        const chapters = parseChapterPosts(html, channelName, titleQuery);
        if (chapters.length > 0) {
            console.log(`[TG] Found ${chapters.length} chapters in @${channelName} for "${titleQuery}" (query: "${q}")`);
            return chapters;
        }
    }
    return [];
}

// ─── MAIN EXPORT: GET ALL CHAPTERS + PANELS ────────────────────────────────────
// Priority: Per-title dedicated channel → Primary channels → Secondary joined → Global fallback
async function getTelegramChaptersAndPanels(titleQuery) {
    if (!titleQuery || titleQuery.trim().length < 3) return null;

    // ── PHASE 0: Look up per-title channel from the RAM index ────────────────
    // The RAM index already has the per-title channel URL extracted from the
    // announcement post. That per-title channel has ALL the actual chapter panels.
    try {
        const { TELEGRAM_INDEX, calculateMatchScore, normalizeKey } = require('./telegramIndex');
        let bestEntry = TELEGRAM_INDEX.get(normalizeKey(titleQuery));
        if (!bestEntry) {
            let highest = 0;
            for (const entry of TELEGRAM_INDEX.values()) {
                const score = calculateMatchScore(titleQuery, entry.title);
                if (score > highest && score >= 50) {
                    highest = score;
                    bestEntry = entry;
                }
            }
        }

        if (bestEntry && bestEntry.perTitleChannelUrl) {
            const perTitleChannelName = bestEntry.perTitleChannelUrl.replace(/.*t\.me\//, '').replace(/\/.*/, '');
            if (perTitleChannelName) {
                const chapters = await searchChannelForChapters(perTitleChannelName, titleQuery);
                if (chapters.length > 0) {
                    console.log(`[TG] Found ${chapters.length} story-panel chapters in dedicated channel @${perTitleChannelName} for "${titleQuery}"`);
                    return chapters;
                }
            }
        }
    } catch (e) {
        // telegramIndex not ready yet, continue
    }

    // ── PHASE 1: Primary channels (Manga_Cruise_Updates first) ──────────────
    for (const ch of PRIMARY_CHANNELS) {
        const chapters = await searchChannelForChapters(ch, titleQuery);
        if (chapters.length > 0) return chapters;
    }

    // ── PHASE 2: Secondary joined channels ──────────────────────────────────
    const joined = getJoinedChannels().filter(c => !PRIMARY_CHANNELS.includes(c));
    for (const ch of joined) {
        const chapters = await searchChannelForChapters(ch, titleQuery);
        if (chapters.length > 0) return chapters;
    }

    // ── PHASE 3: All secondary fallback channels ─────────────────────────────
    for (const ch of SECONDARY_CHANNELS) {
        if (joined.includes(ch)) continue;
        const chapters = await searchChannelForChapters(ch, titleQuery);
        if (chapters.length > 0) return chapters;
    }

    // ── PHASE 4: Nothing found anywhere ─────────────────────────────────────
    console.log(`[TG] No chapters found for "${titleQuery}" anywhere on Telegram.`);
    return null;
}

// ─── SEARCH RESULT (for the search bar) ───────────────────────────────────────
// Returns a simple list of title hits for the search UI
async function searchPrioritizedTelegram(title) {
    const norm = normTitle(title);
    if (!norm) return [];

    const allChannels = [...new Set([...PRIMARY_CHANNELS, ...getJoinedChannels(), ...SECONDARY_CHANNELS])];

    for (const ch of allChannels) {
        const url  = `https://t.me/s/${ch}?q=${encodeURIComponent(normTitle(title))}`;
        const html = await fetchHtml(url);
        if (!html) continue;

        // Look for doc titles and post texts that match
        const docMatches = [...html.matchAll(/class="tgme_widget_message_document_title"[^>]*>([^<]+)/gi)];
        for (const m of docMatches) {
            const score = titleMatchScore(m[1], title);
            if (score >= 50) {
                const cleanedTitle = normTitle(m[1]).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return [{
                    title: cleanedTitle || title,
                    channel: `@${ch}`,
                    link: `https://t.me/s/${ch}`,
                    source: 'TelegramJoined',
                    isJoined: true,
                    channelName: ch
                }];
            }
        }

        const textMatches = [...html.matchAll(/class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
        for (const m of textMatches) {
            const rawBody = m[1];
            const txt = rawBody.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            if (txt.includes('Index Channel') || txt.includes('◪') || txt.includes('Backup channel')) continue;

            const score = titleMatchScore(txt, title);
            if (score >= 50) {
                // Try clean title extractor
                let cleanExtracted = (txt.match(/Updates\s+([\s\S]+?)\s*➥/i) || txt.match(/^([\s\S]+?)\s*➥/i) || [])[1];
                if (cleanExtracted) cleanExtracted = cleanTitle(cleanExtracted);

                const finalTitle = (cleanExtracted && cleanExtracted.length >= 2 && cleanExtracted.length <= 60)
                    ? cleanExtracted
                    : normTitle(txt).split(' ').filter(w => w.length > 2).slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                if (!finalTitle || finalTitle.length < 2) continue;

                console.log(`[TELEGRAM] Priority hit in @${ch} for "${title}" → "${finalTitle}"`);
                return [{
                    title: finalTitle,
                    channel: `@${ch}`,
                    link: `https://t.me/s/${ch}`,
                    source: 'TelegramJoined',
                    isJoined: true,
                    channelName: ch
                }];
            }
        }
    }

    return [];
}

async function searchPublicTelegramChannels(title) {
    return searchPrioritizedTelegram(title);
}

async function searchChannelForTitle(channelName) {
    return `https://t.me/s/${channelName}`;
}

module.exports = {
    TELEGRAM_CONFIG,
    JOINED_MAIN_CHANNELS,
    searchPrioritizedTelegram,
    searchPublicTelegramChannels,
    searchChannelForTitle,
    getTelegramChaptersAndPanels,
    extractChapterNumber,
    titleMatchScore,
    normTitle
};
