const webnovels = [
    "How to Tame Your Beast Husband",
    "National School Prince Is A",
    "Perfect Secret Love",
    "Trial Marriage Husband",
    "Psychic Princess",
    "Queen of Poison",
    "My Chubby Princess",
    "Prince's Private Sweetheart",
    "Embrace My Shadow",
    "This Princess is Wild",
    "Yes, Your Highness",
    "The Boss's Shotgun Wedding",
    "Absolute Beast Dominion",
    "My Vampire System",
    "Demonic Pornstar System",
    "My Scumbag System",
    "The Broken Halo",
    "Reincarnation Paradise Park",
    "Hogwarts: Bloodline Legend",
    "Fleeing from Konoha",
    "The Fool in Hogwarts"
];

async function runScreenshotTitlesAudit() {
    console.log("=== SCREENSHOT TITLES AUDIT (SERVER + SITE) ===\n");
    let directCount = 0;
    let backdoorCount = 0;
    
    for (const title of webnovels) {
        try {
            const searchUrl = `http://localhost:3000/api/books/search?q=${encodeURIComponent(title)}`;
            const searchRes = await fetch(searchUrl);
            const searchResults = await searchRes.json();
            
            if (!searchResults || searchResults.length === 0) {
                console.log(`🔒 [${title}] -> Backdoor Card + 3 Mirror Links (Anna's Archive, OceanofPDF, LibGen)\n`);
                backdoorCount++;
                continue;
            }
            
            const topMatch = searchResults[0];
            const chapterUrl = `http://localhost:3000/api/books/${topMatch.id}/chapters?q=${encodeURIComponent(title)}`;
            
            const start = Date.now();
            const res = await fetch(chapterUrl, { signal: AbortSignal.timeout(35000) });
            const data = await res.json();
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            
            if (data.chapters && data.chapters.length > 0) {
                const firstChapter = data.chapters[0]?.html || '';
                const cleanSample = firstChapter.replace(/<[^>]*>?/gm, '').substring(0, 180).replace(/\s+/g, ' ');
                console.log(`✅ DIRECT OPEN [${title}] (${duration}s)
   -> FOUND VIA: ${topMatch.id}
   -> SERVER: ${data.chapters.length} Real Chapters
   -> SITE DISPLAY: Direct Open English Story
   -> SAMPLE: "${cleanSample.substring(0, 80)}..."\n`);
                directCount++;
            } else {
                console.log(`🔒 BACKDOOR CARD [${title}] (${duration}s)
   -> FOUND VIA: ${topMatch.id}
   -> SERVER: Locked / Webnovel Paywall
   -> SITE DISPLAY: Triggers Backdoor Card with 3 Mirrors (Anna's Archive, OceanofPDF, LibGen)\n`);
                backdoorCount++;
            }
        } catch (err) {
            console.log(`🔒 BACKDOOR CARD [${title}] -> Network Limit -> Triggers Backdoor Card with 3 Mirrors\n`);
            backdoorCount++;
        }
    }
    
    console.log(`=== AUDIT COMPLETE ===
Direct Open Real Story: ${directCount}
Backdoor Card + 3 Mirrors: ${backdoorCount}
Total Audited: ${webnovels.length}`);
}

runScreenshotTitlesAudit();
