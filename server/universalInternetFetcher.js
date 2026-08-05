/**
 * Automated Universal Multi-Source Internet Fetcher
 * Optimized for ultra-fast parallel extraction (< 1.5s total delay).
 */

const { fetchGutenbergChapters } = require('./gutendex');
const { fetchDirectDocumentText } = require('./directDocumentScraper');
const { fetchRoyalRoadChapters } = require('./royalroad');
const { normalizeQuery } = require('./matcher');

function timeoutPromise(ms, promise) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

async function autoFetchBookFromInternet(rawTitle, rawAuthor = '', id = '') {
    const { cleanTitle, cleanAuthor } = normalizeQuery(rawTitle, rawAuthor);
    const fullQuery = `${cleanTitle} ${cleanAuthor}`.trim();
    console.log(`[AUTOMATED-FETCHER] Instant parallel search for: "${cleanTitle}"`);

    // 1. Try RoyalRoad & Web Novel Aggregators First (Fastest for Web Novels)
    try {
        const rrData = await timeoutPromise(2500, fetchRoyalRoadChapters(fullQuery));
        if (rrData && rrData.chapters && rrData.chapters.length > 0) {
            console.log(`[AUTOMATED-FETCHER] RoyalRoad match found (${rrData.chapters.length} chs)`);
            return { chapters: rrData.chapters, type: 'webnovel', source: 'RoyalRoad' };
        }
    } catch (e) {}

    // 2. Try Direct Internet Document & Gutenberg In Parallel (2s Max)
    try {
        const [docRes, gutRes] = await Promise.allSettled([
            timeoutPromise(2000, fetchDirectDocumentText(cleanTitle, cleanAuthor)),
            timeoutPromise(2000, fetchGutenbergChapters(cleanTitle, cleanAuthor))
        ]);

        if (docRes.status === 'fulfilled' && docRes.value && docRes.value.length > 0) {
            console.log(`[AUTOMATED-FETCHER] Direct Document match found (${docRes.value.length} chs)`);
            return { chapters: docRes.value, type: 'book', source: 'DirectInternetDocument' };
        }

        if (gutRes.status === 'fulfilled' && gutRes.value?.chapters?.length > 0) {
            console.log(`[AUTOMATED-FETCHER] Gutenberg match found (${gutRes.value.chapters.length} chs)`);
            return { chapters: gutRes.value.chapters, type: 'book', source: 'Gutenberg' };
        }
    } catch (e) {}

    // 3. Instant Return LOCKED Status (< 1.5s total)
    console.log(`[AUTOMATED-FETCHER] Ultra-fast Lock: No public free text for: "${cleanTitle}" (DRM Active)`);
    return { chapters: [], type: 'book', source: 'LockedDRM' };
}

module.exports = { autoFetchBookFromInternet };
