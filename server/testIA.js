const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
async function testIA() {
    try {
        const query = '1984 orwell';
        const searchRes = await axios.get(`https://archive.org/advancedsearch.php?q=title:${encodeURIComponent(query)}+AND+mediatype:texts&fl[]=identifier&output=json&rows=5`, { timeout: 10000 });
        if (searchRes.data.response.docs.length > 0) {
            for(let doc of searchRes.data.response.docs) {
                const id = doc.identifier;
                console.log('Found ID:', id);
                const detailRes = await axios.get(`https://archive.org/details/${id}`, { timeout: 10000 });
                const $ = cheerio.load(detailRes.data);
                const epubLink = $('a.download-pill').filter((i, el) => $(el).text().includes('EPUB')).attr('href');
                if(epubLink) {
                    console.log('Found EPUB Link:', epubLink);
                    return;
                }
            }
            console.log('No EPUB links found in top 5.');
        } else {
            console.log('No results found.');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}
testIA();
