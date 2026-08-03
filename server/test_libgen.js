const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        const res = await axios.get('http://libgen.is/search.php?req=atomic+habits&res=25&view=simple&phrase=1&column=def', { timeout: 10000 });
        const $ = cheerio.load(res.data);
        const links = [];
        $('table.c tr').each((i, el) => {
            if(i === 0) return; // Header
            const ext = $(el).find('td').eq(8).text().trim().toLowerCase();
            if (ext === 'epub') {
                const title = $(el).find('td').eq(2).text().trim();
                const dlink = $(el).find('td').eq(9).find('a').attr('href');
                links.push({ title, dlink });
            }
        });
        console.log(links.slice(0,3));
    } catch(e) { console.error(e.message); }
}
test();
