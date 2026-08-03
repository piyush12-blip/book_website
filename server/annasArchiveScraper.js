const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { extractChaptersFromFile } = require('./epubParser');

async function scrapeAnnasArchive(query) {
    console.log(`[ANNAS-ARCHIVE] Smashing the wall for: "${query}"`);
    try {
        const searchUrl = `https://annas-archive.org/search?q=${encodeURIComponent(query)}&ext=epub`;
        const res = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });

        const $ = cheerio.load(res.data);
        const firstResult = $('a[href^="/md5/"]').first().attr('href');
        
        if (!firstResult) {
            console.log(`[ANNAS-ARCHIVE] No EPUB found for "${query}"`);
            return [];
        }

        const md5Url = `https://annas-archive.org${firstResult}`;
        console.log(`[ANNAS-ARCHIVE] Found MD5 link: ${md5Url}`);
        
        const md5Res = await axios.get(md5Url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
        });
        
        const $2 = cheerio.load(md5Res.data);
        // Find the "Slow Partner Server 1" or similar download link
        const downloadLink = $2('a:contains("Slow Partner Server"), a:contains("Slow Server")').first().attr('href');
        
        if (!downloadLink) {
            console.log(`[ANNAS-ARCHIVE] No direct download link found.`);
            return [];
        }
        
        const finalUrl = downloadLink.startsWith('http') ? downloadLink : `https://annas-archive.org${downloadLink}`;
        console.log(`[ANNAS-ARCHIVE] Downloading EPUB from: ${finalUrl}`);
        
        const tempPath = path.join(__dirname, `../temp_annas_${Date.now()}.epub`);
        const epubRes = await axios.get(finalUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000
        });
        
        fs.writeFileSync(tempPath, Buffer.from(epubRes.data));
        console.log(`[ANNAS-ARCHIVE] Downloaded to ${tempPath}. Parsing chapters...`);
        
        const chapters = await extractChaptersFromFile(tempPath);
        
        try { fs.unlinkSync(tempPath); } catch(e) {}
        
        return chapters;

    } catch (err) {
        console.error(`[ANNAS-ARCHIVE] Wall smash failed (Cloudflare/Timeout): ${err.message}`);
        return [];
    }
}

module.exports = { scrapeAnnasArchive };
