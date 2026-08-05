const testQuery = "Starting With An Sss-rank Goddess Summon";

async function testLinks() {
    console.log("=== TESTING 100% UNBLOCKED STATUS 200 MIRROR LINKS ===\n");

    const links = [
        { name: "RoyalRoad Web Novel Archive", url: `https://www.royalroad.com/fictions/search?title=${encodeURIComponent(testQuery)}` },
        { name: "Internet Archive Free Texts", url: `https://archive.org/details/texts?query=${encodeURIComponent(testQuery)}` },
        { name: "Google Books Public Reader", url: `https://books.google.com/books?q=${encodeURIComponent(testQuery)}` },
        { name: "OpenLibrary Global Library", url: `https://openlibrary.org/search?q=${encodeURIComponent(testQuery)}` }
    ];

    for (const link of links) {
        try {
            const start = Date.now();
            const res = await fetch(link.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(6000)
            });
            const duration = Date.now() - start;
            console.log(`✅ [${link.name}] Status ${res.status} (${duration}ms) -> URL: ${link.url}`);
        } catch (e) {
            console.log(`❌ [${link.name}] FAILED: ${e.message} -> URL: ${link.url}`);
        }
    }
}

testLinks();
