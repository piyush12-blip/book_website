const titles = [
    "The Scumbag's Guide To Heroism",
    "Infinite Cashback System",
    "Reincarnated as a Mosquito, I Sucked the Reborn Empress to Tears",
    "My Apocalypse System Arrives 10 Years Early",
    "Global Game: Developing a Knight Clan",
    "NTR Massage Parlour: A Wellness Technique Guide"
];

async function runWebnovelComAudit() {
    console.log("=== WEBNOVEL.COM TITLES AUDIT (SERVER + SITE) ===\n");
    let success = 0;
    
    for (const title of titles) {
        try {
            // 1. Search via site API
            const searchUrl = `http://localhost:3000/api/books/search?q=${encodeURIComponent(title)}`;
            const searchRes = await fetch(searchUrl);
            const searchResults = await searchRes.json();
            
            if (!searchResults || searchResults.length === 0) {
                console.log(`🔒 [${title}] -> Search returned 0 items -> Backdoor UI Card with 3 Mirrors\n`);
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
                const cleanSample = firstChapter.replace(/<[^>]*>?/gm, '').substring(0, 200).replace(/\s+/g, ' ');
                console.log(`✅ SUCCESS [${title}] (${duration}s)
   -> FOUND VIA: ${topMatch.id} (${data.type || 'webnovel'})
   -> SERVER: ${data.chapters.length} Real Chapters
   -> SITE DISPLAY: Direct Open English Story
   -> SAMPLE: "${cleanSample.substring(0, 90)}..."\n`);
                success++;
            } else {
                console.log(`🔒 BACKDOOR [${title}] (${duration}s)
   -> FOUND VIA: ${topMatch.id}
   -> SERVER: Locked / Webnovel Paywall
   -> SITE DISPLAY: Triggers Backdoor Card with 3 Mirrors (Anna's Archive, OceanofPDF, LibGen)\n`);
            }
        } catch (err) {
            console.log(`⚠️ ERROR [${title}]: ${err.message}\n`);
        }
    }
    
    console.log(`=== AUDIT COMPLETE: ${success} / ${titles.length} TITLES LOADED DIRECTLY ===`);
}

runWebnovelComAudit();
