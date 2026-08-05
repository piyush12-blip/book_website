const axios = require('axios');

const testQuery = "Starting With An Sss-rank Goddess Summon";

async function testLinks() {
    console.log("=== TESTING DIRECT MIRROR LINKS FOR LO ===\n");

    const links = [
        { name: "NovelBin Direct Search", url: `https://novelbin.me/search?keyword=${encodeURIComponent(testQuery)}` },
        { name: "FreeWebNovel Direct Search", url: `https://freewebnovel.com/search.html?key=${encodeURIComponent(testQuery)}` },
        { name: "WuxiaClick Direct Search", url: `https://wuxiaclick.com/?s=${encodeURIComponent(testQuery)}` },
        { name: "Anna's Archive Mirror (.se)", url: `https://annas-archive.se/search?q=${encodeURIComponent(testQuery)}` },
        { name: "Z-Library Global Mirror", url: `https://z-library.rs/s/${encodeURIComponent(testQuery)}` },
        { name: "OceanofPDF Direct Mirror", url: `https://oceanofpdf.com/?s=${encodeURIComponent(testQuery)}` }
    ];

    for (const link of links) {
        try {
            const start = Date.now();
            const res = await axios.get(link.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 6000
            });
            const duration = Date.now() - start;
            console.log(`✅ [${link.name}] Status ${res.status} (${duration}ms) -> URL: ${link.url}`);
        } catch (e) {
            console.log(`❌ [${link.name}] FAILED: ${e.message} -> URL: ${link.url}`);
        }
    }
}

testLinks();
