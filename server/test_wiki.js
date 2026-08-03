const axios = require('axios');
const cheerio = require('cheerio');
async function test() {
    try {
        let res = await axios.get('https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&titles=The_Midnight_Library&format=json', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const pages = res.data.query.pages;
        const html = pages[Object.keys(pages)[0]].extract;
        const $ = cheerio.load(html);
        
        let plotText = '';
        let inPlot = false;
        $('h2, p').each((i, el) => {
            if (el.tagName === 'h2') {
                const text = $(el).text().toLowerCase();
                inPlot = text.includes('plot') || text.includes('synopsis');
            } else if (inPlot && el.tagName === 'p') {
                plotText += $(el).text() + '\n\n';
            }
        });
        console.log('Plot text:', plotText.substring(0, 500));
        
        if (!plotText) {
            // fallback to intro
            console.log('Intro text:', html.replace(/<[^>]+>/g, '').substring(0, 500));
        }
    } catch(e) { console.log('error:', e.message); }
}
test();
