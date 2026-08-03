const { autoFetchBookFromInternet } = require('./universalInternetFetcher');
const { resolveAIBookKnowledge } = require('./aiKnowledgeResolver');

async function testSuite() {
    console.log("=== COMPREHENSIVE 15-BOOK TEST SUITE ===");

    const categories = {
        publicDomain: [
            { title: "Pride and Prejudice", author: "Jane Austen" },
            { title: "Frankenstein", author: "Mary Shelley" },
            { title: "Dracula", author: "Bram Stoker" },
            { title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle" },
            { title: "Alice's Adventures in Wonderland", author: "Lewis Carroll" }
        ],
        webNovels: [
            { title: "Beware of Chicken", author: "CasualFarmer" },
            { title: "Mother of Learning", author: "nobody103" },
            { title: "The Primal Hunter", author: "Zogarth" },
            { title: "He Who Fights with Monsters", author: "Shirtaloon" },
            { title: "Defiance of the Fall", author: "TheFirstDefier" }
        ],
        paidBooks: [
            { title: "The Broker", author: "John Grisham", id: "itunes-1" },
            { title: "The Silent Patient", author: "Alex Michaelides", id: "itunes-2" },
            { title: "Dune", author: "Frank Herbert", id: "itunes-3" },
            { title: "The Da Vinci Code", author: "Dan Brown", id: "itunes-4" },
            { title: "Harry Potter and the Sorcerer's Stone", author: "J.K. Rowling", id: "itunes-5" }
        ]
    };

    const results = { publicDomain: [], webNovels: [], paidBooks: [] };

    console.log("\n--- 1. TESTING PUBLIC DOMAIN BOOKS (Gutenberg) ---");
    for (const b of categories.publicDomain) {
        try {
            const res = await autoFetchBookFromInternet(b.title, b.author);
            const isReal = res && res.chapters && res.chapters.length > 0 && res.source === 'Gutenberg';
            results.publicDomain.push({
                title: b.title,
                source: res ? res.source : 'None',
                chaptersCount: res && res.chapters ? res.chapters.length : 0,
                status: isReal ? '✅ PASS (Real Gutenberg Text)' : '⚠️ FALLBACK'
            });
        } catch (e) {
            results.publicDomain.push({ title: b.title, status: '❌ ERROR: ' + e.message });
        }
    }

    console.log("\n--- 2. TESTING WEB NOVELS (RoyalRoad) ---");
    for (const b of categories.webNovels) {
        try {
            const res = await autoFetchBookFromInternet(b.title, b.author);
            const isReal = res && res.chapters && res.chapters.length > 0 && (res.source === 'RoyalRoad' || res.source === 'WebNovel');
            results.webNovels.push({
                title: b.title,
                source: res ? res.source : 'None',
                chaptersCount: res && res.chapters ? res.chapters.length : 0,
                status: isReal ? '✅ PASS (Real WebNovel/RoyalRoad Text)' : '⚠️ FALLBACK'
            });
        } catch (e) {
            results.webNovels.push({ title: b.title, status: '❌ ERROR: ' + e.message });
        }
    }

    console.log("\n--- 3. TESTING PAID COMMERCIAL BOOKS (AI Knowledge & Backdoor) ---");
    for (const b of categories.paidBooks) {
        try {
            const res = await autoFetchBookFromInternet(b.title, b.author, b.id);
            const isAiResolved = res && res.chapters && res.chapters.length > 0 && res.source === 'AiKnowledgeResolver';
            results.paidBooks.push({
                title: b.title,
                source: res ? res.source : 'None',
                chaptersCount: res && res.chapters ? res.chapters.length : 0,
                status: isAiResolved ? '✅ PASS (Real AI Knowledge Resolver)' : (res && res.source === 'UniversalEngine' ? '⚡ PASS (Universal Backdoor Engine)' : '❌ FAIL')
            });
        } catch (e) {
            results.paidBooks.push({ title: b.title, status: '❌ ERROR: ' + e.message });
        }
    }

    console.log("\n=== FINAL TEST RESULTS ===");
    console.log(JSON.stringify(results, null, 2));
}

testSuite();
