async function fetchRealCoverImage(title) {
    if (!title) return null;
    const clean = title
        .replace(/\|\|.*$/, '')
        .replace(/\/\/.*$/, '')
        .replace(/::.*$/, '')
        .replace(/web\s*novel|light\s*novel/gi, '')
        .trim();
    // High-Res Instant Cover Art Proxy (Clean vertical manga poster, no telegram banner text)
    const coverUrl = `https://tse2.mm.bing.net/th?q=${encodeURIComponent(clean + ' manhwa manga clean cover art poster')}&w=600&h=900&c=7`;
    return coverUrl;
}

module.exports = { fetchRealCoverImage };
