const { fetchDirectDocumentText } = require('./directDocumentScraper');
const { fetchInternetArchiveEpub } = require('./internetArchiveScraper');

async function testUnderratedPaidBooks() {
    console.log("=== AUDITING DIRECT DOCUMENT SCRAPER SUCCESS RATE ON 10 PAID COMMERCIAL BOOKS ===");

    const books = [
        { title: "The Name of the Wind", author: "Patrick Rothfuss" },
        { title: "Project Hail Mary", author: "Andy Weir" },
        { title: "Atomic Habits", author: "James Clear" },
        { title: "Verity", author: "Colleen Hoover" },
        { title: "The Midnight Library", author: "Matt Haig" },
        { title: "Where the Crawdads Sing", author: "Delia Owens" },
        { title: "Dark Matter", author: "Blake Crouch" },
        { title: "Red Rising", author: "Pierce Brown" },
        { title: "The Martian", author: "Andy Weir" },
        { title: "Klara and the Sun", author: "Kazuo Ishiguro" }
    ];

    let successCount = 0;
    const details = [];

    for (const b of books) {
        console.log(`\n[TESTING] "${b.title}" by ${b.author}...`);
        const query = `${b.title} ${b.author}`;
        
        let foundText = null;
        let charCount = 0;
        let method = "None";

        // Try direct document scraper
        try {
            const docRes = await fetchDirectDocumentText(query);
            if (docRes && docRes.length > 5000) {
                foundText = docRes;
                charCount = docRes.length;
                method = "DirectDocumentManifest";
            }
        } catch (e) {}

        // If direct doc failed, try IA EPUB scraper
        if (!foundText) {
            try {
                const iaRes = await fetchInternetArchiveEpub(query);
                if (iaRes && iaRes.chapters && iaRes.chapters.length > 0) {
                    foundText = iaRes.chapters.map(c => c.html).join('');
                    charCount = foundText.length;
                    method = "ArchiveEpubDirect";
                }
            } catch (e) {}
        }

        if (foundText) {
            successCount++;
            console.log(`✅ SUCCESS: Pulled ${charCount} chars of REAL text via ${method}`);
            details.push({ title: b.title, status: "SUCCESS", charCount, method });
        } else {
            console.log(`❌ LOCKED: Server CDL wall active, no raw text stream found`);
            details.push({ title: b.title, status: "LOCKED", charCount: 0, method: "None" });
        }
    }

    const successRate = ((successCount / books.length) * 100).toFixed(1);
    console.log("\n==========================================");
    console.log(`TOTAL AUDITED: ${books.length}`);
    console.log(`SUCCESSFUL REAL TEXT EXTRACTS: ${successCount}`);
    console.log(`EXACT DIRECT SUCCESS RATE: ${successRate}%`);
    console.log("==========================================");
    console.log(JSON.stringify(details, null, 2));
}

testUnderratedPaidBooks();
