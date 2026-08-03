const { fetchDirectDocumentText } = require('./directDocumentScraper');

async function test10NewPaidBooks() {
    console.log("=== TESTING 10 BRAND NEW UNTESTED PAID BOOKS & NOVELS ===");

    const books = [
        { title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid" },
        { title: "Fourth Wing", author: "Rebecca Yarros" },
        { title: "Lessons in Chemistry", author: "Bonnie Garmus" },
        { title: "Tomorrow, and Tomorrow, and Tomorrow", author: "Gabrielle Zevin" },
        { title: "The Song of Achilles", author: "Madeline Miller" },
        { title: "House of Earth and Blood", author: "Sarah J. Maas" },
        { title: "Yellowface", author: "R.F. Kuang" },
        { title: "Babel", author: "R.F. Kuang" },
        { title: "I'm Glad My Mom Died", author: "Jennette McCurdy" },
        { title: "The Guest List", author: "Lucy Foley" }
    ];

    let successCount = 0;
    const results = [];

    for (const b of books) {
        console.log(`\n[AUDITING] "${b.title}" by ${b.author}...`);
        try {
            const chapters = await fetchDirectDocumentText(b.title, b.author);
            if (chapters && chapters.length > 0) {
                const totalChars = chapters.reduce((sum, c) => sum + (c.html ? c.html.length : 0), 0);
                if (totalChars > 30000) {
                    successCount++;
                    console.log(`✅ REAL TEXT FOUND! Extracted ${totalChars} chars across ${chapters.length} chapters.`);
                    results.push({ title: b.title, author: b.author, status: "✅ REAL TEXT", charCount: totalChars });
                } else {
                    console.log(`🔒 LOCKED / SHORT (CDL Active)`);
                    results.push({ title: b.title, author: b.author, status: "🔒 LOCKED", charCount: totalChars });
                }
            } else {
                console.log(`🔒 LOCKED (CDL Active)`);
                results.push({ title: b.title, author: b.author, status: "🔒 LOCKED", charCount: 0 });
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
            results.push({ title: b.title, author: b.author, status: "❌ ERROR", charCount: 0 });
        }
    }

    const rate = ((successCount / books.length) * 100).toFixed(1);
    console.log("\n==========================================");
    console.log(`TOTAL NEW AUDITED: ${books.length}`);
    console.log(`SUCCESSFUL REAL TEXT EXTRACTS: ${successCount}`);
    console.log(`EXACT SUCCESS RATE: ${rate}%`);
    console.log("==========================================");
    console.log(JSON.stringify(results, null, 2));
}

test10NewPaidBooks();
