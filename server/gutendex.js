const axios = require('axios');
const cheerio = require('cheerio');

async function fetchGutenbergChapters(title, author) {
    try {
        console.log(`[GUTENDEX] Searching for: "${title}" by "${author}"`);
        const searchUrl = `https://gutendex.com/books/?search=${encodeURIComponent(title)}`;
        const res = await axios.get(searchUrl, { timeout: 30000 });
        
        if (!res.data || !res.data.results || res.data.results.length === 0) {
            console.log(`[GUTENDEX] No public domain books found for "${title}"`);
            return null;
        }

        const cleanAuthor = (author && author !== 'undefined') ? author : '';
        const query = `${title} ${cleanAuthor}`.trim();
        const cleanQuery = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+[\p{L}]\.?$/iu, '').trim();
        const mainTitleTerms = cleanQuery.split(/\s+/).filter(t => t.length > 2 && t !== 'undefined' && !['emily', 'john', 'mandel', 'scott', 'lynch', 'williams', 'kobo', 'stead'].includes(t));

        // Filter & Sort Gutenberg results: prefer exact original novels over stage play adaptations
        const candidates = res.data.results.filter(b => {
            const bTitle = (b.title || '').toLowerCase();
            const bAuthors = (b.authors || []).map(a => a.name || '').join(' ').toLowerCase();
            const fullStr = `${bTitle} ${bAuthors}`;
            return mainTitleTerms.length > 0 && mainTitleTerms.every(term => fullStr.includes(term));
        });

        if (candidates.length === 0) {
            console.log(`[GUTENDEX] Discarding non-matching public domain results for "${query}"`);
            return null;
        }

        const ADAPTATION_KEYWORDS = ['play', 'dramatized', 'adaptation', 'summary', 'study guide', 'cliffsnotes', 'analysis of', 'companion to', 'commentary', 'abridged'];

        candidates.sort((a, b) => {
            const tA = (a.title || '').toLowerCase();
            const tB = (b.title || '').toLowerCase();
            const isAdaptationA = ADAPTATION_KEYWORDS.some(kw => tA.includes(kw));
            const isAdaptationB = ADAPTATION_KEYWORDS.some(kw => tB.includes(kw));
            if (isAdaptationA !== isAdaptationB) return isAdaptationA ? 1 : -1;
            if (tA === cleanQuery && tB !== cleanQuery) return -1;
            if (tB === cleanQuery && tA !== cleanQuery) return 1;
            return (b.download_count || 0) - (a.download_count || 0);
        });

        const matchingBook = candidates[0];

        const book = matchingBook;
        const formats = book.formats || {};
        
        const textUrl = formats['text/html'] || formats['text/plain; charset=us-ascii'] || formats['text/plain; charset=utf-8'] || formats['text/plain'];
        
        if (!textUrl) {
            console.log(`[GUTENDEX] No direct text/html download URL found for book: ${book.title}`);
            return null;
        }

        console.log(`[GUTENDEX] Fetching full text for "${book.title}" from: ${textUrl}`);
        const textRes = await axios.get(textUrl, { timeout: 30000 });
        const rawContent = textRes.data;

        let chapters = [];

        if (typeof rawContent === 'string') {
            if (textUrl.endsWith('.htm') || textUrl.endsWith('.html') || rawContent.includes('<html') || rawContent.includes('<body')) {
                const $ = cheerio.load(rawContent);
                $('script, style, header, footer, #pg-header, #pg-footer').remove();
                
                // Rewrite relative img URLs to absolute Gutenberg URLs to prevent 404 errors
                const baseUrl = textUrl.substring(0, textUrl.lastIndexOf('/') + 1);
                $('img').each((_, img) => {
                    const src = $(img).attr('src');
                    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                        const cleanSrc = src.replace(/^\.?\//, '');
                        $(img).attr('src', baseUrl + cleanSrc);
                    }
                });
                
                let chapterBlocks = [];
                $('h2, h3, div.chapter, section').each((i, el) => {
                    const title = $(el).text().trim();
                    if (title.length > 0 && title.length < 100) {
                        let htmlContent = $(el).nextUntil('h2, h3, div.chapter, section').map((_, p) => $.html(p)).get().join('');
                        if (htmlContent.length > 200) {
                            chapterBlocks.push({ title, html: htmlContent });
                        }
                    }
                });

                if (chapterBlocks.length > 0) chapters = chapterBlocks;
            }

            if (chapters.length === 0) {
                const textOnly = rawContent.replace(/<[^>]*>/g, '');
                const rawParts = textOnly.split(/(?=CHAPTER\s+[IVXLCDM\d]+|Chapter\s+\d+)/i);
                
                chapters = rawParts.filter(p => p.trim().length > 300).map((part, idx) => {
                    const lines = part.trim().split('\n');
                    const title = lines[0].trim().slice(0, 80) || `Chapter ${idx + 1}`;
                    const bodyParagraphs = lines.slice(1).join('\n').split(/\n\s*\n/).map(para => `<p>${para.trim()}</p>`).join('');
                    return {
                        title: title,
                        html: `<div class="gutenberg-chapter"><h2>${title}</h2>${bodyParagraphs}</div>`
                    };
                });
            }
        }

        if (chapters.length > 0) {
            console.log(`[GUTENDEX] Successfully extracted ${chapters.length} chapters for "${book.title}"`);
            return {
                title: book.title,
                author: (book.authors && book.authors[0]) ? book.authors[0].name : 'Public Domain Author',
                chapters: chapters.slice(0, 500)
            };
        }

    } catch (err) {
        console.warn(`[GUTENDEX] Error fetching public domain text: ${err.message}`);
    }
    return null;
}

module.exports = { fetchGutenbergChapters };
