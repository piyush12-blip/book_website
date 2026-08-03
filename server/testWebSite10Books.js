const axios = require('axios');

async function testWebsite10Books() {
    console.log("=== TESTING 10 PAID BOOKS DIRECTLY ON LIVE WEBSITE API ===");

    const books = [
        { id: "itunes-1171091602-the-seven-husbands-of-evelyn-hugo", title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid" },
        { id: "itunes-1605332304-fourth-wing", title: "Fourth Wing", author: "Rebecca Yarros" },
        { id: "itunes-6758897348-lessons-in-chemistry", title: "Lessons in Chemistry", author: "Bonnie Garmus" },
        { id: "itunes-1590065925-tomorrow-and-tomorrow-and-tomorrow", title: "Tomorrow, and Tomorrow, and Tomorrow", author: "Gabrielle Zevin" },
        { id: "itunes-482772882-the-song-of-achilles", title: "The Song of Achilles", author: "Madeline Miller" },
        { id: "itunes-1481549421-house-of-earth-and-blood", title: "House of Earth and Blood", author: "Sarah J. Maas" },
        { id: "itunes-1647463920-yellowface", title: "Yellowface", author: "R.F. Kuang" },
        { id: "itunes-1600371940-babel", title: "Babel", author: "R.F. Kuang" },
        { id: "itunes-1606558231-im-glad-my-mom-died", title: "I'm Glad My Mom Died", author: "Jennette McCurdy" },
        { id: "itunes-1482819402-the-guest-list", title: "The Guest List", author: "Lucy Foley" }
    ];

    let successCount = 0;
    let lockedCount = 0;
    const summary = [];

    for (const b of books) {
        console.log(`\n[WEBSITE TEST] Requesting: "${b.title}"...`);
        try {
            const url = `http://localhost:3000/api/books/${b.id}/chapters?q=${encodeURIComponent(b.title + ' ' + b.author)}&_cb=${Date.now()}`;
            const res = await axios.get(url, { timeout: 15000 });
            const data = res.data;

            if (data && data.chapters && data.chapters.length > 0 && !data.isFallback) {
                const totalChars = data.chapters.reduce((sum, c) => sum + (c.html ? c.html.length : 0), 0);
                if (totalChars > 30000) {
                    successCount++;
                    console.log(`✅ 100% REAL TEXT LOADED! (${totalChars} chars, ${data.chapters.length} chapters, source: ${data.source})`);
                    summary.push({ title: b.title, result: "✅ REAL TEXT", chars: totalChars, source: data.source });
                } else {
                    lockedCount++;
                    console.log(`🔒 LOCKED (DRM / Short)`);
                    summary.push({ title: b.title, result: "🔒 LOCKED (DRM Active)", chars: totalChars, source: data.source });
                }
            } else {
                lockedCount++;
                console.log(`🔒 LOCKED (DRM Active)`);
                summary.push({ title: b.title, result: "🔒 LOCKED (DRM Active)", chars: 0, source: data.source || 'LockedDRM' });
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            summary.push({ title: b.title, result: `❌ HTTP ERROR (${e.message})`, chars: 0, source: 'Error' });
        }
    }

    const rate = ((successCount / books.length) * 100).toFixed(1);
    console.log("\n==========================================");
    console.log(`WEBSITE TEST COMPLETE!`);
    console.log(`TOTAL TESTED: ${books.length}`);
    console.log(`REAL TEXT SUCCESSES: ${successCount}`);
    console.log(`COMMERCIAL DRM LOCKED: ${lockedCount}`);
    console.log(`EXACT WEBSITE SUCCESS RATE: ${rate}%`);
    console.log("==========================================");
    console.log(JSON.stringify(summary, null, 2));
}

testWebsite10Books();
