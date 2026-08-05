const UA = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

async function testFreeWebNovelDirectScrape() {
    console.log("=== TESTING FREEWEBNOVEL.COM DIRECT SCRAPING ===");
    try {
        const url = "https://freewebnovel.com/novel/starting-with-an-sss-rank-goddess-summon/chapter-1.html";
        const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
        const html = await res.text();
        const hasChapter1 = html.includes('Era Of Lords') || html.includes('Silas') || html.includes('Awakening Pantheon');
        console.log(`✅ FREEWEBNOVEL DIRECT SCRAPE STATUS: ${res.status}
   Contains Real Chapter Text (Era Of Lords / Silas): ${hasChapter1 ? 'YES! 100% REAL TEXT!' : 'No'}
   HTML Length: ${html.length} chars`);
        return true;
    } catch (e) {
        console.log(`❌ FREEWEBNOVEL DIRECT FAILED: ${e.message}`);
        return false;
    }
}

async function testFreeWebNovelSearch() {
    console.log("\n=== TESTING FREEWEBNOVEL.COM SEARCH SCRAPING ===");
    try {
        const searchUrl = "https://freewebnovel.com/search.html?key=Starting+With+An+Sss-rank+Goddess+Summon";
        const res = await fetch(searchUrl, { headers: UA, signal: AbortSignal.timeout(8000) });
        const html = await res.text();
        console.log(`✅ FREEWEBNOVEL SEARCH STATUS: ${res.status} (HTML Length: ${html.length})`);
    } catch (e) {
        console.log(`❌ FREEWEBNOVEL SEARCH FAILED: ${e.message}`);
    }
}

async function testNovelBinScrape() {
    console.log("\n=== TESTING NOVELBIN.ME DIRECT SCRAPING ===");
    try {
        const searchUrl = "https://novelbin.me/search?keyword=Starting+With+An+Sss-rank+Goddess+Summon";
        const res = await fetch(searchUrl, { headers: UA, signal: AbortSignal.timeout(8000) });
        console.log(`✅ NOVELBIN STATUS: ${res.status}`);
    } catch (e) {
        console.log(`❌ NOVELBIN FAILED (Cloudflare/Wall): ${e.message}`);
    }
}

async function testJNovelsScrape() {
    console.log("\n=== TESTING J-NOVELS.COM DIRECT SCRAPING ===");
    try {
        const searchUrl = "https://j-novels.com/?s=Starting+With+An+Sss-rank+Goddess+Summon";
        const res = await fetch(searchUrl, { headers: UA, signal: AbortSignal.timeout(8000) });
        console.log(`✅ J-NOVELS STATUS: ${res.status}`);
    } catch (e) {
        console.log(`❌ J-NOVELS FAILED: ${e.message}`);
    }
}

async function runAllScraperTests() {
    await testFreeWebNovelDirectScrape();
    await testFreeWebNovelSearch();
    await testNovelBinScrape();
    await testJNovelsScrape();
}

runAllScraperTests();
