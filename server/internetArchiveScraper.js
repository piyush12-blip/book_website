const axios = require('axios');
const cheerio = require('cheerio');
const Epub = require('epub');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

async function scrapeInternetArchive(query) {
    try {
        console.log(`[InternetArchive] Searching for: ${query}`);
        // Use a more relaxed search query for IA
        const searchRes = await axios.get(`https://archive.org/advancedsearch.php?q=title:${encodeURIComponent(query)}+AND+mediatype:texts&fl[]=identifier&output=json&rows=5`, { timeout: 15000 });
        
        if (!searchRes.data || !searchRes.data.response || !searchRes.data.response.docs || searchRes.data.response.docs.length === 0) {
            console.log(`[InternetArchive] No search results found.`);
            return null;
        }

        let epubDownloadUrl = null;

        for (let doc of searchRes.data.response.docs) {
            const id = doc.identifier;
            console.log(`[InternetArchive] Checking ID: ${id}`);
            try {
                const detailRes = await axios.get(`https://archive.org/metadata/${id}`, { timeout: 10000 });
                if (detailRes.data && detailRes.data.files) {
                    const epubFile = detailRes.data.files.find(f => f.format === 'EPUB' && !f.name.includes('_meta.xml'));
                    if (epubFile) {
                        epubDownloadUrl = `https://archive.org/download/${id}/${epubFile.name}`;
                        console.log(`[InternetArchive] Found EPUB link: ${epubDownloadUrl}`);
                        break;
                    }
                }
            } catch (err) {
                console.log(`[InternetArchive] Error checking ID ${id}: ${err.message}`);
            }
        }

        if (!epubDownloadUrl) {
            console.log(`[InternetArchive] No EPUB links found in top results.`);
            return null;
        }

        console.log(`[InternetArchive] Downloading EPUB from: ${epubDownloadUrl}`);
        const epubRes = await axios.get(epubDownloadUrl, { responseType: 'arraybuffer', signal: AbortSignal.timeout(45000) });
        
        const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}.epub`);
        fs.writeFileSync(tempFilePath, epubRes.data);

        console.log(`[InternetArchive] Parsing EPUB at: ${tempFilePath}`);
        const chapters = await parseEpub(tempFilePath);
        
        // Cleanup temp file
        try { fs.unlinkSync(tempFilePath); } catch (e) {}

        if (chapters && chapters.length > 0) {
            console.log(`[InternetArchive] Successfully extracted ${chapters.length} chapters.`);
            return chapters;
        }

        return null;
    } catch (err) {
        console.error(`[InternetArchive] Error: ${err.message}`);
        return null;
    }
}

function parseEpub(filePath) {
    return new Promise((resolve, reject) => {
        const epub = new Epub(filePath);
        const chapters = [];
        let chaptersExtracted = 0;
        
        epub.on("end", function () {
            const spine = epub.flow;
            if (!spine || spine.length === 0) {
                resolve(null);
                return;
            }

            // Function to fetch chapter text
            const fetchChapter = (chapterId, title) => {
                return new Promise((res) => {
                    epub.getChapter(chapterId, function (error, text) {
                        if (error) {
                            res(null);
                        } else {
                            // Basic HTML cleanup
                            const cleanText = text
                                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                                .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, '')
                                .replace(/<body>/gi, '')
                                .replace(/<\/body>/gi, '')
                                .replace(/<html[^>]*>/gi, '')
                                .replace(/<\/html>/gi, '');

                            res({
                                title: title || `Chapter ${chaptersExtracted + 1}`,
                                html: cleanText,
                                minutes: Math.max(3, Math.ceil(cleanText.length / 4000))
                            });
                        }
                    });
                });
            };

            const promises = spine.map(item => fetchChapter(item.id, item.title));
            
            Promise.all(promises).then(results => {
                const validChapters = results.filter(ch => ch && ch.html && ch.html.trim().length > 50);
                resolve(validChapters);
            }).catch(() => {
                resolve(null);
            });
        });
        
        epub.parse();
    });
}

module.exports = { scrapeInternetArchive };
