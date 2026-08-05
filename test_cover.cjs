const axios = require('axios');

async function fetchBookCoverImage(query) {
    try {
        // 1. Try Google Books API
        const gRes = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`, { timeout: 4000 });
        const item = gRes.data?.items?.[0]?.volumeInfo;
        const img = item?.imageLinks?.thumbnail || item?.imageLinks?.smallThumbnail;
        if (img) {
            const httpsImg = img.replace('http:', 'https:').replace('&edge=curl', '');
            console.log('[COVER] Found Google Books image for:', query, '->', httpsImg);
            return httpsImg;
        }
    } catch (e) {}

    try {
        // 2. Try OpenLibrary Search
        const olRes = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`, { timeout: 4000 });
        const doc = olRes.data?.docs?.[0];
        if (doc && doc.cover_i) {
            const olImg = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            console.log('[COVER] Found OpenLibrary image for:', query, '->', olImg);
            return olImg;
        }
    } catch (e) {}

    console.log('[COVER] No remote image found for:', query);
    return null;
}

fetchBookCoverImage("Raising Yanderes To Save The World");
fetchBookCoverImage("Infinite Cashback System");
