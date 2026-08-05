const { searchPrioritizedTelegram } = require('./server/telegram');

const testTitles = [
    'Solo Leveling',
    'Blue Lock',
    'My Dress-Up Darling',
    'Demon Slayer',
    'Jujutsu Kaisen'
];

async function runTelegramBotTest() {
    console.log('==================================================');
    console.log('✈️ LIVE TELEGRAM BOT & CHANNEL SCRAPER TEST');
    console.log('==================================================\n');

    for (let i = 0; i < testTitles.length; i++) {
        const title = testTitles[i];
        console.log(`[TEST ${i+1}] Querying Telegram Engine for: "${title}"...`);
        try {
            const results = await searchPrioritizedTelegram(title);
            console.log(`    FOUND: ${results.length} Telegram Channel Documents/Posts`);
            if (results.length > 0) {
                results.slice(0, 3).forEach((r, idx) => {
                    console.log(`    [Result ${idx+1}] File: ${r.title} | Channel: ${r.channel} | Source: ${r.source}`);
                    console.log(`               Link: ${r.link}`);
                });
            } else {
                console.log(`    ℹ️ No direct matches found in public Telegram web feed for "${title}" (Will fallback to global MTProto query).`);
            }
            console.log('--------------------------------------------------');
        } catch(err) {
            console.log(`    ❌ Error: ${err.message}`);
            console.log('--------------------------------------------------');
        }
    }
}

runTelegramBotTest();
