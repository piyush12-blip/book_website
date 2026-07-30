const axios = require('axios');
const cheerio = require('cheerio');

const COLORS = ['navy','teal','burgundy','midnight','sage','rust','ochre','brown','grey','ivory'];
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

async function searchRoyalRoad(query) {
    try {
        const r = await axios.get(`https://www.royalroad.com/fictions/search?title=${encodeURIComponent(query)}`, {
            headers: UA,
            timeout: 8000
        });
        const $ = cheerio.load(r.data);
        const results = [];

        $('.fiction-list-item, .row.fiction-item').each((i, el) => {
            if (results.length >= 5) return;
            const $el = $(el);
            
            const titleEl = $el.find('h2.fiction-title a, h2 a').first();
            const title = titleEl.text().trim();
            if (!title) return;

            const href = titleEl.attr('href') || '';
            const idMatch = href.match(/\/fiction\/(\d+)/);
            if (!idMatch) return;
            const fictionId = idMatch[1];

            const author = $el.find('.author-name, .col-md-10 span').first().text().trim() || 'Royal Road Author';
            const coverImg = $el.find('img').first().attr('src') || null;
            let synopsis = $el.find('.description, .fiction-description').first().text().trim().slice(0, 400);
            const color = COLORS[i % COLORS.length];

            results.push({
                id: `royalroad-${fictionId}`,
                title,
                author,
                cover: coverImg ? `has-image ${color}` : color,
                image: coverImg,
                lines: title.split(' ').slice(0,3).join('<br>'),
                genre: 'Web Novel',
                mood: 'Adventure',
                pages: 999,
                rating: 5,
                synopsis: synopsis || `A web novel on Royal Road.`,
                hasEpub: true,
                sourceUrl: `https://www.royalroad.com/fiction/${fictionId}`
            });
        });

        return results;
    } catch (err) {
        console.warn('[ROYALROAD] Search error:', err.message);
        return [];
    }
}

async function getRoyalRoadChapters(fictionId) {
    try {
        const r = await axios.get(`https://www.royalroad.com/fiction/${fictionId}`, {
            headers: UA,
            timeout: 10000
        });
        const $ = cheerio.load(r.data);
        
        const chapterLinks = [];
        $('#chapters tbody tr, .chapter-row').each((i, el) => {
            const $el = $(el);
            const a = $el.find('a[href*="/chapter/"]').first();
            const title = a.text().trim();
            const href = a.attr('href');
            if (title && href) {
                chapterLinks.push({ title, url: `https://www.royalroad.com${href}` });
            }
        });

        if (!chapterLinks.length) {
            console.warn(`[ROYALROAD] No chapters found for fiction ${fictionId}`);
            return [];
        }

        console.log(`[ROYALROAD] Found ${chapterLinks.length} total chapters for fiction ${fictionId}, fetching all...`);
        
        // Fetch ALL chapter contents in parallel batches of 5
        const chapters = [];
        const batchSize = 5;
        for (let i = 0; i < chapterLinks.length; i += batchSize) {
            const batch = chapterLinks.slice(i, i + batchSize);
            const promises = batch.map(link => 
                axios.get(link.url, { headers: UA, timeout: 8000 })
                    .then(cr => {
                        const $c = cheerio.load(cr.data);
                        let content = $c('.chapter-content').html() || '';
                        content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
                        content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
                        if (content.length > 50) {
                            return { title: link.title, html: content };
                        }
                        return null;
                    })
                    .catch(e => null)
            );

            const batchResults = await Promise.all(promises);
            batchResults.forEach(res => { if (res) chapters.push(res); });
        }

        return chapters;
    } catch (err) {
        console.error('[ROYALROAD] Chapter fetch error:', err.message);
        throw err;
    }
}

module.exports = { searchRoyalRoad, getRoyalRoadChapters };
