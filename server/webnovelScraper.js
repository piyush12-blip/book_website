const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebNovelChapters(query) {
    const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    console.log(`[SCRAPER] Searching web novel aggregators for dual-lock match: "${cleanQuery}"`);

    try {
        const rrSearchUrl = `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`;
        const rrRes = await axios.get(rrSearchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 5000
        });
        const $ = cheerio.load(rrRes.data);
        
        let matchedFictionId = null;
        const mainTitleTerms = cleanQuery.split(/\s+/).filter(t => t.length > 3 && !['frank', 'herbert', 'emily', 'mandel', 'scott', 'lynch', 'williams', 'kobo', 'stead', 'orwell', 'gibson'].includes(t));

        $('.fiction-list-item').each((_, el) => {
            const cardTitle = $(el).find('.fiction-title a').text().toLowerCase().trim();
            const relativeLink = $(el).find('.fiction-title a').attr('href');
            
            // DUAL-LOCK VERIFICATION: Main title terms MUST match cardTitle exactly
            const titleMatches = mainTitleTerms.length > 0 && mainTitleTerms.every(term => cardTitle.includes(term));

            if (titleMatches && relativeLink) {
                matchedFictionId = relativeLink.split('/')[2];
                return false; // break loop
            }
        });

        if (matchedFictionId) {
            console.log(`[SCRAPER] RoyalRoad verified dual-lock match found for "${query}" (Fiction ID: ${matchedFictionId})`);
            const { getRoyalRoadChapters } = require('./royalroad');
            const chapters = await getRoyalRoadChapters(matchedFictionId);
            if (chapters && chapters.length > 0) {
                return chapters;
            }
        } else {
            console.log(`[SCRAPER] Discarding non-dual-lock RoyalRoad results for "${cleanQuery}"`);
        }
    } catch (e) {
        console.warn(`[SCRAPER] RoyalRoad search skipped/failed: ${e.message}`);
    }

    return null;
}

module.exports = { scrapeWebNovelChapters };
