const axios = require('axios');

const books = [
    "The Midnight Library Matt Haig",
    "It Ends with Us Colleen Hoover",
    "Where the Crawdads Sing Delia Owens",
    "The Silent Patient Alex Michaelides",
    "Lessons in Chemistry Bonnie Garmus",
    "Fourth Wing Rebecca Yarros",
    "Happy Place Emily Henry",
    "Tomorrow, and Tomorrow, and Tomorrow Gabrielle Zevin",
    "Verity Colleen Hoover",
    "A Court of Thorns and Roses Sarah J. Maas"
];

async function runTest() {
    console.log("Starting batch test of 10 paid books with increased timeouts (30s)...");
    let success = 0;
    
    for (const book of books) {
        try {
            console.log(`\nTesting: ${book}`);
            // Mock iTunes ID generation for testing
            const id = `itunes-999999-${book.split(' ')[0].toLowerCase()}`;
            const url = `http://localhost:3000/api/books/${id}/chapters?q=${encodeURIComponent(book)}`;
            
            const start = Date.now();
            const res = await axios.get(url, { timeout: 45000 });
            const time = ((Date.now() - start) / 1000).toFixed(1);
            
            if (res.data.error === "LockedDRM" || res.data.error === "UniversalEngine" || res.data.chapters?.length > 0) {
                console.log(`✅ SUCCESS [${time}s] - Triggered Backdoor/Chapters (Response: ${res.data.error || 'Found Chapters'})`);
                success++;
            } else {
                console.log(`❌ FAILED [${time}s] - Unhandled state: ${JSON.stringify(res.data).substring(0, 50)}`);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }
    
    console.log(`\nFinal Success Rate: ${(success / 10) * 100}%`);
}

runTest();
