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

            let author = $el.find('a[href*="/profile/"]').first().text().trim()
                || $el.find('.author a, .author, span:contains("by") a, .fiction-info span a, .author-name').first().text().trim();
            if (author.toLowerCase().startsWith('by ')) {
                author = author.replace(/^by\s+/i, '').trim();
            }
            if (!author) author = 'Web Novel Author';
            let coverImg = $el.find('img').first().attr('src') || null;
            if (coverImg) {
                if (coverImg.includes('nocover') || coverImg.includes('default')) {
                    coverImg = null;
                } else if (coverImg.startsWith('//')) {
                    coverImg = 'https:' + coverImg;
                } else if (coverImg.startsWith('/')) {
                    coverImg = 'https://www.royalroad.com' + coverImg;
                }
            }
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

        console.log(`[ROYALROAD] Found ${chapterLinks.length} total chapters for fiction ${fictionId}, preparing immediate response...`);
        
        // 1. Fetch first 5 chapters immediately for instant reading (<1s)
        const initialBatch = chapterLinks.slice(0, 5);
        const initialPromises = initialBatch.map((link, idx) => 
            axios.get(link.url, { headers: UA, timeout: 6000 })
                .then(cr => {
                    const $c = cheerio.load(cr.data);
                    let content = $c('.chapter-content').html() || '';
                    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
                    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');
                    return { title: link.title, url: link.url, html: content };
                })
                .catch(() => null)
        );

        const initialResults = await Promise.all(initialPromises);

        const chapters = chapterLinks.map((link, i) => {
            const fetched = initialResults[i];
            let htmlContent = '';
            if (fetched && fetched.html) {
                htmlContent = fetched.html;
            } else {
                htmlContent = `<div class="lazy-rr-trigger" data-url="${encodeURIComponent(link.url)}" style="background:#111827;padding:1.5rem;border-radius:8px;margin:2rem 0;text-align:center;border:1px solid #374151;">` +
                    `<h3 style="color:#f3f4f6;margin:0 0 0.5rem 0;">${link.title}</h3>` +
                    `<p style="color:#9ca3af;font-size:0.9rem;">Reading online from Royal Road. Click to load chapter text.</p>` +
                    `<a href="${link.url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#3b82f6;color:#fff;padding:8px 18px;border-radius:6px;font-size:0.85rem;font-weight:700;text-decoration:none;margin-top:0.5rem;">Read Chapter on Royal Road ↗</a>` +
                    `</div>`;
            }

            return {
                title: link.title,
                chapterId: `rr-ch-${fictionId}-${i+1}`,
                url: link.url,
                html: htmlContent
            };
        });

        return chapters;
    } catch (err) {
        console.error('[ROYALROAD] Chapter fetch error:', err.message);
        return [];
    }
}

async function fetchRoyalRoadChapters(query) {
    try {
        const searchRes = await searchRoyalRoad(query);
        if (!searchRes || !searchRes.length) return { chapters: [] };
        
        const qClean = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        // Only accept match if title has strong overlap with search query
        const topMatch = searchRes.find(item => {
            const tClean = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            return tClean.includes(qClean) || qClean.includes(tClean);
        });

        if (!topMatch) {
            console.warn(`[ROYALROAD] Rejecting loose search result. No strict title match for: "${query}"`);
            return { chapters: [] };
        }

        const fictionId = topMatch.id.replace('royalroad-', '');
        const chapters = await getRoyalRoadChapters(fictionId);
        return { chapters, title: topMatch.title, author: topMatch.author };
    } catch (e) {
        console.error('[ROYALROAD] fetchRoyalRoadChapters error:', e.message);
        return { chapters: [] };
    }
}

module.exports = { searchRoyalRoad, getRoyalRoadChapters, fetchRoyalRoadChapters };
