const { autoFetchBookFromInternet } = require('./universalInternetFetcher');

async function test() {
    console.log("=== TESTING PROJECT HAIL MARY WITH ITUNES TITLE NOISE ===");
    const res = await autoFetchBookFromInternet('Project Hail Mary By Andy Weir', 'Easy Reads');
    console.log("SOURCE:", res ? res.source : "None");
    if (res && res.chapters) {
        console.log("CHAPTERS COUNT:", res.chapters.length);
        console.log("SAMPLE TEXT:", res.chapters[0].html.slice(0, 300));
    }
}

test();
