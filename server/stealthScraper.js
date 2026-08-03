const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function runStealthScraper(title, author) {
    console.log(`[STEALTH-BOT] Initiating ghost browser for: "${title}" by "${author}"`);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new', // invisible browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-infobars',
                '--window-size=1920,1080'
            ],
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();
        
        // Randomize user agent to mimic real home connections
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

        let interceptedEpubUrl = null;
        let interceptedText = "";

        // The Trick: Sniff the hidden pipelines
        page.on('response', async (response) => {
            const url = response.url();
            const type = response.headers()['content-type'] || '';
            
            // Look for hidden EPUB files or raw text JSON payloads
            if (url.endsWith('.epub') || type.includes('epub')) {
                console.log(`[STEALTH-BOT] Intercepted hidden EPUB pipeline: ${url}`);
                interceptedEpubUrl = url;
            } else if (type.includes('json') || type.includes('text/plain')) {
                try {
                    const text = await response.text();
                    // If the payload contains massive amounts of text matching our book
                    if (text.length > 50000 && text.toLowerCase().includes(title.toLowerCase())) {
                        console.log(`[STEALTH-BOT] Intercepted raw text pipeline! Size: ${text.length} chars`);
                        interceptedText = text;
                    }
                } catch (e) {
                    // Ignore parsing errors for irrelevant streams
                }
            }
        });

        // Navigate to search hubs and let the network sniffer work
        const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(title + ' ' + author + ' filetype:epub')}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Give the background pipelines time to leak data
        await new Promise(r => setTimeout(r, 4000));

        return {
            epubUrl: interceptedEpubUrl,
            rawText: interceptedText
        };

    } catch (err) {
        console.error(`[STEALTH-BOT] Ghost browser failed: ${err.message}`);
        return null;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { runStealthScraper };
