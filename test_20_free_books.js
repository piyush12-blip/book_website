const freeBooks = [
    { title: "Pride and Prejudice", author: "Jane Austen" },
    { title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle" },
    { title: "Frankenstein", author: "Mary Shelley" },
    { title: "Dracula", author: "Bram Stoker" },
    { title: "Jane Eyre", author: "Charlotte Brontë" },
    { title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" },
    { title: "Great Expectations", author: "Charles Dickens" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
    { title: "Crime and Punishment", author: "Fyodor Dostoevsky" },
    { title: "The Picture of Dorian Gray", author: "Oscar Wilde" },
    { title: "Moby Dick", author: "Herman Melville" },
    { title: "A Tale of Two Cities", author: "Charles Dickens" },
    { title: "Treasure Island", author: "Robert Louis Stevenson" },
    { title: "War and Peace", author: "Leo Tolstoy" },
    { title: "The Count of Monte Cristo", author: "Alexandre Dumas" },
    { title: "Les Misérables", author: "Victor Hugo" },
    { title: "Little Women", author: "Louisa May Alcott" },
    { title: "The Odyssey", author: "Homer" },
    { title: "The Scarlet Letter", author: "Nathaniel Hawthorne" },
    { title: "The Metamorphosis", author: "Franz Kafka" }
];

async function runFreeBooksAudit() {
    console.log("=== 20 FREE PUBLIC DOMAIN BOOKS AUDIT ===\n");
    let success = 0;
    
    for (const b of freeBooks) {
        const query = `${b.title} ${b.author}`;
        const id = `itunes-11111-${b.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const url = `http://localhost:3000/api/books/${id}/chapters?q=${encodeURIComponent(query)}`;
        
        try {
            const start = Date.now();
            const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
            const data = await res.json();
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            
            if (data.chapters && data.chapters.length > 0) {
                const firstChapter = data.chapters[0]?.html || '';
                const cleanSample = firstChapter.replace(/<[^>]*>?/gm, '').substring(0, 200).replace(/\s+/g, ' ');
                console.log(`✅ SUCCESS [${b.title} by ${b.author}] (${duration}s)
   -> SERVER: Found ${data.chapters.length} Real Chapters
   -> SITE DISPLAY: Direct Open English Story
   -> SAMPLE: "${cleanSample.substring(0, 80)}..."\n`);
                success++;
            } else {
                console.log(`🔒 BACKDOOR [${b.title} by ${b.author}] (${duration}s) -> Triggered Backdoor Card\n`);
            }
        } catch (err) {
            console.log(`⚠️ ERROR [${b.title}]: ${err.message}\n`);
        }
    }
    
    console.log(`=== AUDIT COMPLETE: ${success} / 20 FREE BOOKS LOADED REAL TEXT DIRECTLY (${(success/20)*100}%) ===`);
}

runFreeBooksAudit();
