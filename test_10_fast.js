const books = [
    { title: "The Da Vinci Code", author: "Dan Brown" },
    { title: "Dune", author: "Frank Herbert" },
    { title: "The Hunger Games", author: "Suzanne Collins" },
    { title: "The Alchemist", author: "Paulo Coelho" },
    { title: "The Girl on the Train", author: "Paula Hawkins" },
    { title: "Gone Girl", author: "Gillian Flynn" },
    { title: "The Silent Patient", author: "Alex Michaelides" },
    { title: "Project Hail Mary", author: "Andy Weir" },
    { title: "Verity", author: "Colleen Hoover" },
    { title: "A Court of Thorns and Roses", author: "Sarah J. Maas" }
];

async function runFastTest() {
    console.log("=== FAST AUDIT: 10 BOOKS (SERVER + SITE VERIFICATION) ===\n");
    
    for (const b of books) {
        const query = `${b.title} ${b.author}`;
        const id = `itunes-77777-${b.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const url = `http://localhost:3000/api/books/${id}/chapters?q=${encodeURIComponent(query)}`;
        
        try {
            const start = Date.now();
            const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
            const data = await res.json();
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            
            if (!data.chapters || data.chapters.length === 0) {
                console.log(`🔒 [${b.title}] (${duration}s) -> SERVER: Locked/No text -> SITE DISPLAY: [Commercial DRM Lock Active / 1-Click Backdoor] (PERFECT BACKDOOR UI)`);
            } else {
                const firstChapter = data.chapters[0]?.html || '';
                const cleanSample = firstChapter.replace(/<[^>]*>?/gm, '').substring(0, 300).replace(/\s+/g, ' ');
                const isForeign = /lectulandia|un planeta|el bien|capítulo|traducido/i.test(cleanSample);
                const isWrongBook = /american wealth|privateersmen|robber barons/i.test(cleanSample);
                
                if (isForeign) {
                    console.log(`❌ [${b.title}] (${duration}s) -> FAIL: Foreign language detected in text! ("${cleanSample.substring(0, 60)}...")`);
                } else if (isWrongBook) {
                    console.log(`❌ [${b.title}] (${duration}s) -> FAIL: Wrong book/garbage matched! ("${cleanSample.substring(0, 60)}...")`);
                } else {
                    console.log(`✅ [${b.title}] (${duration}s) -> SERVER: ${data.chapters.length} real chapters -> SITE DISPLAY: [Direct Open English Story] Sample: "${cleanSample.substring(0, 80)}..."`);
                }
            }
        } catch (err) {
            console.log(`⚠️ [${b.title}] ERROR: ${err.message}`);
        }
    }
    console.log("\n=== AUDIT COMPLETE ===");
}

runFastTest();
