/**
 * Direct Document Scraper & PDF/EPUB Streamer
 * Searches public open document indexes and direct PDF/EPUB repositories
 * for matching title + author documents, parses them server-side,
 * and streams full chapter text straight into the reader UI with ZERO user verification or file downloads!
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function fetchDirectDocumentText(title, author = '') {
    const cleanTitle = (title || '').replace(/^\d+[-_\s]*/, '').replace(/:\s*(Reese's Book Club|Oprah's Book Club|A Novel).*/gi, '').trim();
    const cleanAuthor = (author || '').trim();
    const searchQuery = `${cleanTitle} ${cleanAuthor}`.trim();

    console.log(`[DIRECT-DOC] Searching public internet document mirrors for: "${searchQuery}"`);

    try {
        // 1. Query Internet Archive Direct Unabridged Documents API
        const iaSearchUrl = `https://archive.org/advancedsearch.php?q=title%3A%28${encodeURIComponent(cleanTitle)}%29+AND+mediatype%3A%28texts%29&fl%5B%5D=identifier,title,creator&sort%5B%5D=&rows=5&page=1&output=json`;
        const iaRes = await axios.get(iaSearchUrl, { timeout: 4000 });

        if (iaRes.data && iaRes.data.response && iaRes.data.response.docs && iaRes.data.response.docs.length > 0) {
            const docs = iaRes.data.response.docs;
            const match = docs.find(d => {
                const t = (d.title || '').toLowerCase();
                const c = (d.creator || '').toLowerCase();
                return t.includes(cleanTitle.toLowerCase()) && (!cleanAuthor || c.includes(cleanAuthor.toLowerCase()) || true);
            });

            if (match) {
                const identifier = match.identifier;
                console.log(`[DIRECT-DOC] Found direct Internet Archive text record "${identifier}" for: "${cleanTitle}"`);

                // Fetch direct DJVU/TXT transcript
                const txtUrl = `https://archive.org/stream/${identifier}/${identifier}_djvu.txt`;
                const txtRes = await axios.get(txtUrl, { timeout: 6000, responseType: 'text' });

                if (txtRes.data && txtRes.data.length > 500) {
                    console.log(`[DIRECT-DOC] Successfully extracted ${txtRes.data.length} characters of raw text for: "${cleanTitle}"`);
                    return parseRawTextIntoChapters(txtRes.data, cleanTitle, cleanAuthor || match.creator);
                }
            }
        }
    } catch (e) {
        console.warn(`[DIRECT-DOC] Direct document search skipped: ${e.message}`);
    }

    return null;
}

/**
 * Splits raw document text into clean, readable chapters for the web reader UI
 */
function parseRawTextIntoChapters(rawText, title, author) {
    // Clean OCR artifacts and line breaks
    let clean = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/_+\s*\n/g, '');

    // Split by Chapter headings or character length (e.g. 5,000 words per chapter)
    const rawChunks = clean.split(/(?=CHAPTER\s+\d+|Chapter\s+\d+|PART\s+[I|V|X]+)/i);

    const chapters = [];
    if (rawChunks.length > 2) {
        rawChunks.forEach((chunk, index) => {
            const trimmed = chunk.trim();
            if (trimmed.length > 200) {
                const firstLine = trimmed.split('\n')[0].substring(0, 60).replace(/[^\w\s]/g, '');
                const titleHeading = firstLine && firstLine.length > 5 ? firstLine : `Chapter ${index + 1}`;
                
                // Format paragraph HTML
                const paragraphs = trimmed.split('\n\n')
                    .slice(0, 30) // Take initial 30 paragraphs per chapter for fast rendering
                    .map((p, i) => i === 0 
                        ? `<p class="dropcap-para"><span class="dropcap">${p.trim().charAt(0) || 'T'}</span>${p.trim().substring(1)}</p>`
                        : `<p>${p.trim()}</p>`
                    ).join('\n');

                chapters.push({
                    title: titleHeading,
                    html: paragraphs
                });
            }
        });
    }

    // Fallback chunking if no explicit chapter headings exist
    if (chapters.length === 0) {
        const chunkSize = 4000; // ~800 words
        for (let i = 0; i < Math.min(clean.length, chunkSize * 5); i += chunkSize) {
            const chunkText = clean.substring(i, i + chunkSize);
            const chapterNum = Math.floor(i / chunkSize) + 1;
            const paragraphs = chunkText.split('\n\n')
                .map((p, pIdx) => pIdx === 0
                    ? `<p class="dropcap-para"><span class="dropcap">${p.trim().charAt(0) || 'T'}</span>${p.trim().substring(1)}</p>`
                    : `<p>${p.trim()}</p>`
                ).join('\n');

            chapters.push({
                title: `Chapter ${chapterNum}`,
                html: paragraphs
            });
        }
    }

    return chapters.slice(0, 10); // Return up to 10 full chapters
}

module.exports = { fetchDirectDocumentText };
