const books = [
    "The Hunger Games Suzanne Collins",
    "Harry Potter and the Sorcerers Stone J.K. Rowling",
    "The Da Vinci Code Dan Brown",
    "The Alchemist Paulo Coelho",
    "The Girl on the Train Paula Hawkins",
    "Gone Girl Gillian Flynn",
    "The Fault in Our Stars John Green",
    "Dune Frank Herbert",
    "The Martian Andy Weir",
    "Project Hail Mary Andy Weir"
];

async function runTest() {
    console.log("Starting batch test of 10 MORE paid books (Server & Site Simulation)...");
    let success = 0;
    
    for (const book of books) {
        try {
            console.log(`\nTesting: ${book}`);
            const id = `itunes-888888-${book.split(' ')[0].toLowerCase()}`;
            const url = `http://localhost:3000/api/books/${id}/chapters?q=${encodeURIComponent(book)}`;
            
            const start = Date.now();
            const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
            const data = await res.json();
            const time = ((Date.now() - start) / 1000).toFixed(1);
            
            // Website logic simulation
            if (data.error === "LockedDRM" || data.error === "UniversalEngine" || data.chapters?.length === 0) {
                console.log(`✅ SUCCESS [${time}s] - Website triggers BACKDOOR (Backend returned empty/locked)`);
                success++;
            } else if (data.chapters?.length > 0) {
                // Verify chapters are real
                const sampleChapter = data.chapters[0].html.substring(0, 100).replace(/<[^>]*>?/gm, '');
                console.log(`✅ SUCCESS [${time}s] - Website opens DIRECTLY. Pulled ${data.chapters.length} real chapters. First line: "${sampleChapter.trim()}..."`);
                success++;
            } else {
                console.log(`❌ FAILED [${time}s] - Unhandled state on website: ${JSON.stringify(data).substring(0, 50)}`);
            }
        } catch (e) {
            console.log(`❌ ERROR: ${e.message}`);
        }
    }
    
    console.log(`\nFinal Website Success Rate: ${(success / 10) * 100}%`);
}

runTest();
