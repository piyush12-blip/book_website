const titles = [
    { name: 'Solo Leveling', query: 'Solo Leveling' },
    { name: 'My Dress-Up Darling', query: 'My Dress-Up Darling' },
    { name: 'Blue Lock', query: 'Blue Lock' },
    { name: 'Demon Slayer', query: 'Demon Slayer' },
    { name: 'Jujutsu Kaisen', query: 'Jujutsu Kaisen' },
    { name: 'Chainsaw Man', query: 'Chainsaw Man' },
    { name: 'Omniscient Reader', query: 'Omniscient Reader' },
    { name: 'Tower of God', query: 'Tower of God' },
    { name: 'Beginning After the End', query: 'Beginning After the End' },
    { name: 'Berserk', query: 'Berserk' }
];

async function inspectChapters() {
    console.log('==================================================');
    console.log('🔍 INSPECTING CHAPTER COUNTS & BACKDOOR TRIGGER STATUS');
    console.log('==================================================\n');

    for (let i = 0; i < titles.length; i++) {
        const item = titles[i];
        try {
            // 1. Get Top Book ID from Search
            const searchRes = await fetch(`http://localhost:3000/api/books/search?q=${encodeURIComponent(item.query)}`);
            const searchList = await searchRes.json();

            if (!searchList.length) {
                console.log(`[${i+1}] ${item.name} -> No search results`);
                continue;
            }

            const topBook = searchList[0];
            const bookId = topBook.id;

            // 2. Fetch Chapters
            const chRes = await fetch(`http://localhost:3000/api/books/${encodeURIComponent(bookId)}/chapters?q=${encodeURIComponent(item.query)}`);
            const chData = await chRes.json();
            const chapters = chData.chapters || [];
            const isFallback = chData.isFallback || false;

            const isManga = bookId.startsWith('mangadex-') || topBook.genre === 'Manga';
            const isPartial = chapters.length < 50 || isFallback;
            const backdoorTriggered = isPartial || isManga || isFallback;

            console.log(`[${i+1}] ${item.name}`);
            console.log(`    🆔 ID: ${bookId}`);
            console.log(`    📚 Chapters Loaded: ${chapters.length} Chapters`);
            console.log(`    📖 Status: ${chapters.length >= 100 ? 'Full Release' : 'Preview / License Gap'}`);
            console.log(`    🚪 Backdoor Card Triggered? -> ${backdoorTriggered ? 'YES (Active at End of Preview)' : 'NO (Full Chapters Available)'}`);
            console.log('--------------------------------------------------');

        } catch(err) {
            console.log(`[${i+1}] ${item.name} -> Error: ${err.message}`);
        }
    }
}

inspectChapters();
