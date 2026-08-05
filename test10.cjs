const titles = [
    'Solo Leveling',
    'My Dress-Up Darling',
    'Blue Lock',
    'Demon Slayer',
    'Jujutsu Kaisen',
    'Chainsaw Man',
    'Omniscient Reader',
    'Tower of God',
    'Beginning After the End',
    'Berserk'
];

async function testAll() {
    console.log('==================================================');
    console.log('🎯 TESTING 10 MANGA & MANHWA TITLES ON LOCALHOST:3000');
    console.log('==================================================\n');

    for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        try {
            const res = await fetch(`http://localhost:3000/api/books/search?q=${encodeURIComponent(title)}`);
            const list = await res.json();
            console.log(`[${i+1}] Query: "${title}" -> Found ${list.length} results`);
            if (list.length > 0) {
                const top = list[0];
                console.log(`    ⭐ Top Result: ${top.title} | Author: ${top.author || 'N/A'} | Genre: ${top.genre || 'Manga'} | Source: ${top.id}`);
            } else {
                console.log(`    ❌ No results found`);
            }
            console.log('--------------------------------------------------');
        } catch(err) {
            console.log(`[${i+1}] Query: "${title}" -> Error: ${err.message}`);
        }
    }
}

testAll();
