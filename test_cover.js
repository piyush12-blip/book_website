async function fetchBookCoverImage(query) {
    try {
        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`);
        const data = await gRes.json();
        const item = data?.items?.[0]?.volumeInfo;
        const img = item?.imageLinks?.thumbnail || item?.imageLinks?.smallThumbnail;
        if (img) {
            const httpsImg = img.replace('http:', 'https:').replace('&edge=curl', '');
            console.log('[COVER] Found Google Books image for:', query, '->', httpsImg);
            return httpsImg;
        }
    } catch (e) {}

    try {
        const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
        const data = await olRes.json();
        const doc = data?.docs?.[0];
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
