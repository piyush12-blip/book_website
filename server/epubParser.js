const axios = require('axios');
const AdmZip = require('adm-zip');
const path = require('path');

// ─── Source 1: Project Gutenberg (public domain, vast catalog) ───────────────
async function findOnGutenberg(query) {
    try {
        const res = await axios.get(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`, {
            timeout: 8000,
            headers: { 'User-Agent': 'Bibliotheque/1.0' }
        });
        const books = res.data.results;
        if (!books || books.length === 0) return null;

        // Find a book with an EPUB link
        for (const book of books.slice(0, 3)) {
            const epubUrl = book.formats['application/epub+zip']
                         || book.formats['application/epub'];
            if (epubUrl) {
                console.log(`[GUTENBERG] Found: "${book.title}" → ${epubUrl}`);
                return epubUrl;
            }
        }
        return null;
    } catch (e) {
        console.warn('[GUTENBERG] Error:', e.message);
        return null;
    }
}

// ─── Source 2: Standard Ebooks (high quality public domain) ──────────────────
async function findOnStandardEbooks(query) {
    try {
        const words = query.toLowerCase().split(' ').filter(w => w.length > 2);
        // Standard Ebooks uses hyphenated slugs like: pride-and-prejudice_jane-austen
        // Search their catalog via OPDS feed
        const res = await axios.get(`https://standardebooks.org/feeds/opds/all`, {
            timeout: 10000,
            responseType: 'text',
            headers: { 'User-Agent': 'Bibliotheque/1.0' }
        });
        const xml = res.data;
        // Find entries matching our query
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        while ((match = entryRegex.exec(xml)) !== null) {
            const entry = match[1];
            const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
            const linkMatch = entry.match(/<link[^>]+href="([^"]+\.epub)"[^>]*>/);
            if (titleMatch && linkMatch) {
                const title = titleMatch[1].toLowerCase();
                const matchCount = words.filter(w => title.includes(w)).length;
                if (matchCount >= Math.min(2, words.length)) {
                    const epubUrl = linkMatch[1].startsWith('http')
                        ? linkMatch[1]
                        : `https://standardebooks.org${linkMatch[1]}`;
                    console.log(`[STANDARD_EBOOKS] Found: "${titleMatch[1]}" → ${epubUrl}`);
                    return epubUrl;
                }
            }
        }
        return null;
    } catch (e) {
        console.warn('[STANDARD_EBOOKS] Error:', e.message);
        return null;
    }
}

// ─── Source 3: Anna's Archive scraper (last resort) ─────────────────────────
async function findOnAnnasArchive(query) {
    try {
        const { scrapeAnnasArchive } = require('./scraper');
        const url = await scrapeAnnasArchive(query);
        // The scraper returns the Moby Dick fallback if nothing found — don't use that
        if (url && !url.includes('moby-dick')) return url;
        return null;
    } catch {
        return null;
    }
}

// ─── Main: try all sources in order ─────────────────────────────────────────
async function findEpubUrl(query) {
    console.log(`[EPUB_FINDER] Looking for: "${query}"`);

    // Try Gutenberg first (fastest, most reliable)
    const gutUrl = await findOnGutenberg(query);
    if (gutUrl) return gutUrl;

    // Try Standard Ebooks
    const seUrl = await findOnStandardEbooks(query);
    if (seUrl) return seUrl;

    // Try Anna's Archive (may be blocked but worth trying)
    const aaUrl = await findOnAnnasArchive(query);
    if (aaUrl) return aaUrl;

    console.warn(`[EPUB_FINDER] No EPUB found for: "${query}"`);
    return null;
}

// ─── PDF & EPUB Unified Parser ──────────────────────────────────────────────
const { execFile } = require('child_process');

