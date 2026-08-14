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

// Known Real-World Dedicated Providers
module.exports = function getUniversalChapters(title = 'Novel', author = '', synopsis = '') {
    let cleanQuery = (title || 'Novel').trim();
    cleanQuery = cleanQuery.replace(/^\d+[-_\s]*/, '').replace(/:\s*(Reese's Book Club|Oprah's Book Club|A Novel|A Memoir|TikTok Made Me Buy It).*/gi, '').trim();

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

    // 10. Dedicated Provider for SSS-Rank Livestream (Strict Match Only)
    if (lower.includes('sss-rank livestream') || lower.includes('livestream hunter')) {
        return getSSSRankLivestreamChapters();
    }

    // No synthetic/fake story generator! Return null so real Gutenberg or Internet Archive can fetch authentic text.
    return null;
};
