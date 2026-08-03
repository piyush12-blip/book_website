const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
async function test() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto('https://oceanofpdf.com/?s=atomic+habits', { waitUntil: 'networkidle2', timeout: 15000 });
        const firstResult = await page.$eval('.post-title a', a => a.href);
        console.log('Found book page:', firstResult);
    } catch(e) {
        console.error(e.message);
    } finally {
        await browser.close();
    }
}
test();
