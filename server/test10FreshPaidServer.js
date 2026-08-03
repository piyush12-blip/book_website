const { autoFetchBookFromInternet } = require('./universalInternetFetcher');

async function test10FreshPaidServer() {
    console.log("=== STEP 1: SERVER-SIDE DIRECT FETCHER AUDIT (10 FRESH PAID BOOKS) ===");

    const books = [
        { title: "A Court of Thorns and Roses", author: "Sarah J. Maas" },
        { title: "The Housemaid", author: "Freida McFadden" },
        { title: "Red White and Royal Blue", author: "Casey McQuiston" },
        { title: "The Atlas Six", author: "Olivie Blake" },
        { title: "Normal People", author: "Sally Rooney" },
        { title: "Sea of Tranquility", author: "Emily St. John Mandel" },
        { title: "The Priory of the Orange Tree", author: "Samantha Shannon" },
        { title: "Beach Read", author: "Emily Henry" },
        { title: "Klara and the Sun", author: "Kazuo Ishiguro" },
        { title: "The Push", author: "Ashley Audrain" }
    ];

    let realTextCount = 0;
    let lockedCount = 0;
    const results = [];

    for (const b of books) {
        console.log(`\n[SERVER TEST] Fetching: "${b.title}" by ${b.author}...`);
        try {
            const res = await autoFetchBookFromInternet(b.title, b.author);
            if (res && res.chapters && res.chapters.length > 0 && res.source !== 'UniversalEngine' && res.source !== 'LockedDRM') {
                const totalChars = res.chapters.reduce((sum, c) => sum + (c.html ? c.html.length : 0), 0);
                if (totalChars > 30000) {
                    realTextCount++;
                    const snippet = res.chapters[0].html.substring(0, 150).replace(/<[^>]*>/g, '');
                    console.log(`✅ REAL TEXT! ${totalChars} chars | Source: ${res.source} | Snippet: "${snippet}"`);
                    results.push({ title: b.title, status: "✅ REAL TEXT", chars: totalChars, source: res.source, snippet });
                } else {
                    lockedCount++;
                    console.log(`🔒 LOCKED / SHORT TEXT (DRM Active)`);
                    results.push({ title: b.title, status: "🔒 LOCKED (Backdoor Trigger)", chars: totalChars, source: res.source, snippet: "" });
                }
            } else {
                lockedCount++;
                console.log(`🔒 LOCKED (Backdoor Trigger)`);
                results.push({ title: b.title, status: "🔒 LOCKED (Backdoor Trigger)", chars: 0, source: res.source || 'LockedDRM', snippet: "" });
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            results.push({ title: b.title, status: `❌ ERROR (${e.message})`, chars: 0, source: "Error", snippet: "" });
        }
    }

    const rate = ((realTextCount / books.length) * 100).toFixed(1);
    console.log("\n==========================================");
    console.log(`SERVER-SIDE TEST COMPLETE!`);
    console.log(`TOTAL TESTED: ${books.length}`);
    console.log(`REAL TEXT SUCCESSES: ${realTextCount}`);
    console.log(`BACKDOOR TRIGGERS (DRM): ${lockedCount}`);
    console.log(`SERVER SUCCESS RATE: ${rate}%`);
    console.log("==========================================");
    console.log(JSON.stringify(results, null, 2));
}

test10FreshPaidServer();
