const webnovels = [
    { title: "Mother of Learning", author: "nobody103" },
    { title: "Chrysalis", author: "RinoZ" },
    { title: "The Primal Hunter", author: "Zogarth" },
    { title: "Defiance of the Fall", author: "TheFirstDefier" },
    { title: "Beware of Chicken", author: "CasualFarmer" },
    { title: "Shadow Slave", author: "Guilty3" },
    { title: "Lord of the Mysteries", author: "Cuttlefish" },
    { title: "Omniscient Reader", author: "sing N song" },
    { title: "Solo Leveling", author: "Chugong" },
    { title: "The Beginning After the End", author: "TurtleMe" }
];

async function runRealWebnovelAudit() {
    console.log("=== REAL SEARCH & FETCH: 10 LIGHT NOVELS / WEB NOVELS ===\n");
    let success = 0;
    
    for (const b of webnovels) {
        try {
            // 1. Search first to get exact item ID (iTunes or RoyalRoad numeric ID)
            const searchUrl = `http://localhost:3000/api/books/search?q=${encodeURIComponent(b.title)}`;
            const searchRes = await fetch(searchUrl);
            const searchResults = await searchRes.json();
            
            if (!searchResults || searchResults.length === 0) {
                console.log(`🔒 [${b.title}] -> Search returned 0 items -> Backdoor UI Card\n`);
                continue;
            }
            
            const topMatch = searchResults[0];
            const chapterUrl = `http://localhost:3000/api/books/${topMatch.id}/chapters?q=${encodeURIComponent(b.title + ' ' + b.author)}`;
            
            const start = Date.now();
            const res = await fetch(chapterUrl, { signal: AbortSignal.timeout(35000) });
            const data = await res.json();
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            
            if (data.chapters && data.chapters.length > 0) {
                const firstChapter = data.chapters[0]?.html || '';
                const cleanSample = firstChapter.replace(/<[^>]*>?/gm, '').substring(0, 200).replace(/\s+/g, ' ');
                console.log(`✅ SUCCESS [${b.title}] (${duration}s)
   -> FOUND VIA: ${topMatch.id} (${data.type || 'webnovel'})
   -> SERVER: ${data.chapters.length} Real Chapters
   -> SITE DISPLAY: Direct Open English Story
   -> SAMPLE: "${cleanSample.substring(0, 90)}..."\n`);
                success++;
            } else {
                console.log(`🔒 BACKDOOR [${b.title}] (${duration}s)
   -> FOUND VIA: ${topMatch.id}
   -> SERVER: Locked / Commercial DRM
   -> SITE DISPLAY: Triggers Backdoor Card with 3 Mirrors (Anna's Archive, OceanofPDF, LibGen)\n`);
            }
        } catch (err) {
            console.log(`⚠️ ERROR [${b.title}]: ${err.message}\n`);
        }
    }
    
    console.log(`=== AUDIT COMPLETE: ${success} / 10 WEB NOVELS LOADED REAL CHAPTERS DIRECTLY ===`);
}

runRealWebnovelAudit();
