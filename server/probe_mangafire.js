const axios = require('axios');

async function test() {
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // 1. Manganato corrected search URL
    try {
        const urls = [
            'https://readmanganato.com/search/story/blue_lock',
            'https://chapmanganato.to/search/story/blue_lock',
            'https://manganato.com/search/story/blue_lock',
        ];
        for (const url of urls) {
            const r = await axios.get(url, { headers: { 'User-Agent': UA }, timeout: 8000 });
            const hasItems = r.data.includes('story-item') || r.data.includes('manga-title') || r.data.includes('a-h3');
            console.log(url, '→', r.status, 'len:', r.data.length, 'hasItems:', hasItems);
            // Look for blue lock links
            const match = r.data.match(/href="([^"]*blue[^"]*lock[^"]*)"/i);
            if (match) console.log('  Found:', match[1]);
        }
    } catch(e) {
        console.log('fail:', e.message.slice(0,80));
    }

    // 2. MangaHere / MangaPark
    try {
        const r = await axios.get('https://mangapark.net/search?q=blue+lock', { headers: { 'User-Agent': UA }, timeout: 8000 });
        console.log('MangaPark:', r.status, 'len:', r.data.length);
        const m = r.data.match(/href="([^"]*blue[^"]*lock[^"]*)"/i);
        if (m) console.log('  Found:', m[1]);
    } catch(e) { console.log('MangaPark fail:', e.message.slice(0,60)); }

    // 3. ComicK.io correct search
    try {
        const r = await axios.get('https://api.comick.io/v1.0/search/?q=blue+lock&limit=5&type=comic&t=true', {
            headers: { 'User-Agent': UA, 'Accept': 'application/json' },
            timeout: 10000
        });
        console.log('ComicK:', r.status, 'results:', r.data.length);
        if (r.data[0]) console.log('  First:', r.data[0].title, r.data[0].hid, r.data[0].slug);
    } catch(e) { console.log('ComicK fail:', e.response ? e.response.status : e.message.slice(0,60)); }
}

test();
