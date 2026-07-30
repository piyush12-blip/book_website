const axios = require('axios');

async function testPopularManga(title) {
    try {
        const search = await axios.get(`https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1`);
        if (!search.data.data.length) return;
        const manga = search.data.data[0];
        const mangaId = manga.id;
        const name = manga.attributes.title.en || title;

        const feed = await axios.get(`https://api.mangadex.org/manga/${mangaId}/feed`, {
            params: {
                'translatedLanguage[]': 'en',
                'order[chapter]': 'asc',
                limit: 500
            }
        });

        const validChapters = feed.data.data.filter(c => (c.attributes.pages || 0) > 0);
        console.log(`[${name}] Found ${validChapters.length} English chapters with pages.`);
        if (validChapters.length > 0) {
            console.log(`   Sample Ch. 1: ${validChapters[0].attributes.chapter} (${validChapters[0].attributes.pages} pages)`);
        }
    } catch (e) {
        console.log(`Error testing ${title}: ${e.message}`);
    }
}

async function run() {
    await testPopularManga('Solo Leveling');
    await testPopularManga('Chainsaw Man');
    await testPopularManga('Jujutsu Kaisen');
    await testPopularManga('Berserk');
    await testPopularManga('Tower of God');
}

run();
