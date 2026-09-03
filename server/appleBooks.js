const axios = require('axios');

const ITUNES_SEARCH_CACHE = new Map();

/**
 * Search Apple Books eBook catalog
 * Free, public, no API key required, fast response (<200ms)
 */
async function searchAppleBooks(query) {
    if (!query || query.trim().length < 2) return [];
    const cleanQ = query.trim().toLowerCase();

    if (ITUNES_SEARCH_CACHE.has(cleanQ)) {
        return ITUNES_SEARCH_CACHE.get(cleanQ);
    }

    try {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=ebook&limit=15`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 5000
        });

        if (!res.data || !Array.isArray(res.data.results)) return [];

        const results = [];
        const seenTitles = new Set();

        for (const item of res.data.results) {
            const title = item.trackName || item.trackCensoredName;
            if (!title) continue;

            const genres = Array.isArray(item.genres) ? item.genres : [];
            const isMangaOrComic = genres.some(g => {
                const lower = g.toLowerCase();
                return lower.includes('manga') || lower.includes('comic') || lower.includes('graphic novel');
            }) || title.toLowerCase().includes('(comic)');

            // Skip comic/manga volumes from Apple Books so they don't clash with our dedicated manga scrapers!
            if (isMangaOrComic) continue;

            // Collapse multiple volumes (e.g. "Vol. I", "Vol. II", "Volume 1", "Vol 2") into a single master title
            const baseBookTitle = title
                .replace(/\s*[,.:;-]?\s*(?:a\s+novel\s*)?[,.:;-]?\s*vol(?:ume)?\.?\s*[0-9ivxlcdm]+/gi, '')
                .replace(/\s*\(?(?:book|vol(?:ume)?|part)\s*[0-9ivxlcdm]+\)?/gi, '')
                .replace(/\s*[,.:;-]\s*vol(?:ume)?\.?\s*$/i, '')
                .replace(/\s+/g, ' ')
                .trim();

            const normTitle = (baseBookTitle || title).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seenTitles.has(normTitle)) continue;
            seenTitles.add(normTitle);

            // Use the clean base book title if volume was stripped
            const cleanDisplayTitle = baseBookTitle.length >= 3 ? baseBookTitle : title;

            // Clean 1000x1000 HD cover
            let coverUrl = item.artworkUrl100 || '';
            if (coverUrl) {
                coverUrl = coverUrl.replace(/100x100bb\.(jpg|png|webp)/i, '1000x1000bb.jpg');
            }

            // Clean description of HTML tags
            const rawDesc = item.description || '';
            const cleanDesc = rawDesc
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#xa0;/g, ' ')
                .trim();

            const isLightNovel = genres.some(g => g.toLowerCase().includes('light novel')) || title.toLowerCase().includes('light novel');

            const yearStr = item.releaseDate ? item.releaseDate.slice(0, 4) : '';
            const author = item.artistName || 'Author';

            results.push({
                id: `itunes-${item.trackId}`,
                trackId: item.trackId,
                title: cleanDisplayTitle,
                altTitle: '',
                author: author,
                cover: coverUrl,
                image: coverUrl,
                banner: coverUrl,
                lines: cleanDisplayTitle.split(' ').slice(0, 3).join('<br>'),
                genre: isLightNovel ? 'LIGHT NOVEL' : 'BOOK',
                mood: genres[0] || 'Bestseller',
                year: yearStr,
                status: 'Completed',
                pages: 350,
                rating: item.averageUserRating || 4.8,
                synopsis: cleanDesc || `${title} by ${author}. Published in ${yearStr || 'recent years'}. Available for instant reading and download.`,
                hasEpub: true,
                format: isLightNovel ? 'Light Novel' : 'Book',
                genres: genres.filter(g => g !== 'Books'),
                price: item.formattedPrice || 'Free',
                appleUrl: item.trackViewUrl,
                _source: 'AppleBooks',
                _isDirectSearchMatch: true
            });
        }

        ITUNES_SEARCH_CACHE.set(cleanQ, results);
        return results;
    } catch (err) {
        console.error(`[APPLE-BOOKS] Search error for "${query}":`, err.message);
        return [];
    }
}

module.exports = {
    searchAppleBooks
};
