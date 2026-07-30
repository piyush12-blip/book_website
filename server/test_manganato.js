const axios = require('axios');
const cheerio = require('cheerio');

async function testManganato() {
    console.log('=== Testing Manganato Search ===');
    const query = 'blue lock';
    // Search url on manganato
    const res = await axios.get(`https://manganato.com/search/story/${encodeURIComponent(query).replace(/%20/g, '_')}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    const $ = cheerio.load(res.data);
    const results = [];
    $('.search-story-item, .panel-story-item').each((i, el) => {
        const titleEl = $(el).find('a.item-title, a.truyen-title');
        const title = titleEl.text().trim();
        const href = titleEl.attr('href');
        const img = $(el).find('img').attr('src');
        const author = $(el).find('.item-author, .author').text().trim();
        if (title && href) {
            results.push({ title, href, img, author });
        }
    });

    console.log('Manganato search results count:', results.length);
    if (results.length) {
        console.log('First result:', results[0]);

        // Now test getting chapters for the first result
        console.log('\n=== Testing Manganato Chapter List ===');
        const detailRes = await axios.get(results[0].href, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $d = cheerio.load(detailRes.data);
        const chapters = [];
        $('.row-content-chapter li, .chapter-list div').each((i, el) => {
            const a = $(el).find('a');
            const cTitle = a.text().trim();
            const cHref = a.attr('href');
            if (cTitle && cHref) {
                chapters.push({ title: cTitle, href: cHref });
            }
        });

        console.log('Total Manganato chapters found:', chapters.length);
        console.log('First chapter (Ch 1):', chapters[chapters.length - 1]); // Manganato lists newest first
        console.log('Latest chapter:', chapters[0]);
    }
}

testManganato().catch(console.error);
