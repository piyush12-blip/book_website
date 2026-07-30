const axios = require('axios');
const cheerio = require('cheerio');

async function testMangakakalot() {
    console.log('=== Testing Mangakakalot Search ===');
    const res = await axios.get('https://mangakakalot.com/search/story/blue_lock', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    });

    const $ = cheerio.load(res.data);
    const results = [];
    $('.story_item').each((i, el) => {
        const titleEl = $(el).find('.story_name a');
        const title = titleEl.text().trim();
        const href = titleEl.attr('href');
        const img = $(el).find('img').attr('src');
        if (title && href) {
            results.push({ title, href, img });
        }
    });

    console.log('Mangakakalot count:', results.length);
    if (results.length) {
        console.log('First result:', results[0]);

        const detailRes = await axios.get(results[0].href, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $d = cheerio.load(detailRes.data);
        const chapters = [];
        $d('.chapter-list .row a, .row-content-chapter a').each((i, el) => {
            chapters.push({ title: $d(el).text().trim(), href: $d(el).attr('href') });
        });

        console.log('Total Mangakakalot chapters found:', chapters.length);
        console.log('First chapter (Ch 1):', chapters[chapters.length - 1]);
        console.log('Latest chapter:', chapters[0]);
    }
}

testMangakakalot().catch(console.error);
