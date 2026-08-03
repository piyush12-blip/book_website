/**
 * Automated Universal Multi-Source Internet Fetcher
 * Optimized for maximum speed, clean title sanitization, and direct text extraction.
 */

const { fetchGutenbergChapters } = require('./gutendex');
const { fetchDirectDocumentText } = require('./directDocumentScraper');
const { fetchRoyalRoadChapters } = require('./royalroad');
const { normalizeQuery, scoreMatch } = require('./matcher');

async function autoFetchBookFromInternet(rawTitle, rawAuthor = '', id = '') {
    const { cleanTitle, cleanAuthor } = normalizeQuery(rawTitle, rawAuthor);
    const fullQuery = `${cleanTitle} ${cleanAuthor}`.trim();
    console.log(`[AUTOMATED-FETCHER] Canonical target: "${cleanTitle}" | Author: "${cleanAuthor}"`);

    // 1. Try Direct Internet Document Search First (Real Text Mirror)
    try {
        const directDocChapters = await fetchDirectDocumentText(cleanTitle, cleanAuthor);
        if (directDocChapters && directDocChapters.length > 0) {
            console.log(`[AUTOMATED-FETCHER] SUCCESS! Extracted ${directDocChapters.length} real chapters for: "${cleanTitle}"`);
            return { chapters: directDocChapters, type: 'book', source: 'DirectInternetDocument' };
        }
    } catch (e) {
        console.warn(`[AUTOMATED-FETCHER] Direct document search skipped: ${e.message}`);
    }

    // 2. Try Public Domain Archives (Gutenberg)
    try {
        const gutenbergResult = await fetchGutenbergChapters(cleanTitle, cleanAuthor);
        if (gutenbergResult && gutenbergResult.chapters && gutenbergResult.chapters.length > 0) {
            console.log(`[AUTOMATED-FETCHER] Found full text on Project Gutenberg for: "${cleanTitle}"`);
            return { chapters: gutenbergResult.chapters, type: 'book', source: 'Gutenberg' };
        }
    } catch (e) {
        console.warn(`[AUTOMATED-FETCHER] Gutenberg check skipped: ${e.message}`);
    }

    // 3. Try RoyalRoad & Web Novel Aggregators
    try {
        const rrData = await fetchRoyalRoadChapters(fullQuery);
        if (rrData && rrData.chapters && rrData.chapters.length > 0) {
            return { chapters: rrData.chapters, type: 'webnovel', source: 'RoyalRoad' };
        }
    } catch (e) {
        console.warn(`[AUTOMATED-FETCHER] RoyalRoad check skipped: ${e.message}`);
    }

    // 4. Return LOCKED status when no real text exists - NEVER generate fake story templates!
    console.log(`[AUTOMATED-FETCHER] No real text found on public web for: "${cleanTitle}" (DRM Active)`);
    return { chapters: [], type: 'book', source: 'LockedDRM' };
}

module.exports = { autoFetchBookFromInternet };

module.exports = { autoFetchBookFromInternet };
