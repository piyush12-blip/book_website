const axios = require('axios');
const cheerio = require('cheerio');

async function fetchGutenbergChapters(query) {
    try {
        console.log(`[GUTENDEX] Searching public domain books for: "${query}"`);
        const searchUrl = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
        const res = await axios.get(searchUrl, { timeout: 6000 });
        
        if (!res.data || !res.data.results || res.data.results.length === 0) {
            console.log(`[GUTENDEX] No public domain books found for "${query}"`);
            return null;
        }

        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const mainTitleTerms = cleanQuery.split(/\s+/).filter(t => t.length > 3 && !['emily', 'john', 'mandel', 'scott', 'lynch', 'williams', 'kobo', 'stead'].includes(t));

        // Find a Gutenberg result whose title contains ALL main title terms
        const matchingBook = res.data.results.find(b => {
            const bTitle = (b.title || '').toLowerCase();
            return mainTitleTerms.length > 0 && mainTitleTerms.every(term => bTitle.includes(term));
        });

        if (!matchingBook) {
            console.log(`[GUTENDEX] Discarding non-matching public domain results for "${query}"`);
            return null;
        }

        const book = matchingBook;
        const formats = book.formats || {};
        
        const textUrl = formats['text/html'] || formats['text/plain; charset=us-ascii'] || formats['text/plain; charset=utf-8'] || formats['text/plain'];
        
        if (!textUrl) {
            console.log(`[GUTENDEX] No direct text/html download URL found for book: ${book.title}`);
            return null;
        }

        console.log(`[GUTENDEX] Fetching full text for "${book.title}" from: ${textUrl}`);
        const textRes = await axios.get(textUrl, { timeout: 10000 });
        const rawContent = textRes.data;

        let chapters = [];

        if (typeof rawContent === 'string') {
            if (textUrl.endsWith('.htm') || textUrl.endsWith('.html') || rawContent.includes('<html') || rawContent.includes('<body')) {
                const $ = cheerio.load(rawContent);
                $('script, style, header, footer, #pg-header, #pg-footer').remove();
                
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
                chapters: chapters.slice(0, 10)
            };
        }

    } catch (err) {
        console.warn(`[GUTENDEX] Error fetching public domain text: ${err.message}`);
    }
    return null;
}

module.exports = { fetchGutenbergChapters };
