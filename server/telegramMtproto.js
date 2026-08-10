const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const fs = require('fs');
const path = require('path');

const TELEGRAM_CONFIG = {
    apiId: 35943377,
    apiHash: '19a83ba030373609f74ae66222216439'
};

const SESSION_FILE = path.join(__dirname, 'telegram_session.txt');

let sessionString = '';
if (fs.existsSync(SESSION_FILE)) {
    try {
        sessionString = fs.readFileSync(SESSION_FILE, 'utf8').trim();
    } catch(e) {}
}

const stringSession = new StringSession(sessionString);
let client = null;
let isConnected = false;

async function getTelegramClient() {
    if (client && isConnected) return client;
    try {
        client = new TelegramClient(stringSession, TELEGRAM_CONFIG.apiId, TELEGRAM_CONFIG.apiHash, {
            connectionRetries: 5,
            autoReconnect: true
        });
        await client.connect();
        isConnected = true;
        console.log('[MTPROTO] Telegram client connected successfully.');
        return client;
    } catch(err) {
        console.warn('[MTPROTO] Telegram client connection note:', err.message);
        return null;
    }
}

// Join a channel via invite link (+hash) or username
async function joinChannelByLink(link) {
    if (!link) return null;
    const tgClient = await getTelegramClient();
    if (!tgClient) return null;

    try {
        // Invite hash link: https://t.me/+AbCdEf or https://t.me/joinchat/AbCdEf
        const hashMatch = link.match(/t\.me\/(?:\+|joinchat\/)([a-zA-Z0-9_\-]+)/);
        if (hashMatch) {
            const hash = hashMatch[1];
            try {
                const res = await tgClient.invoke(new Api.messages.ImportChatInvite({ hash }));
                console.log(`[MTPROTO] Successfully joined invite channel: +${hash}`);
                return res;
            } catch(e) {
                if (e.message.includes('USER_ALREADY_PARTICIPANT')) {
                    console.log(`[MTPROTO] Already participant in invite channel: +${hash}`);
                    return true;
                }
                console.warn(`[MTPROTO] Join invite hash error:`, e.message);
            }
        }

        // Public username channel: https://t.me/Channel_Name
        const userMatch = link.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]+)/);
        if (userMatch) {
            const username = userMatch[1];
            try {
                const entity = await tgClient.getEntity(username);
                const res = await tgClient.invoke(new Api.channels.JoinChannel({ channel: entity }));
                console.log(`[MTPROTO] Successfully joined channel: @${username}`);
                return res;
            } catch(e) {
                if (e.message.includes('USER_ALREADY_PARTICIPANT')) {
                    return true;
                }
                console.warn(`[MTPROTO] Join channel error:`, e.message);
            }
        }
    } catch(err) {
        console.warn(`[MTPROTO] Error joining ${link}:`, err.message);
    }
    return null;
}

// Fetch all chapter messages from a channel (from chapter 0 to latest)
async function fetchChannelChapterMessages(channelIdentifier, limit = 200) {
    const tgClient = await getTelegramClient();
    if (!tgClient) return [];

    try {
        const entity = await tgClient.getEntity(channelIdentifier);
        const messages = await tgClient.getMessages(entity, { limit });
        return messages;
    } catch(err) {
        console.warn(`[MTPROTO] Error fetching messages for ${channelIdentifier}:`, err.message);
        return [];
    }
}

// Save authenticated session string
function saveSession(newSession) {
    try {
        fs.writeFileSync(SESSION_FILE, newSession, 'utf8');
        console.log('[MTPROTO] Telegram session saved successfully.');
    } catch(e) {}
}

module.exports = {
    TELEGRAM_CONFIG,
    getTelegramClient,
    joinChannelByLink,
    fetchChannelChapterMessages,
    saveSession
};
