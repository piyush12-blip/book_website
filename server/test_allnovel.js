const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        let res = await axios.get('https://allnovel.net/search.php?q=The+Midnight+Library', { timeout: 10000 });
        const $ = cheerio.load(res.data);
        const firstLink = $('.title a').first().attr('href');
        console.log('first link:', firstLink);
        if (firstLink) {
            let bookRes = await axios.get(firstLink, { timeout: 10000 });
            const b$ = cheerio.load(bookRes.data);
            const chapters = [];
            b$('.chapter-list a').each((i, el) => {
                if (i < 3) chapters.push(b$(el).attr('href'));
            });
            console.log('first chapters:', chapters);
            
            if (chapters.length > 0) {
                let chapRes = await axios.get(chapters[0], { timeout: 10000 });
                const c$ = cheerio.load(chapRes.data);
                console.log('chapter text snippet:', c$('.des_vol p').first().text().substring(0, 100));
            }
        }
    } catch(e) { console.log('error:', e.message); }
}
test();
