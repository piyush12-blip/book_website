const getShadowSlaveChapters = require('./shadowSlave');
const getSSSRankLivestreamChapters = require('./sssRankLivestream');
const getLockeLamoraChapters = require('./lockeLamora');
const getEbenezerLePageChapters = require('./ebenezerLePage');
const getManWhoLovedChildrenChapters = require('./manWhoLovedChildren');
const getBoxManChapters = require('./boxMan');
const getStationElevenChapters = require('./stationEleven');
const getDictionaryOfLostWordsChapters = require('./dictionaryOfLostWords');
const getOrphanMastersSonChapters = require('./orphanMastersSon');
const getShadowOfTheWindChapters = require('./shadowOfTheWind');

// Known Real-World Author Dictionary for Instant Precise Double-Locking
const KNOWN_AUTHORS = [
    { titleKey: 'shadow of the wind', title: 'The Shadow of the Wind', author: 'Carlos Ruiz Zafón' },
    { titleKey: 'orphan master', title: "The Orphan Master's Son", author: 'Adam Johnson' },
    { titleKey: 'dictionary of lost words', title: 'The Dictionary of Lost Words', author: 'Pip Williams' },
    { titleKey: 'dune', title: 'Dune', author: 'Frank Herbert' },
    { titleKey: '1984', title: '1984', author: 'George Orwell' },
    { titleKey: 'neuromancer', title: 'Neuromancer', author: 'William Gibson' },
    { titleKey: 'station eleven', title: 'Station Eleven', author: 'Emily St. John Mandel' },
    { titleKey: 'box man', title: 'The Box Man', author: 'Kobo Abe' },
    { titleKey: 'loved children', title: 'The Man Who Loved Children', author: 'Christina Stead' },
    { titleKey: 'ebenezer', title: 'The Book of Ebenezer Le Page', author: 'G.B. Edwards' },
    { titleKey: 'locke', title: 'The Lies of Locke Lamora', author: 'Scott Lynch' },
    { titleKey: 'harry potter', title: 'Harry Potter', author: 'J.K. Rowling' }
];

module.exports = function getUniversalChapters(title = 'Novel', author = '', synopsis = '') {
    let cleanQuery = (title || 'Novel').trim();
    cleanQuery = cleanQuery.replace(/^\d+[-_\s]*/, '').replace(/:\s*(Reese's Book Club|Oprah's Book Club|A Novel|A Memoir|TikTok Made Me Buy It).*/gi, '').trim();

    let cleanTitle = cleanQuery;
    let cleanAuthor = (author || '').trim();

    const lower = cleanQuery.toLowerCase();

    // 1. Dedicated Provider for The Shadow of the Wind by Carlos Ruiz Zafón
    if (lower.includes('shadow of the wind') || lower.includes('ruiz zafon') || lower.includes('zafon')) {
        return getShadowOfTheWindChapters();
    }

    // 2. Dedicated Provider for The Orphan Master's Son by Adam Johnson
    if (lower.includes('orphan master') || lower.includes('adam johnson')) {
        return getOrphanMastersSonChapters();
    }

    // 3. Dedicated Provider for The Dictionary of Lost Words by Pip Williams
    if (lower.includes('dictionary of lost words') || lower.includes('pip williams')) {
        return getDictionaryOfLostWordsChapters();
    }

    // 4. Dedicated Provider for Station Eleven by Emily St. John Mandel
    if (lower.includes('station eleven') || lower.includes('station-eleven') || lower.includes('mandel')) {
        return getStationElevenChapters();
    }

    // 5. Dedicated Provider for The Box Man by Kobo Abe
    if (lower.includes('box man') || lower.includes('boxman') || lower.includes('kobo abe')) {
        return getBoxManChapters();
    }

    // 6. Dedicated Provider for The Man Who Loved Children by Christina Stead
    if (lower.includes('man who loved children') || lower.includes('loved children')) {
        return getManWhoLovedChildrenChapters();
    }

    // 7. Dedicated Provider for The Book of Ebenezer Le Page by G.B. Edwards
    if (lower.includes('ebenezer') || lower.includes('le page')) {
        return getEbenezerLePageChapters();
    }

    // 8. Dedicated Provider for The Lies of Locke Lamora by Scott Lynch
    if (lower.includes('locke') || lower.includes('lamora') || lower.includes('lies of locke')) {
        return getLockeLamoraChapters();
    }

    // 9. Dedicated Provider for Shadow Slave (Strictly Shadow Slave)
    if (lower.includes('shadow slave') || lower.includes('9ee7510b')) {
        return getShadowSlaveChapters();
    }

    // 10. Dedicated Provider for SSS-Rank Livestream
    if (lower.includes('livestream') || lower.includes('sss-rank') || lower.includes('starting with sss')) {
        return getSSSRankLivestreamChapters();
    }

    // Precise Dual Lock Resolution (Title + Author)
    const matchedAuthorEntry = KNOWN_AUTHORS.find(a => lower.includes(a.titleKey));
    if (matchedAuthorEntry) {
        cleanTitle = matchedAuthorEntry.title;
        cleanAuthor = matchedAuthorEntry.author;
    } else if (!cleanAuthor || cleanAuthor === 'Author' || cleanAuthor === 'Lies') {
        const words = cleanQuery.split(/\s+/);
        if (words.length >= 3) {
            cleanAuthor = words.slice(-2).join(' ');
            cleanTitle = words.slice(0, -2).join(' ');
        } else {
            cleanAuthor = 'Classic Author';
        }
    }

    const displayTitle = cleanTitle;
    const displayAuthor = cleanAuthor;
    const firstLetter = displayTitle.charAt(0).toUpperCase() || 'T';

    // UNIVERSAL DUAL-LOCK ENGINE
    return [
        {
            title: `Chapter 1: The Opening of ${displayTitle}`,
            html: `<p class="dropcap-para"><span class="dropcap">${firstLetter}</span>he world of <em>${displayTitle}</em> by ${displayAuthor} opens in an atmosphere charged with narrative weight and subtle tension.</p>
            <p>${synopsis ? synopsis : `From the very first scene, ${displayAuthor} establishes a distinct world, introducing key motives, hidden alliances, and impending choices.`}</p>
            <p>As the initial chapter unfolds, the central themes of ${displayTitle} take root, setting the stage for a story destined to leave a lasting mark.</p>`
        },
        {
            title: `Chapter 2: Gathering Storm`,
            html: `<p class="dropcap-para"><span class="dropcap">W</span>ith the foundation established, the scope of <em>${displayTitle}</em> expands into greater complexity.</p>
            <p>New challenges emerge, testing the core resolve of the characters. ${displayAuthor} crafts a compelling balance of internal struggle and external conflict, driving the journey forward.</p>`
        },
        {
            title: `Chapter 3: The Turning Point`,
            html: `<p class="dropcap-para"><span class="dropcap">T</span>he heart of <em>${displayTitle}</em> is reached as tension peaks into a decisive moment. Long-buried secrets come to light, altering the course of the story forever.</p>`
        },
        {
            title: `Chapter 4: The Crucible`,
            html: `<p class="dropcap-para"><span class="dropcap">I</span>n the aftermath of the turning point, the consequences reverberate through every scene. The characters must stand firm against impossible odds.</p>`
        },
        {
            title: `Chapter 5: The Legacy of ${displayTitle}`,
            html: `<p class="dropcap-para"><span class="dropcap">A</span>s the final chapter closes, the overarching vision of ${displayAuthor} in <em>${displayTitle}</em> comes into full view—a powerful conclusion to an unforgettable journey.</p>`
        }
    ];
};
