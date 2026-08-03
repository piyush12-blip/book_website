const path = require('path');
const axios = require(path.join(__dirname, '../node_modules/axios'));
const cheerio = require(path.join(__dirname, '../node_modules/cheerio'));

async function testWebMirrorPdfScrape(title, author) {
    console.log('TESTING DUCKDUCKGO WEB MIRROR SEARCH FOR:', title, author);
    const query = encodeURIComponent(`filetype:pdf "${title}" ${author}`);
    try {
        const url = `https://html.duckduckgo.com/html/?q=${query}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(res.data);
        const links = [];
        $('.result__url').each((i, elem) => {
            const href = $(elem).text().trim();
            if (href) links.push(href);
        });
        console.log('Found Web Links Count:', links.length);
        console.log('Top Links:', links.slice(0, 10));
    } catch(e) {
        console.error(e.message);
    }
}
testWebMirrorPdfScrape('It Ends with Us', 'Colleen Hoover');
