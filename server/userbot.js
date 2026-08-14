/**
 * ENI Userbot Engine v2 — Full GramJS Private Channel Reader
 * 
 * Architecture (now correct):
 * 1. Search Manga Horizon (index channel) for a title → get announcement post
 * 2. Extract the "JOIN NOW TO READ IT" invite link from the inline button
 * 3. Join that specific per-title reading channel via the invite hash
 * 4. Pull all photo messages from that reading channel = actual chapter images
 * 5. Cache channel IDs so repeated reads are instant (no re-join needed)
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const fs = require('fs');
const path = require('path');

const API_ID   = 35943377;
const API_HASH = '19a83ba030373609f74ae66222216439';
const SESSION_PATH = path.join(__dirname, 'tg_session.txt');

// Manga Horizon index channel (where announcements + invite buttons are posted)
const MANGA_HORIZON_ID = BigInt(-1002745849013);

// Cache: normalized title → { channelId, inviteHash, photos[] }
const CHAPTER_CHANNEL_CACHE = new Map();

// ── Singleton client ──────────────────────────────────────────────────────────
let _client  = null;
let _ready   = false;
let _booting = false;

function loadSession() {
    try {
        const str = fs.readFileSync(SESSION_PATH, 'utf8').trim();
        return new StringSession(str);
    } catch {
        return new StringSession('');
    }
}

async function getClient() {
    if (_ready && _client) return _client;
    if (_booting) {
        await new Promise(r => setTimeout(r, 3000));
        return _client;
    }
    _booting = true;
    try {
        _client = new TelegramClient(loadSession(), API_ID, API_HASH, {
            connectionRetries: 5,
            retryDelay: 1000,
            autoReconnect: true,
            useWSS: false,
        });
        await _client.connect();
        _ready = true;
        console.log('[USERBOT] Connected to Telegram as Charith — private channels unlocked!');
    } catch (e) {
        console.error('[USERBOT] Connection failed:', e.message);
        _ready  = false;
        _client = null;
    }
    _booting = false;
    return _client;
}

// ── Normalize for matching ────────────────────────────────────────────────────
function norm(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Channel Configuration ──────────────────────────────────────────────────
const TIER_1_MAIN_CHANNELS = [
    { name: 'Manga_Horizon', id: BigInt(-1002745849013) },
    { name: 'Manga_Cruise_Updates', username: 'Manga_Cruise_Updates' },
    { name: 'Manhwa_Ocean_Updates', username: 'Manhwa_Ocean_Updates' },
    { name: 'Romance_Manhwa_Archive', username: 'Romance_Manhwa_Archive' }
];

const TIER_2_REMAINING_CHANNELS = [
    { name: 'Manhwa_Cruise', username: 'Manhwa_Cruise' },
    { name: 'pornhwa_flix', username: 'pornhwa_flix' },
    { name: 'pornhwa_flare', username: 'pornhwa_flare' },
    { name: 'doujinshi_flix', username: 'doujinshi_flix' },
    { name: 'inyeon_manhwa', username: 'inyeon_manhwa' },
    { name: 'manga_archive', username: 'manga_archive' }
];

// Resolved channel peer cache
const CHANNEL_PEER_CACHE = new Map();

async function getChannelPeer(client, chConfig) {
    const key = chConfig.name;
    if (CHANNEL_PEER_CACHE.has(key)) return CHANNEL_PEER_CACHE.get(key);
    try {
        let peer = null;
        if (chConfig.id) {
            peer = await client.getInputEntity(chConfig.id);
        } else if (chConfig.username) {
            peer = await client.getInputEntity(chConfig.username);
        }
        if (peer) {
            CHANNEL_PEER_CACHE.set(key, peer);
            return peer;
        }
    } catch (e) {
        console.warn(`[USERBOT] Failed to resolve peer for ${chConfig.name}:`, e.message);
    }
    return null;
}

// ── Normalize for matching ────────────────────────────────────────────────────
function norm(str) {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isAccurateTitleMatch(query, title) {
    const stopWords = new Set(['in', 'of', 'the', 'a', 'an', 'to', 'and', 'for', 'with', 'on', 'at', 'is', 'by']);
    const cleanQ = (query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const cleanT = (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();

    if (!cleanQ || !cleanT) return false;
    if (cleanQ === cleanT) return true;

    const qTokens = cleanQ.split(/\s+/).filter(w => w.length > 1 && !stopWords.has(w));
    const tTokens = new Set(cleanT.split(/\s+/).filter(w => w.length > 1));

    if (qTokens.length === 0) return false;

    // Every key token in the query MUST exist in the candidate title
    for (const token of qTokens) {
        if (!tTokens.has(token) && !cleanT.includes(token)) {
            return false;
        }
    }
    return true;
}

function titleScore(query, title) {
    const cleanQ = (query || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
    const cleanT = (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();

    if (!cleanQ || !cleanT) return 0;
    if (cleanQ === cleanT) return 100;

    if (!isAccurateTitleMatch(query, title)) return 0;

    if (cleanT.startsWith(cleanQ)) return 95;
    if (cleanT.includes(cleanQ)) return 85;

    return 75;
}

// ── Extract invite hash or channel handle from Telegram message markup ──────
function extractInviteHash(msg) {
    if (!msg) return null;
    try {
        // 1. Check replyMarkup inline buttons
        const rows = msg.replyMarkup?.rows || [];
        for (const row of rows) {
            for (const btn of row.buttons || []) {
                const url = btn.url || '';
                const m = url.match(/t\.me\/\+([A-Za-z0-9_\-]+)/) ||
                          url.match(/t\.me\/joinchat\/([A-Za-z0-9_\-]+)/);
                if (m) return m[1];
                const pub = url.match(/t\.me\/([A-Za-z0-9_]+)(?:\/\d+)?/);
                if (pub && !['share', 'joinchat'].includes(pub[1])) return `@${pub[1]}`;
            }
        }

        // 2. Check message entities (MessageEntityTextUrl / MessageEntityUrl)
        const entities = msg.entities || [];
        for (const ent of entities) {
            const url = ent.url || '';
            const m = url.match(/t\.me\/\+([A-Za-z0-9_\-]+)/) ||
                      url.match(/t\.me\/joinchat\/([A-Za-z0-9_\-]+)/);
            if (m) return m[1];
            const pub = url.match(/t\.me\/([A-Za-z0-9_]+)(?:\/\d+)?/);
            if (pub && !['share', 'joinchat'].includes(pub[1])) return `@${pub[1]}`;
        }

        // 3. Check raw text
        const text = msg.message || '';
        const m = text.match(/t\.me\/\+([A-Za-z0-9_\-]+)/) ||
                  text.match(/t\.me\/joinchat\/([A-Za-z0-9_\-]+)/);
        if (m) return m[1];
    } catch {}
    return null;
}

// ── Join a channel via invite hash / handle and return its entity ─────────────
async function joinChannelByHash(client, inviteTarget) {
    if (!inviteTarget) return null;
    try {
        // Handle public handle (e.g. @blue_lock_mc)
        if (inviteTarget.startsWith('@')) {
            const clean = inviteTarget.replace('@', '');
            const entity = await client.getEntity(clean);
            if (entity) {
                const fullId = -(1000000000000 + Number(entity.id));
                return { id: BigInt(fullId), title: entity.title || clean };
            }
        }

        // Check if already joined via invite hash
        const info = await client.invoke(new Api.messages.CheckChatInvite({ hash: inviteTarget }));
        if (info.className === 'ChatInviteAlready' && info.chat) {
            const fullId = -(1000000000000 + Number(info.chat.id));
            console.log(`[USERBOT] Already in "${info.chat.title}" (ID: ${fullId})`);
            return { id: BigInt(fullId), title: info.chat.title };
        }
        // Join
        const joined = await client.invoke(new Api.messages.ImportChatInvite({ hash: inviteTarget }));
        const chat = joined.chats?.[0];
        if (chat) {
            const fullId = -(1000000000000 + Number(chat.id));
            console.log(`[USERBOT] Joined "${chat.title}" (ID: ${fullId})`);
            return { id: BigInt(fullId), title: chat.title };
        }
    } catch (e) {
        if (e.message?.includes('USER_ALREADY_PARTICIPANT')) {
            console.log(`[USERBOT] Already participant for hash ${inviteTarget}`);
        } else {
            console.error(`[USERBOT] Join error for target ${inviteTarget}:`, e.message);
        }
    }
    return null;
}

// ── Search a specific channel with Dual Workers (Search + Post Title Scanner) ──
async function searchSingleChannel(client, chConfig, query) {
    try {
        const peer = await getChannelPeer(client, chConfig);
        if (!peer) return [];

        // Dual Engine: Run Worker A (In-Channel Search) + Worker B (Post Title Scanner) concurrently
        const [searchRes, historyRes] = await Promise.all([
            // Worker A: Native In-Channel Search
            client.invoke(new Api.messages.Search({
                peer, q: query,
                filter: new Api.InputMessagesFilterEmpty(),
                minDate: 0, maxDate: 0, offsetId: 0, addOffset: 0,
                limit: 10, maxId: 0, minId: 0, hash: BigInt(0)
            })).catch(() => ({ messages: [] })),

            // Worker B: Direct Post Title Scanner
            client.invoke(new Api.messages.GetHistory({
                peer,
                offsetId: 0, offsetDate: 0, addOffset: 0,
                limit: 40, maxId: 0, minId: 0, hash: BigInt(0)
            })).catch(() => ({ messages: [] }))
        ]);

        const combinedMsgs = [...(searchRes.messages || []), ...(historyRes.messages || [])];
        const seenIds = new Set();
        const results = [];

        for (const msg of combinedMsgs) {
            if (seenIds.has(msg.id)) continue;
            seenIds.add(msg.id);

            const text = msg.message || '';
            const rawTitle = text.split('\n')[0].split('|')[0].replace(/[─\-|➤►▶]/g, '').trim();
            const cleanTitle = rawTitle.replace(/[^\x00-\x7F]/g, ' ').replace(/\s+/g, ' ').trim();
            const score = titleScore(query, cleanTitle);
            if (score < 40) continue;

            const inviteHash = extractInviteHash(msg);

            results.push({
                source: 'private_tg',
                channelName: chConfig.name,
                messageId: msg.id,
                inviteHash,
                title: cleanTitle || query,
                text: text.substring(0, 300),
                score,
                date: msg.date
            });
        }
        return results;
    } catch (e) {
        return [];
    }
}

// ── PUBLIC API: Search Tier 1 Main Channels (then Tier 2 Remaining) ──────────
async function searchPrivateChannels(query) {
    const client = await getClient();
    if (!client || !_ready) return [];

    const cacheKey = norm(query);

    try {
        // Step 1: Search Tier 1 Main Channels concurrently in parallel (<300ms)
        const tier1Promises = TIER_1_MAIN_CHANNELS.map(ch => searchSingleChannel(client, ch, query));
        const tier1Results = (await Promise.all(tier1Promises)).flat();

        if (tier1Results.length > 0) {
            tier1Results.sort((a, b) => b.score - a.score);
            console.log(`[USERBOT TIER 1] Found "${tier1Results[0].title}" in ${tier1Results[0].channelName} (Score: ${tier1Results[0].score})`);

            for (const r of tier1Results) {
                if (r.inviteHash) {
                    CHAPTER_CHANNEL_CACHE.set(cacheKey, { inviteHash: r.inviteHash, photos: null });
                }
            }
            return tier1Results;
        }

        // Step 2: If not found in Tier 1, search Tier 2 Remaining Channels
        const tier2Promises = TIER_2_REMAINING_CHANNELS.map(ch => searchSingleChannel(client, ch, query));
        const tier2Results = (await Promise.all(tier2Promises)).flat();

        if (tier2Results.length > 0) {
            tier2Results.sort((a, b) => b.score - a.score);
            console.log(`[USERBOT TIER 2] Found "${tier2Results[0].title}" in ${tier2Results[0].channelName} (Score: ${tier2Results[0].score})`);

            for (const r of tier2Results) {
                if (r.inviteHash) {
                    CHAPTER_CHANNEL_CACHE.set(cacheKey, { inviteHash: r.inviteHash, photos: null });
                }
            }
            return tier2Results;
        }

        return [];
    } catch (e) {
        console.error('[USERBOT] searchPrivateChannels error:', e.message);
        return [];
    }
}

// ── Parse chapter number from filename and caption ─────────────────────────
function parseChapterNum(filename, caption) {
    const text = `${filename || ''} ${caption || ''}`;
    const m1 = text.match(/\[(?:Ch|c|Chapter)?[\-\s]?(\d+(?:\.\d+)?)\]/i);
    if (m1) return parseFloat(m1[1]);

    const m2 = text.match(/(?:chapter|ch\.?|ep\.?)\s*(\d+(?:\.\d+)?)/i);
    if (m2) return parseFloat(m2[1]);

    const m3 = text.match(/^(\d+(?:\.\d+)?)/);
    if (m3) return parseFloat(m3[1]);

    return null;
}

// ── Extract PDF to images using PyMuPDF (Optimized Fast Mode) ───────────────
const STORAGE_ROOT = path.join(__dirname, '../public/manga_storage');
const { exec } = require('child_process');

function extractPdfToImages(pdfPath, targetDir) {
    return new Promise((resolve) => {
        if (fs.existsSync(targetDir)) {
            const existing = fs.readdirSync(targetDir).filter(f => /\.(jpg|png|webp)$/i.test(f) && fs.statSync(path.join(targetDir, f)).size > 1000);
            if (existing.length > 0) {
                return resolve(existing);
            }
        }

        fs.mkdirSync(targetDir, { recursive: true });

        const pyScript = `
import fitz, os, sys
try:
    doc = fitz.open(sys.argv[1])
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for i, page in enumerate(doc):
        mat = fitz.Matrix(1.8, 1.8)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(os.path.join(out_dir, f"page_{i+1:03d}.jpg"), "jpeg", 88)
    print(f"EXTRACTED:{len(doc)}")
except Exception as e:
    print(f"ERROR:{e}")
`;

        const tempScriptPath = path.join(__dirname, `_temp_extract_${Date.now()}.py`);
        fs.writeFileSync(tempScriptPath, pyScript, 'utf8');

        exec(`python "${tempScriptPath}" "${pdfPath}" "${targetDir}"`, { timeout: 30000 }, (err, stdout) => {
            try { fs.unlinkSync(tempScriptPath); } catch {}
            if (err) {
                console.error('[USERBOT PDF] Extraction error:', err.message);
                return resolve([]);
            }
            const files = fs.readdirSync(targetDir).filter(f => /\.(jpg|png|webp)$/i.test(f));
            console.log(`[USERBOT PDF] Extracted ${files.length} pages to ${targetDir}`);
            resolve(files);
        });
    });
}

// ── Single Telegram Download Lock (prevents DC socket collisions) ─────────────
let isTgDownloading = false;
const tgDownloadWaiters = [];

async function acquireDownloadLock() {
    if (!isTgDownloading) {
        isTgDownloading = true;
        return;
    }
    await new Promise(resolve => tgDownloadWaiters.push(resolve));
    isTgDownloading = true;
}

function releaseDownloadLock() {
    isTgDownloading = false;
    const next = tgDownloadWaiters.shift();
    if (next) next();
}

// Channel chapter message index for background prefetching: channelId -> Map<chNum, messageId>
const CHANNEL_CHAPTER_MSG_MAP = new Map();

// ── Download and extract a specific chapter PDF from Telegram ─────────────────
async function getChapterPdfPanels(channelId, messageId, chNum, titleKey) {
    const client = await getClient();
    if (!client || !_ready) return null;

    // Strict unique slug per title + channelId (guarantees ZERO cross-contamination)
    const rawSlug = norm(titleKey || '');
    const slug = (rawSlug && rawSlug !== 'manga') ? rawSlug : `chan_${Math.abs(Number(channelId))}`;
    const targetDir = path.join(STORAGE_ROOT, slug, `chapter_${chNum}`);

    // Check if already extracted (Instant cache hit - NO LOCK REQUIRED)
    if (fs.existsSync(targetDir)) {
        const existing = fs.readdirSync(targetDir).filter(f => /\.(jpg|png|webp)$/i.test(f));
        if (existing.length > 0) {
            triggerBackgroundPrefetch(client, channelId, parseFloat(chNum), slug, titleKey);
            return formatPanelHtml(existing, slug, chNum, titleKey);
        }
    }

    await acquireDownloadLock();
    try {
        // Re-check after lock acquired
        if (fs.existsSync(targetDir)) {
            const existing = fs.readdirSync(targetDir).filter(f => /\.(jpg|png|webp)$/i.test(f));
            if (existing.length > 0) {
                return formatPanelHtml(existing, slug, chNum, titleKey);
            }
        }

        const peer = await client.getInputEntity(BigInt(channelId));
        const msgs = await client.getMessages(peer, { ids: [parseInt(messageId, 10)] });
        const msg = msgs?.[0];

        if (!msg || !msg.media) {
            console.error(`[USERBOT PDF] Message ${messageId} has no media in channel ${channelId}`);
            return null;
        }

        const tempPdfDir = path.join(STORAGE_ROOT, slug);
        if (!fs.existsSync(tempPdfDir)) fs.mkdirSync(tempPdfDir, { recursive: true });
        const tempPdfPath = path.join(tempPdfDir, `temp_ch_${chNum}_${Date.now()}.pdf`);

        console.log(`[USERBOT PDF] Downloading Chapter ${chNum} PDF from Telegram...`);
        let buffer = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                buffer = await client.downloadMedia(msg.media, { 
                    dcId: msg.media.document?.dcId,
                    workers: 1 
                });
                if (buffer && buffer.length > 1000) break;
            } catch (dlErr) {
                console.warn(`[USERBOT PDF] Download attempt ${attempt} failed: ${dlErr.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!buffer || buffer.length < 1000) {
            console.error(`[USERBOT PDF] Failed to download PDF for Chapter ${chNum} after retries`);
            return null;
        }
        fs.writeFileSync(tempPdfPath, Buffer.from(buffer));

        const pages = await extractPdfToImages(tempPdfPath, targetDir);
        try { fs.unlinkSync(tempPdfPath); } catch {}

        if (pages.length > 0) {
            return formatPanelHtml(pages, slug, chNum, titleKey);
        }
    } catch (e) {
        console.error(`[USERBOT PDF] Error downloading/extracting chapter ${chNum}:`, e.message);
    } finally {
        releaseDownloadLock();
        triggerBackgroundPrefetch(client, channelId, parseFloat(chNum), slug, titleKey);
    }
    return null;
}

// ── Background Line-by-Line Chapter Prefetcher ───────────────────────────────
const PREFETCH_RUNNING = new Set();

function triggerBackgroundPrefetch(client, channelId, currentChNum, slug, titleKey) {
    const chMap = CHANNEL_CHAPTER_MSG_MAP.get(channelId.toString());
    if (!chMap) return;

    // Prefetch next 2 chapters quietly in background
    const nextChapters = [currentChNum + 1, currentChNum + 2];

    for (const nextNum of nextChapters) {
        const key = `${channelId}_${nextNum}`;
        if (PREFETCH_RUNNING.has(key)) continue;

        const nextMsgId = chMap.get(nextNum);
        if (!nextMsgId) continue;

        const nextDir = path.join(STORAGE_ROOT, slug, `chapter_${nextNum}`);
        if (fs.existsSync(nextDir)) {
            const files = fs.readdirSync(nextDir).filter(f => /\.(jpg|png|webp)$/i.test(f));
            if (files.length > 0) continue; // Already extracted
        }

        PREFETCH_RUNNING.add(key);

        // Run prefetch in background without blocking
        (async () => {
            try {
                console.log(`[USERBOT PREFETCH] Background pre-fetching Chapter ${nextNum}...`);
                const peer = await client.getInputEntity(BigInt(channelId));
                const msgs = await client.getMessages(peer, { ids: [parseInt(nextMsgId, 10)] });
                const msg = msgs?.[0];
                if (!msg || !msg.media) return;

                const tempPdfDir = path.join(STORAGE_ROOT, slug);
                const tempPdfPath = path.join(tempPdfDir, `temp_prefetch_${nextNum}_${Date.now()}.pdf`);

                const buffer = await client.downloadMedia(msg.media, { workers: 4 });
                if (buffer && buffer.length > 0) {
                    fs.writeFileSync(tempPdfPath, Buffer.from(buffer));
                    await extractPdfToImages(tempPdfPath, nextDir);
                    try { fs.unlinkSync(tempPdfPath); } catch {}
                    console.log(`[USERBOT PREFETCH] Chapter ${nextNum} pre-extracted and ready for instant read!`);
                }
            } catch (e) {
                console.log(`[USERBOT PREFETCH] Chapter ${nextNum} prefetch skipped:`, e.message);
            } finally {
                PREFETCH_RUNNING.delete(key);
            }
        })();
    }
}

function formatPanelHtml(pages, slug, chNum, titleKey) {
    const panelImgs = pages.map((p, idx) => `
        <div style="text-align:center;margin:0;padding:0;line-height:0;background:#05070a;width:100%;">
            <img src="/manga_storage/${slug}/chapter_${chNum}/${p}" alt="Page ${idx+1}" loading="lazy" style="width:100%;max-width:900px;display:block;margin:0 auto;height:auto;min-height:400px;background:#05070a;object-fit:contain;">
        </div>
    `).join('');

    return `
        <div style="background:#000;min-height:100vh;padding:0;margin:0 0 4rem 0;">
            <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:30;box-shadow:0 4px 25px rgba(0,0,0,0.9);">
                <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                    CHAPTER ${chNum}
                </div>
                <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${titleKey || 'Manga'}</h2>
                <span style="color:#64748b;font-size:0.8rem;">${pages.length} High-Res Pages</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;background:#000;gap:0;padding:0;margin:0;width:100%;">
                ${panelImgs}
            </div>
        </div>
    `;
}

// ── PUBLIC API: Get all chapters by joining reading channel ───────────────────
async function getReadingChannelChapters(inviteHash, titleKey) {
    const client = await getClient();
    if (!client || !_ready) return [];

    const cacheKey = norm(titleKey || inviteHash);

    // Join (or confirm already in) the reading channel
    const channelInfo = await joinChannelByHash(client, inviteHash);
    if (!channelInfo) {
        console.error(`[USERBOT] Could not access reading channel for "${titleKey}"`);
        return [];
    }

    const peer = await client.getInputEntity(channelInfo.id);

    // Paginate through channel history to get ALL chapter documents
    let allMessages = [];
    let offsetId = 0;

    while (true) {
        try {
            const res = await client.invoke(new Api.messages.GetHistory({
                peer,
                offsetId,
                offsetDate: 0,
                addOffset: 0,
                limit: 100,
                maxId: 0,
                minId: 0,
                hash: BigInt(0)
            }));

            const msgs = res.messages || [];
            if (msgs.length === 0) break;

            allMessages.push(...msgs);
            offsetId = msgs[msgs.length - 1].id;

            if (msgs.length < 100 || allMessages.length >= 1500) break;
        } catch (e) {
            console.error(`[USERBOT] History fetch error:`, e.message);
            break;
        }
    }

    console.log(`[USERBOT] Total messages fetched from "${channelInfo.title}": ${allMessages.length}`);

    // Collect all PDF chapter documents, separating Main Story from Spin-offs/Sequels/Retry
    const mainChapterMap = new Map();
    const spinoffChapters = [];
    const msgIdMap = new Map();

    for (const m of allMessages) {
        const isPdf = m.media?.document?.mimeType === 'application/pdf';
        const docName = m.media?.document?.attributes?.find(a => a.fileName)?.fileName || '';
        const caption = m.message || '';

        if (isPdf || docName.toLowerCase().endsWith('.pdf')) {
            const num = parseChapterNum(docName, caption);
            if (num === null) continue;

            const isSpinoff = /retry|spinoff|spin-off|side\s*story|extra|special|ragnarok|prequel|gaiden|sequel|omake|prologue|epilogue|season\s*[2-9]/i.test(`${docName} ${caption}`);

            if (isSpinoff) {
                spinoffChapters.push({
                    rawNum: num,
                    title: `Chapter ${num} (Side Story)`,
                    chapterId: `private-pdf-${channelInfo.id}-${m.id}-${num}`,
                    messageId: m.id,
                    channelId: channelInfo.id.toString(),
                    docName: docName || `Chapter ${num}.pdf`,
                    size: m.media?.document?.size || 0
                });
            } else {
                if (!mainChapterMap.has(num)) {
                    mainChapterMap.set(num, {
                        num,
                        title: `Chapter ${num}`,
                        chapterId: `private-pdf-${channelInfo.id}-${m.id}-${num}`,
                        messageId: m.id,
                        channelId: channelInfo.id.toString(),
                        docName: docName || `Chapter ${num}.pdf`,
                        size: m.media?.document?.size || 0
                    });
                }
            }
        }
    }

    const mainSorted = [...mainChapterMap.values()].sort((a, b) => a.num - b.num);
    const spinoffSorted = spinoffChapters.sort((a, b) => a.rawNum - b.rawNum);

    const isExplicitSpinoffQuery = /retry|spinoff|spin-off|side\s*story|extra|special|ragnarok|prequel|gaiden|sequel/i.test(titleKey || '');

    let allSorted = [];
    if (isExplicitSpinoffQuery && spinoffSorted.length > 0) {
        allSorted = spinoffSorted.map((sp, idx) => ({
            num: sp.rawNum || (idx + 1),
            title: `Chapter ${sp.rawNum || (idx + 1)}`,
            chapterId: sp.chapterId,
            messageId: sp.messageId,
            channelId: sp.channelId,
            docName: sp.docName,
            size: sp.size
        }));
    } else if (mainSorted.length > 0) {
        allSorted = [...mainSorted];
    } else {
        allSorted = [...spinoffSorted];
    }

    for (const ch of allSorted) {
        msgIdMap.set(ch.num, ch.messageId);
    }

    // Save message map for background prefetching
    CHANNEL_CHAPTER_MSG_MAP.set(channelInfo.id.toString(), msgIdMap);

    // If PDF chapters found, build chapter list
    if (allSorted.length > 0) {
        console.log(`[USERBOT] Found ${allSorted.length} PDF chapters (${mainSorted.length} Main + ${spinoffSorted.length} Spin-off) for "${titleKey}"`);

        // Start background pre-extraction of Chapter 1 immediately so reader is instant!
        const firstCh = allSorted[0];
        getChapterPdfPanels(firstCh.channelId, firstCh.messageId, firstCh.num, titleKey).catch(() => {});

        // Build chapters array
        const chapters = [];
        for (const ch of allSorted) {
            chapters.push({
                title: ch.title,
                chapterId: ch.chapterId,
                html: `
                    <div class="lazy-manga-trigger" data-chapter-id="${ch.chapterId}" style="background:#000;min-height:70vh;padding:0;margin:0 0 4rem 0;cursor:pointer;">
                        <div style="background:#0a0e17;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid #1e293b;">
                            <div style="display:inline-block;background:#0284c7;color:#fff;padding:4px 14px;border-radius:12px;font-size:0.75rem;font-weight:800;letter-spacing:0.5px;margin-bottom:0.4rem;">
                                CHAPTER ${ch.num}
                            </div>
                            <h2 style="color:#f8fafc;font-size:1.4rem;margin:0.4rem 0 0 0;font-weight:800;">${titleKey || 'Manga'}</h2>
                            <span style="color:#38bdf8;font-size:0.85rem;font-weight:600;">⚡ Loading Chapter ${ch.num} pages...</span>
                        </div>
                    </div>
                `
            });
        }

        return chapters;
    }

    return [];
}

// ── Boot on require ───────────────────────────────────────────────────────────
getClient().catch(() => {});

module.exports = { searchPrivateChannels, getReadingChannelChapters, getChapterPdfPanels, getClient, CHAPTER_CHANNEL_CACHE };
