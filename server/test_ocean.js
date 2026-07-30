const axios = require('axios');
const cheerio = require('cheerio');

async function testVK() {
    try {
        const query = 'The Fault in Our Stars epub';
        console.log('Searching VK Docs for:', query);
        
        const searchUrl = `https://m.vk.com/docs?q=${encodeURIComponent(query)}`;
        const res = await axios.get(searchUrl, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        const $ = cheerio.load(res.data);
        let link = $('.doc_item').first().attr('href');
        
        // VK mobile doc item format: /doc1234_5678...
        if (link) {
            if (link.startsWith('/')) link = 'https://m.vk.com' + link;
            console.log('Found VK Doc link:', link);
        } else {
            console.log('No VK Docs found.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testVK();