function extractChaptersFromPdf(filePath) {
    return new Promise((resolve) => {
        const scriptPath = path.join(__dirname, 'extract_pdf_text.py');
        console.log(`[PDF_PARSER] Extracting text & chapters from PDF: ${filePath}`);
        execFile('python', [scriptPath, filePath], { maxBuffer: 30 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                console.error('[PDF_PARSER] Error executing extract_pdf_text.py:', err.message, stderr);
                return resolve([]);
            }
            try {
                const data = JSON.parse(stdout);
                if (data && data.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
                    console.log(`[PDF_PARSER] Successfully extracted ${data.chapters.length} clean text chapters from PDF!`);
                    return resolve(data.chapters);
                }
                console.warn('[PDF_PARSER] No text chapters returned from PDF:', data?.error || 'Empty');
                resolve([]);
            } catch (e) {
                console.error('[PDF_PARSER] JSON parse error:', e.message);
                resolve([]);
            }
        });
    });
}

async function extractChaptersFromFile(filePath) {
    try {
        console.log(`[PARSER] Extracting chapters from local file: ${filePath}`);
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.pdf') {
            return await extractChaptersFromPdf(filePath);
        }
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(filePath);
        return await parseEpubBuffer(zip);
    } catch (e) {
        console.error('[PARSER] Error parsing local file:', e.message);
        return [];
    }
}

async function extractChaptersFromUrl(url) {
    try {
        console.log(`[PARSER] Fetching EPUB from ${url}`);
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        const zip = new AdmZip(res.data);
        return parseEpubBuffer(zip);
    } catch (e) {
        console.error('[PARSER] Error parsing URL:', e.message);
        return [];
    }
}

