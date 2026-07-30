const axios = require('axios');

async function test() {
    const r = await axios.get('https://www.royalroad.com/fictions/search?title=lord+of+the+mysteries', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    // Find fiction IDs and titles
    const matches = [...r.data.matchAll(/data-fiction-id="(\d+)"[\s\S]*?<h2[^>]*class="[^"]*fiction-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/g)];
    matches.slice(0,5).forEach(m => console.log(m[1], '|', m[2].replace(/<[^>]+>/g,'').trim()));
    
    // Also try a simpler pattern
    if (!matches.length) {
        const simple = [...r.data.matchAll(/href="\/fiction\/(\d+)\/([^"]+)"/g)];
        simple.slice(0,5).forEach(m => console.log(m[1], '|', m[2]));
    }
}
test().catch(console.error);
