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

// ─── EPUB Parser ─────────────────────────────────────────────────────────────
async function extractChaptersFromFile(filePath) {
    try {
        console.log(`[PARSER] Extracting chapters from local file: ${filePath}`);
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(filePath);
        return parseEpubBuffer(zip);
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

    // Parse spine & manifest
    const spineIds = [...opf.matchAll(/idref="([^"]+)"/g)].map(m => m[1]);
    const manifest = {};
    for (const m of [...opf.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*\/?>/g)]) {
        manifest[m[1]] = m[2];
    }

    let chapterFiles = spineIds.map(id => manifest[id])
        .filter(href => href && /\.(html|xhtml|htm)$/i.test(href));

    if (chapterFiles.length === 0) {
        entries.filter(e => /\.(html|xhtml|htm)$/i.test(e.entryName) && !e.entryName.includes('toc'))
               .forEach(e => chapterFiles.push(e.entryName));
    }

    console.log(`[PARSER] ${chapterFiles.length} spine items`);

    const chapters = [];
    for (let i = 0; i < Math.min(chapterFiles.length, 60); i++) {
        const href = chapterFiles[i];
        const fullPath = opfBasePath ? `${opfBasePath}/${href}` : href;
        const entry = zip.getEntry(fullPath) || zip.getEntry(href);
        if (!entry) continue;

        let body = entry.getData().toString('utf8');

        // Strip boilerplate
        body = body.replace(/<head[\s\S]*?<\/head>/gi, '');
        body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
        body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
        body = body.replace(/<link[^>]*>/gi, '');
        body = body.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');
        body = body.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '');
        body = body.replace(/<\?xml[^>]*>/gi, '');
        body = body.replace(/xmlns[^"]*"[^"]*"/g, '');

        // Extract chapter title
        const titleMatch = body.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
        let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `Chapter ${i + 1}`;
        if (!title) title = `Chapter ${i + 1}`;

        // Remove broken image references (they'd 404 from localhost)
        // But keep inline image tags with data URIs or absolute URLs
        body = body.replace(/<img([^>]*)src="(?!https?:\/\/|data:)([^"]*)"([^>]*)>/gi, '');

        body = body.trim();

        if (body.length > 150) {
            chapters.push({ title, html: body });
        }
    }

    console.log(`[PARSER] Extracted ${chapters.length} readable chapters`);
    return chapters;
}

module.exports = { findEpubUrl, extractChaptersFromUrl, extractChaptersFromFile };
