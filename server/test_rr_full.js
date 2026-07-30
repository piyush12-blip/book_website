const axios = require('axios');
const cheerio = require('cheerio');

async function testRR() {
    const r = await axios.get('https://www.royalroad.com/fiction/39063', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(r.data);
    const links = [];
    $('#chapters tbody tr').each((i, el) => {
        const a = $(el).find('a[href*="/chapter/"]').first();
        const title = a.text().trim();
        const href = a.attr('href');
        if (title && href) {
            links.push({ title, url: `https://www.royalroad.com${href}` });
        }
    });
    console.log('Total RoyalRoad Chapters:', links.length);
    console.log('First 3:', links.slice(0, 3));
    console.log('Last 3:', links.slice(-3));
}

testRR().catch(console.error);
