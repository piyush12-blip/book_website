const fs = require('fs');

const TEST_BOOKS = [
    { title: "Stoner", author: "John Williams", type: "Underrated Masterpiece" },
    { title: "The Box Man", author: "Kobo Abe", type: "Classic Avant-Garde" },
    { title: "Station Eleven", author: "Emily St. John Mandel", type: "Modern Post-Apocalyptic" },
    { title: "The Dictionary of Lost Words", author: "Pip Williams", type: "Historical Fiction" },
    { title: "The Book of Disquiet", author: "Fernando Pessoa", type: "Underrated Classic" },
    { title: "The Shadow of the Wind", author: "Carlos Ruiz Zafon", type: "Gothic Mystery" },
    { title: "The Lies of Locke Lamora", author: "Scott Lynch", type: "Fantasy Heist" },
    { title: "Shadow Slave", author: "Guilty3", type: "Popular Serialized Web Novel" },
    { title: "No Longer Human", author: "Osamu Dazai", type: "Classic Japanese Literature" },
    { title: "Pride and Prejudice", author: "Jane Austen", type: "Classic Romance" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", type: "Classic Fiction" },
    { title: "Anna Karenina", author: "Leo Tolstoy", type: "Classic Masterpiece" },
    { title: "War and Peace", author: "Leo Tolstoy", type: "Epic Novel" },
    { title: "The Kite Runner", author: "Khaled Hosseini", type: "Modern Classic" }
];

async function runBenchmark() {
    console.log("===============================================================================");
    console.log("🤖 STARTING AUTOMATED BOT STRESS-TEST BENCHMARK ACROSS 14 BOOKS...");
    console.log("===============================================================================\n");

    const results = [];

    for (const item of TEST_BOOKS) {
        console.log(`-------------------------------------------------------------------------------`);
        console.log(`[TESTING] "${item.title}" by ${item.author} (${item.type})`);

        // TEST 1: Title Only Query
        const startTime1 = Date.now();
        let titleOnlyRes;
        try {
            const res = await fetch(`http://localhost:3000/api/books/search?q=${encodeURIComponent(item.title)}`);
            const books = await res.json();
            if (books && books.length > 0) {
                const topBook = books[0];
                const chRes = await fetch(`http://localhost:3000/api/books/${topBook.id}/chapters?q=${encodeURIComponent(topBook.title + ' ' + topBook.author)}`);
                titleOnlyRes = await chRes.json();
            }
        } catch(e) {
            titleOnlyRes = { error: e.message };
        }
        const time1 = Date.now() - startTime1;

        // TEST 2: Title + Author Query
        const startTime2 = Date.now();
        let dualLockRes;
        try {
            const query = `${item.title} ${item.author}`;
            const res = await fetch(`http://localhost:3000/api/books/search?q=${encodeURIComponent(query)}`);
            const books = await res.json();
            if (books && books.length > 0) {
                const topBook = books[0];
                const chRes = await fetch(`http://localhost:3000/api/books/${topBook.id}/chapters?q=${encodeURIComponent(query)}`);
                dualLockRes = await chRes.json();
            }
        } catch(e) {
            dualLockRes = { error: e.message };
        }
        const time2 = Date.now() - startTime2;

        const summary = {
            book: item.title,
            author: item.author,
            titleOnly: {
                timeMs: time1,
                source: titleOnlyRes?.source || 'Unknown',
                chapters: titleOnlyRes?.chapters ? titleOnlyRes.chapters.length : 0,
                epubUrl: titleOnlyRes?.epubUrl || null,
                isFallback: titleOnlyRes?.isFallback || false
            },
            dualLock: {
                timeMs: time2,
                source: dualLockRes?.source || 'Unknown',
                chapters: dualLockRes?.chapters ? dualLockRes.chapters.length : 0,
                epubUrl: dualLockRes?.epubUrl || null,
                isFallback: dualLockRes?.isFallback || false
            }
        };

        results.push(summary);

        console.log(`  └─ Title Only   : ${summary.titleOnly.timeMs}ms | Source: ${summary.titleOnly.source} | Chapters: ${summary.titleOnly.chapters} | EPUB: ${summary.titleOnly.epubUrl ? 'YES' : 'NO'}`);
        console.log(`  └─ Title+Author : ${summary.dualLock.timeMs}ms | Source: ${summary.dualLock.source} | Chapters: ${summary.dualLock.chapters} | EPUB: ${summary.dualLock.epubUrl ? 'YES' : 'NO'}`);
    }

    console.log("\n===============================================================================");
    console.log("📊 BENCHMARK SUMMARY SUMMARY REPORT");
    console.log("===============================================================================");
    console.table(results.map(r => ({
        Book: r.book,
        Author: r.author,
        "Title-Only Time": `${r.titleOnly.timeMs}ms`,
        "Title-Only Source": r.titleOnly.source,
        "Title-Only Chs": r.titleOnly.chapters,
        "Dual-Lock Time": `${r.dualLock.timeMs}ms`,
        "Dual-Lock Source": r.dualLock.source,
        "Dual-Lock Chs": r.dualLock.chapters,
        "Direct Stream": (r.dualLock.epubUrl || r.dualLock.chapters > 10) ? '✅ Real Text/EPUB' : '🏴‍☠️ 1-Click Backdoor'
    })));
}

runBenchmark();