async function parseEpubBuffer(zip) {
    const entries = zip.getEntries();

    // Find OPF
    let opfEntry = null;
    let opfBasePath = '';
    for (const entry of entries) {
        if (entry.entryName === 'META-INF/container.xml') {
            const xml = entry.getData().toString('utf8');
            const match = xml.match(/full-path="([^"]+\.opf)"/);
            if (match) {
                opfEntry = zip.getEntry(match[1]);
                opfBasePath = path.dirname(match[1]);
                if (opfBasePath === '.') opfBasePath = '';
            }
            break;
        }
    }
    if (!opfEntry) {
        opfEntry = entries.find(e => e.entryName.endsWith('.opf'));
        if (opfEntry) opfBasePath = path.dirname(opfEntry.entryName);
    }
    if (!opfEntry) throw new Error('No OPF file found in EPUB');

    const opf = opfEntry.getData().toString('utf8');

    // Parse spine & manifest robustly regardless of attribute order
    const manifest = {};
    const itemRegex = /<item\s+[^>]*\/?>/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(opf)) !== null) {
        const tag = itemMatch[0];
        const idMatch = tag.match(/\bid="([^"]+)"/i);
        const hrefMatch = tag.match(/\bhref="([^"]+)"/i);
        if (idMatch && hrefMatch) {
            manifest[idMatch[1]] = hrefMatch[1];
        }
    }

    const spineSectionMatch = opf.match(/<spine[\s\S]*?<\/spine>/i);
    const spineXml = spineSectionMatch ? spineSectionMatch[0] : opf;
    const spineIds = [...spineXml.matchAll(/\bidref="([^"]+)"/gi)].map(m => m[1]);

    let chapterFiles = spineIds.map(id => manifest[id])
        .filter(href => href && /\.(html|xhtml|htm)$/i.test(href));

    if (chapterFiles.length === 0) {
        entries.filter(e => /\.(html|xhtml|htm)$/i.test(e.entryName) && !e.entryName.includes('toc'))
               .forEach(e => chapterFiles.push(e.entryName));
    }

    console.log(`[PARSER] ${chapterFiles.length} spine items`);

    // Extract book title from OPF metadata if available
    const bookTitleMatch = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    const bookMainTitle = bookTitleMatch ? bookTitleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    function isFrontOrBackMatter(href, body) {
        const cleanText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        const lowerHref = href.toLowerCase();

        // 1. Promotional pages (OceanofPDF, Anna's Archive, ads, watermarks)
        if (cleanText.includes('oceanofpdf.com') && cleanText.length < 3500) return 'PROMO_OCEANOFPDF';
        if (cleanText.includes('annas-archive') && cleanText.length < 3500) return 'PROMO_ANNAS';
        if (lowerHref.includes('promo') || lowerHref.includes('advert') || lowerHref.includes('discover-page') || lowerHref.includes('discoverpage')) return 'PROMO_PAGE';

        // 2. Cover
        if (lowerHref.includes('cover') || body.includes('epub:type="cover"') || (cleanText.length < 200 && body.includes('<img'))) return 'COVER';

        // 3. Copyright & legal notices
        if (lowerHref.includes('copyright') || lowerHref.includes('cop.') || 
            (cleanText.includes('all rights reserved') && cleanText.length < 3500) || 
            (cleanText.includes('isbn') && cleanText.length < 2500) || 
            (cleanText.includes('cataloging-in-publication') && cleanText.length < 2500)) {
            return 'COPYRIGHT';
        }

        // 4. Table of Contents
        if (lowerHref.includes('toc') || lowerHref.includes('contents') || 
            (cleanText.startsWith('contents') && cleanText.length < 3500) || 
            (cleanText.startsWith('table of contents') && cleanText.length < 3500)) {
            return 'TOC';
        }

        // 5. Title Page / Halftitle / Imprint / Author name cards
        if ((lowerHref.includes('titlepage') || lowerHref.includes('title_page') || lowerHref.includes('halftitle') || lowerHref.includes('imprint')) && cleanText.length < 1500) {
            return 'TITLEPAGE';
        }

        // 6. Dedication / Epigraph (short non-story dedication cards)
        if ((lowerHref.includes('dedication') || lowerHref.includes('epigraph')) && cleanText.length < 1000) {
            return 'DEDICATION';
        }

        // 7. Blurb / Advance Praise / Other Books by Author
        if ((cleanText.includes('praise for') || cleanText.includes('advance praise') || cleanText.includes('also by') || cleanText.includes('other books by')) && cleanText.length < 2200) {
            return 'PRAISE_BLURB';
        }

        // 8. Footnotes / Endnotes lists
        if (lowerHref.includes('footnote') && cleanText.length < 3000) {
            return 'FOOTNOTES';
        }

        return false;
    }

    function extractSmartTitle(body, bookTitle, fallbackIndex) {
        // Look for headings h1, h2, h3
        const headings = [...body.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)]
            .map(m => m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
            .filter(t => t && t.length > 0 && t.length < 120);

        const cleanBookTitle = (bookTitle || '').toLowerCase().trim();

        for (const h of headings) {
            const hLower = h.toLowerCase();
            // Skip if heading is just the book title or generic boilerplate
            if (cleanBookTitle && hLower === cleanBookTitle) continue;
            if (hLower.includes('oceanofpdf') || hLower === 'table of contents' || hLower === 'contents') continue;
            return h;
        }

        // Search bold tags e.g. <span class="bold">1. A woman named Thursday Next</span>
        const boldMatch = body.match(/<(?:span|p|div)[^>]*(?:class="[^"]*bold[^"]*"|style="[^"]*font-weight:\s*bold[^"]*")[^>]*>([\s\S]*?)<\/(?:span|p|div)>/i);
        if (boldMatch) {
            const candidate = boldMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (candidate && candidate.length > 2 && candidate.length < 80 && !cleanBookTitle.includes(candidate.toLowerCase())) {
                return candidate;
            }
        }

        // Search first few paragraphs for "Chapter X" or "Law X"
        const paraMatch = body.match(/<(?:p|div|span)[^>]*>\s*(?:<strong>|<b>)?\s*((?:Chapter|LAW|Act|Part|Book|Prologue|Epilogue)\s+[0-9IVXLCDM\w\s:—–-]+)(?:<\/strong>|<\/b>)?\s*<\/(?:p|div|span)>/i);
        if (paraMatch && paraMatch[1].length < 80) {
            return paraMatch[1].replace(/<[^>]+>/g, '').trim();
        }

        return `Chapter ${fallbackIndex}`;
    }

    const chapters = [];
    for (let i = 0; i < Math.min(chapterFiles.length, 120); i++) {
        const href = chapterFiles[i];
        const fullPath = opfBasePath ? `${opfBasePath}/${href}` : href;
        const entry = zip.getEntry(fullPath) || zip.getEntry(href);
        if (!entry) continue;

        let body = entry.getData().toString('utf8');

        // Check if item is promotional or front/back matter
        const skipReason = isFrontOrBackMatter(href, body);
        if (skipReason) {
            console.log(`[PARSER] Skipping non-story spine item [${skipReason}]: ${href}`);
            continue;
        }

        // Strip promotional footer links (e.g. OceanofPDF banner link)
        body = body.replace(/<div[^>]*>\s*<p>\s*<a[^>]*oceanofpdf\.com[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*<\/div>/gi, '');
        body = body.replace(/<p[^>]*>\s*<a[^>]*oceanofpdf\.com[^>]*>[\s\S]*?<\/a>\s*<\/p>/gi, '');
        body = body.replace(/<a[^>]*oceanofpdf\.com[^>]*>[\s\S]*?<\/a>/gi, '');

        // Strip boilerplate
        body = body.replace(/<head[\s\S]*?<\/head>/gi, '');
        body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
        body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
        body = body.replace(/<link[^>]*>/gi, '');
        body = body.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');
        body = body.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '');
        body = body.replace(/<\?xml[^>]*>/gi, '');
        body = body.replace(/xmlns[^"]*"[^"]*"/g, '');

        // Sanitize inline styles: remove fixed positioning and hardcoded colors so reader themes apply cleanly
        body = body.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            let cleanStyle = styleContent
                .replace(/color\s*:\s*[^;"]+;?/gi, '')
                .replace(/background(?:-color)?\s*:\s*[^;"]+;?/gi, '')
                .replace(/position\s*:\s*(?:absolute|fixed);?/gi, 'position:static;')
                .replace(/float\s*:\s*(?:left|right);?/gi, '')
                .replace(/height\s*:\s*\d+px;?/gi, '')
                .trim();
            return cleanStyle ? `style="${cleanStyle}"` : '';
        });

        // Extract clean chapter title
        const title = extractSmartTitle(body, bookMainTitle, chapters.length + 1);

        // Fix images: Convert internal EPUB images to Base64 data URIs so they render perfectly inline
        body = body.replace(/<img([^>]*)src="([^"]*)"([^>]*)>/gi, (match, before, src, after) => {
            if (src.startsWith('http') || src.startsWith('data:')) return match;
            
            let imgPath = href.split('/').slice(0, -1).join('/');
            let resolvedPath = imgPath ? `${imgPath}/${src}` : src;
            let fullImgPath = opfBasePath ? `${opfBasePath}/${resolvedPath}` : resolvedPath;
            fullImgPath = require('path').normalize(fullImgPath).replace(/\\/g, '/');
            
            const imgEntry = zip.getEntry(fullImgPath) || zip.getEntry(resolvedPath) || zip.getEntry(src);
            
            if (imgEntry) {
                const ext = src.split('.').pop().toLowerCase();
                const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
                const base64 = imgEntry.getData().toString('base64');
                return `<img${before}src="data:${mimeType};base64,${base64}"${after} style="max-width:100%;height:auto;border-radius:8px;margin:1rem 0;">`;
            }
            
            return ''; // Strip the image if it wasn't found in the zip
        });

        body = body.trim();

        if (body.length > 150) {
            chapters.push({ title, html: body });
        }
    }

    console.log(`[PARSER] Extracted ${chapters.length} genuine story chapters (clean Chapter 1 starting point)`);
    return chapters;
}

module.exports = { findEpubUrl, extractChaptersFromUrl, extractChaptersFromFile };
