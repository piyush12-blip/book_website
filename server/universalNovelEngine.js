const getShadowSlaveChapters = require('./shadowSlave');
const getSSSRankLivestreamChapters = require('./sssRankLivestream');

module.exports = function getUniversalChapters(title = 'Novel', author = 'Author', synopsis = '') {
    const cleanTitle = (title || '').trim();
    const lower = cleanTitle.toLowerCase();

    // 1. Dedicated Provider for Shadow Slave
    if (lower.includes('shadow slave') || lower.includes('9ee7510b') || lower.includes('mangadex artist')) {
        return getShadowSlaveChapters();
    }

    // 2. Dedicated Provider for "Starting With SSS-rank: I Get A New Skill Every Livestream"
    if (lower.includes('livestream') || lower.includes('sss-rank') || lower.includes('skill every') || lower.includes('starting with sss')) {
        return getSSSRankLivestreamChapters();
    }

    // 3. Universal Dynamic Chapter Engine for ANY Novel / WebNovel / Book
    return [
        {
            title: `Chapter 1: The Beginning of ${cleanTitle}`,
            html: `<p class="dropcap-para"><span class="dropcap">${cleanTitle.charAt(0) || 'T'}</span>he sun was setting over the horizon when the world shifted forever. ${cleanTitle} by ${author} opens in a world brimming with tension and uncharted mystery.</p>
            <p>${synopsis ? synopsis : `Every legend begins with a single choice, and for our protagonist, that choice came far sooner than anyone could have anticipated.`}</p>
            <p>Shadows lengthened across the ground as distant echoes filled the air. Something ancient was stirring in the deep, and the journey ahead promised to test every ounce of courage, resolve, and wit.</p>`
        },
        {
            title: `Chapter 2: The Path Ahead`,
            html: `<p class="dropcap-para"><span class="dropcap">W</span>ith each step forward, the true stakes of ${cleanTitle} began to unravel. The wind howled through the narrow corridors, carrying with it whispers of forgotten lore and unspoken warnings.</p>
            <p>"If you walk down this path," a low voice echoed from the dim light, "there is no turning back."</p>
            <p>Unflinching, our hero tightened their grip, stepping out of the shadows and into the heart of the storm.</p>`
        },
        {
            title: `Chapter 3: Trials & Revelation`,
            html: `<p class="dropcap-para"><span class="dropcap">T</span>he air grew dense with unspoken magic and raw adrenaline. In the heat of the trial, secrets long buried beneath centuries of silence finally came to light.</p>
            <p>Every trial confronted the core of who they were—forcing a choice between standing down or unleashing an inner power capable of reshaping the future of ${cleanTitle}.</p>`
        },
        {
            title: `Chapter 4: The Turning Tide`,
            html: `<p class="dropcap-para"><span class="dropcap">F</span>ortune favors the bold. As the battle lines were drawn, the momentum shifted dramatically. Allies aligned, hidden abilities manifested, and the path to victory emerged through the chaos.</p>
            <p>"This is only the beginning," they whispered as the dawn broke across the bloodstained horizon.</p>`
        },
        {
            title: `Chapter 5: Rising Legend`,
            html: `<p class="dropcap-para"><span class="dropcap">A</span> new chapter had dawned. Standing atop the conquered peak, looking down at the vast expanse of the world below, the name ${cleanTitle} echoed across the lands, sealed in history.</p>`
        }
    ];
};
