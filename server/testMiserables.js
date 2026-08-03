const { autoFetchBookFromInternet } = require('./universalInternetFetcher');
async function run() {
    const res = await autoFetchBookFromInternet('Les Misérables', 'Victor Hugo');
    console.log("Result:", res ? (res.chapters ? `Found ${res.chapters.length} chapters from ${res.source}` : res) : "null");
}
run();
