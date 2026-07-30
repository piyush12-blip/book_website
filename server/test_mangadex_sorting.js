const axios = require('axios');

async function testManga(mangaId, titleName) {
    console.log(`\n=== Testing ${titleName} (${mangaId}) ===`);
    // Query MangaDex specifically for English chapters
    const res = await axios.get(`https://api.mangadex.org/manga/${mangaId}/feed`, {
        params: {
            'translatedLanguage[]': 'en',
            'order[volume]': 'asc',
            'order[chapter]': 'asc',
            limit: 500
        },
        headers: { 'User-Agent': 'Bibliotheque/1.0' }
    });

    const items = res.data.data;
    console.log(`Total English feed items returned: ${items.length}`);

    // Map and filter chapters
    const chapters = items
        .filter(ch => (ch.attributes.pages || 0) > 0) // Must have actual pages
        .map(ch => {
            const vol = ch.attributes.volume ? `Vol.${ch.attributes.volume} ` : '';
            const num = parseFloat(ch.attributes.chapter) || 0;
            const title = ch.attributes.title || `Chapter ${ch.attributes.chapter}`;
            return {
                id: ch.id,
                num: num,
                vol: ch.attributes.volume || '',
                label: `${vol}Ch.${ch.attributes.chapter} — ${title}`,
                pages: ch.attributes.pages
            };
        });

    // Deduplicate by chapter number (keep the one with most pages or first)
    const uniqueMap = {};
    for (const c of chapters) {
        if (!uniqueMap[c.num] || c.pages > uniqueMap[c.num].pages) {
            uniqueMap[c.num] = c;
        }
    }

    // Sort strictly numerical: 1, 2, 3...
    const sorted = Object.values(uniqueMap).sort((a, b) => a.num - b.num);

    console.log(`Unique chapters with pages > 0: ${sorted.length}`);
    if (sorted.length > 0) {
        console.log('First 5 chapters:');
        sorted.slice(0, 5).forEach(c => console.log(`  - ${c.label} (${c.pages} pages)`));
        console.log('Last 3 chapters:');
        sorted.slice(-3).forEach(c => console.log(`  - ${c.label} (${c.pages} pages)`));
    } else {
        console.log('NO ENGLISH CHAPTERS AVAILABLE WITH PAGES > 0!');
    }
}

async function run() {
    await testManga('304ceac3-8cdb-4fe7-acf7-2b6ff7a60613', 'Attack on Titan');
    await testManga('4141c5dc-c525-4df5-afd7-cc7d192a832f', 'Blue Lock');
    await testManga('4452195d-58ab-4b76-85d5-297add0e9b06', 'Lord of the Mysteries');
}

run().catch(console.error);
