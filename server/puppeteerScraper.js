const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const path = require('path');
const fs = require('fs');

async function downloadEpubWithPuppeteer(query) {
    const downloadDir = path.join(__dirname, '..', 'public', 'downloads');
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    console.log(`[PUPPETEER] Launching stealth browser for: "${query}"`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Anti-bot evasion
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadDir
        });

        // 1. Search Anna's Archive for the exact book
        const searchUrl = `https://annas-archive.li/search?q=${encodeURIComponent(query)}&ext=epub`;
        console.log(`[PUPPETEER] Navigating to ${searchUrl}`);
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Let Cloudflare challenge run if present
        await new Promise(r => setTimeout(r, 4000));

        // 2. Click the first MD5 result link
        const firstResult = await page.$('a.js-hover');
        if (!firstResult) {
            console.log('[PUPPETEER] No results found on Anna\'s Archive.');
            await browser.close();
            return null;
        }

        console.log('[PUPPETEER] Clicking first result...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            firstResult.click()
        ]);

        // 3. Click the first fast download link (usually Cloudflare IPFS or Slow Partner)
        await page.waitForSelector('#md5-panel-downloads a', { timeout: 10000 }).catch(()=>{});
        
        const downloadLinks = await page.$$('#md5-panel-downloads a');
        let clicked = false;
        
        for (const link of downloadLinks) {
            const text = await page.evaluate(el => el.textContent, link);
            if (text.toLowerCase().includes('cloudflare') || text.toLowerCase().includes('ipfs') || text.toLowerCase().includes('slow partner')) {
                console.log(`[PUPPETEER] Found mirror: ${text.trim()}. Clicking...`);
                await link.click();
                clicked = true;
                break;
            }
        }
        
        if (!clicked && downloadLinks.length > 0) {
             console.log(`[PUPPETEER] No specific IPFS mirror found, clicking first available...`);
             await downloadLinks[0].click();
             clicked = true;
        }

        if(!clicked) {
            console.log('[PUPPETEER] Could not find any download mirror link.');
            await browser.close();
            return null;
        }

        console.log('[PUPPETEER] Waiting for download to finish (30s max)...');
        
        // Wait for a file to appear in the download directory
        let downloadedFile = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const files = fs.readdirSync(downloadDir);
            const epubFile = files.find(f => f.endsWith('.epub') && !f.endsWith('.crdownload'));
            if (epubFile) {
                downloadedFile = path.join(downloadDir, epubFile);
                break;
            }
        }

        await browser.close();
        
        if (downloadedFile) {
            console.log(`[PUPPETEER] Success! Downloaded: ${downloadedFile}`);
            return downloadedFile;
        } else {
            console.log(`[PUPPETEER] Download timed out or failed.`);
            return null;
        }

    } catch (error) {
        console.error('[PUPPETEER] Error during scraping:', error.message);
        await browser.close();
        return null;
    }
}

module.exports = { downloadEpubWithPuppeteer };
