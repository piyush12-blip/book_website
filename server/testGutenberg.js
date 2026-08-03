const { fetchGutenbergChapters } = require('./gutendex');
async function run() {
    const res = await fetchGutenbergChapters('Pride and Prejudice', 'Jane Austen');
    console.log('Gutenberg Result:', res ? `Found ${res.chapters.length} real chapters!` : 'Failed');
}
run();
