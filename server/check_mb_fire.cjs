const { fetchMangaBuddyChapters } = require('./mangabuddy');

async function check() {
    const chs = await fetchMangaBuddyChapters('mangabuddy-hidden-fire.ZDIUlQ');
    chs.forEach((c, idx) => {
        console.log(`Index ${idx}: title="${c.title}" chNum=${c.chNum} id="${c.id}" url="${c.url}"`);
    });
}
check();
