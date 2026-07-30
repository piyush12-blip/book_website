const axios = require('axios');

const API = 'https://api.mangadex.org';
const UA  = { 'User-Agent': 'Bibliotheque/1.0' };

const LANG_NAMES = {
    'es': 'Spanish',
    'es-la': 'Spanish (Latin America)',
    'fr': 'French',
    'pl': 'Polish',
    'id': 'Indonesian',
    'pt-br': 'Portuguese (Brazil)',
    'de': 'German',
    'it': 'Italian',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese'
};

async function searchMangaDex(query) {
    try {
        const res = await axios.get(`${API}/manga`, {
            params: {
                title: query,
                'includes[]': 'cover_art',
                'order[relevance]': 'desc',
                limit: 6
            },
            headers: UA
        });

        const COLORS = ['navy','teal','burgundy','midnight','sage','rust','ochre','brown','grey','ivory'];

        return res.data.data.map((manga, i) => {
            const color  = COLORS[i % COLORS.length];
            const title  = manga.attributes.title.en
                        || Object.values(manga.attributes.title)[0]
                        || 'Unknown Title';

            const authorRel = manga.relationships.find(r => r.type === 'author');
            const author = authorRel?.attributes?.name || 'MangaDex Artist';

            let coverUrl = null;
            const coverArt = manga.relationships.find(r => r.type === 'cover_art');
            if (coverArt?.attributes?.fileName) {
                coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg`;
            }

            let synopsis = manga.attributes.description?.en || Object.values(manga.attributes.description || {})[0] || 'Manga from MangaDex.';
            synopsis = synopsis.replace(/<[^>]*>?/gm, '').slice(0, 400);

            const tags = (manga.attributes.tags || []).map(t => t.attributes?.name?.en).filter(Boolean).join(', ');

            return {
                id:       `mangadex-${manga.id}`,
                title,
                author,
                cover:    coverUrl ? `has-image ${color}` : color,
                image:    coverUrl,
                lines:    title.split(' ').slice(0,3).join('<br>'),
                genre:    'Manga',
                mood:     tags || 'Action',
                pages:    manga.attributes.lastChapter ? parseInt(manga.attributes.lastChapter) * 20 : 300,
                rating:   5,
                synopsis,
                hasEpub:  true
            };
        });

    } catch (err) {
        console.error('[MANGADEX] Search error:', err.message);
        return [];
    }
}

async function getMangaDexFeed(mangaId) {
    try {
        // 1. First attempt: fetch strictly English ('en')
        let feedRes = await axios.get(`${API}/manga/${mangaId}/feed`, {
            params: {
                'translatedLanguage[]': 'en',
                'order[chapter]': 'asc',
                limit: 500
            },
            headers: UA
        });

        let items = feedRes.data.data;
        let validItems = items.filter(ch => (ch.attributes.pages || 0) > 0);
        let fallbackLang = null;

        // 2. Fallback: if no English chapters exist, fetch all available languages
        if (validItems.length === 0) {
            console.log(`[MANGADEX] No English chapters for ${mangaId}. Attempting language fallback...`);
            feedRes = await axios.get(`${API}/manga/${mangaId}/feed`, {
                params: {
                    'order[chapter]': 'asc',
                    limit: 500
                },
                headers: UA
            });

            items = feedRes.data.data;
            validItems = items.filter(ch => (ch.attributes.pages || 0) > 0);

            if (validItems.length > 0) {
                // Count languages and pick the most frequent available language
                const langCounts = {};
                validItems.forEach(ch => {
                    const l = ch.attributes.translatedLanguage;
                    langCounts[l] = (langCounts[l] || 0) + 1;
                });

                const topLangCode = Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a])[0];
                fallbackLang = LANG_NAMES[topLangCode] || topLangCode.toUpperCase();
                validItems = validItems.filter(ch => ch.attributes.translatedLanguage === topLangCode);
                console.log(`[MANGADEX] Falling back to ${fallbackLang} (${validItems.length} chapters)`);
            }
        }

        if (validItems.length === 0) {
            console.warn(`[MANGADEX] No chapters with pages found for ${mangaId}`);
            return { chapters: [], fallbackLang: null };
        }

        const mapped = validItems.map(ch => {
            const vol = ch.attributes.volume ? `Vol.${ch.attributes.volume} ` : '';
            const chNum = ch.attributes.chapter || '0';
            const num = parseFloat(chNum) || 0;
            const title = ch.attributes.title;
            const label = title ? `${vol}Ch.${chNum} — ${title}` : `${vol}Chapter ${chNum}`;
            return {
                chapterId: ch.id,
                num: num,
                title: label,
                pagesCount: ch.attributes.pages
            };
        });

        // Deduplicate by numeric chapter number
        const uniqueMap = {};
        for (const c of mapped) {
            if (!uniqueMap[c.num] || c.pagesCount > uniqueMap[c.num].pagesCount) {
                uniqueMap[c.num] = c;
            }
        }

        const sorted = Object.values(uniqueMap).sort((a, b) => a.num - b.num);
        return { chapters: sorted, fallbackLang };

    } catch (err) {
        console.error('[MANGADEX] Feed error:', err.message);
        return { chapters: [], fallbackLang: null };
    }
}

async function getMangaDexChapterImages(chapterId) {
    try {
        const atHome = await axios.get(`${API}/at-home/server/${chapterId}`, { headers: UA });
        const { baseUrl } = atHome.data;
        const { hash, data: pages } = atHome.data.chapter;

        if (!pages || pages.length === 0) return '';

        return pages.map(filename =>
            `<img src="${baseUrl}/data/${hash}/${filename}" loading="lazy" style="width:100%;max-width:800px;margin:0 auto;display:block;padding:0;border:none;" />`
        ).join('');

    } catch (err) {
        console.error(`[MANGADEX] Chapter image error for ${chapterId}:`, err.message);
        return '<p style="text-align:center;padding:2rem;">Failed to load chapter images.</p>';
    }
}

module.exports = { searchMangaDex, getMangaDexFeed, getMangaDexChapterImages };
