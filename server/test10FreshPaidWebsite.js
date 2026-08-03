const axios = require('axios');

async function test10FreshPaidWebsite() {
    console.log("=== STEP 2: WEBSITE LIVE HTTP API AUDIT (10 FRESH PAID BOOKS) ===");

    const books = [
        { id: "itunes-1481549421-a-court-of-thorns-and-roses", title: "A Court of Thorns and Roses", author: "Sarah J. Maas" },
        { id: "itunes-1605332304-the-housemaid", title: "The Housemaid", author: "Freida McFadden" },
        { id: "itunes-1482819402-red-white-and-royal-blue", title: "Red White and Royal Blue", author: "Casey McQuiston" },
        { id: "itunes-1600371940-the-atlas-six", title: "The Atlas Six", author: "Olivie Blake" },
        { id: "itunes-1481549422-normal-people", title: "Normal People", author: "Sally Rooney" },
        { id: "itunes-1590065926-sea-of-tranquility", title: "Sea of Tranquility", author: "Emily St. John Mandel" },
        { id: "itunes-1481549423-the-priory-of-the-orange-tree", title: "The Priory of the Orange Tree", author: "Samantha Shannon" },
        { id: "itunes-1481549424-beach-read", title: "Beach Read", author: "Emily Henry" },
        { id: "itunes-1590065927-klara-and-the-sun", title: "Klara and the Sun", author: "Kazuo Ishiguro" },
        { id: "itunes-1481549425-the-push", title: "The Push", author: "Ashley Audrain" }
    ];

    let realTextCount = 0;
    let backdoorTriggerCount = 0;
    const results = [];

    for (const b of books) {
        console.log(`\n[WEBSITE TEST] Requesting: "${b.title}"...`);
        try {
            const url = `http://localhost:3000/api/books/${b.id}/chapters?q=${encodeURIComponent(b.title + ' ' + b.author)}&_cb=${Date.now()}`;
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data;

            if (data && data.chapters && data.chapters.length > 0 && data.source !== 'UniversalEngine' && data.source !== 'LockedDRM') {
                const totalChars = data.chapters.reduce((sum, c) => sum + (c.html ? c.html.length : 0), 0);
                if (totalChars > 30000) {
                    realTextCount++;
                    const snippet = data.chapters[0].html.substring(0, 150).replace(/<[^>]*>/g, '');
                    console.log(`✅ 100% REAL TEXT LOADED! (${totalChars} chars, ${data.chapters.length} chs, source: ${data.source})`);
                    results.push({ title: b.title, result: "✅ REAL TEXT", chars: totalChars, source: data.source, snippet });
                } else {
                    backdoorTriggerCount++;
                    console.log(`🏴‍☠️ DRM LOCKED -> Backdoor Card Triggered!`);
                    results.push({ title: b.title, result: "🏴‍☠️ BACKDOOR TRIGGER (DRM)", chars: totalChars, source: data.source || 'LockedDRM', snippet: "" });
                }
            } else {
                backdoorTriggerCount++;
                console.log(`🏴‍☠️ DRM LOCKED -> Backdoor Card Triggered!`);
                results.push({ title: b.title, result: "🏴‍☠️ BACKDOOR TRIGGER (DRM)", chars: 0, source: data.source || 'LockedDRM', snippet: "" });
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            results.push({ title: b.title, result: `❌ HTTP ERROR (${e.message})`, chars: 0, source: 'Error', snippet: "" });
        }
    }

    const rate = ((realTextCount / books.length) * 100).toFixed(1);
    console.log("\n==========================================");
    console.log(`WEBSITE LIVE API TEST COMPLETE!`);
    console.log(`TOTAL TESTED: ${books.length}`);
    console.log(`REAL TEXT SUCCESSES: ${realTextCount}`);
    console.log(`BACKDOOR BUTTON TRIGGERS: ${backdoorTriggerCount}`);
    console.log(`EXACT WEBSITE SUCCESS RATE: ${rate}%`);
    console.log("==========================================");
    console.log(JSON.stringify(results, null, 2));
}

test10FreshPaidWebsite();
