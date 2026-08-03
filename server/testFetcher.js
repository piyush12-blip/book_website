const { autoFetchBookFromInternet } = require('./universalInternetFetcher');
async function run() {
    console.log("Testing 1984 George Orwell...");
    const res = await autoFetchBookFromInternet('1984', 'George Orwell');
    console.log("Result:", res ? (res.chapters ? `Found ${res.chapters.length} chapters from ${res.source}` : res) : "null");
}
run();
