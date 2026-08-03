const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        const query = encodeURIComponent('site:gutenberg.org/files "Atomic Habits" OR "It Ends With Us"');
        const url = 'https://html.duckduckgo.com/html/?q=' + query;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const $ = cheerio.load(res.data);
        const links = [];
        $('.result__url').each((i, el) => links.push($(el).text().trim()));
        console.log(links.slice(0, 5));
    } catch(e) {
        console.error(e.message);
    }
}
test();
