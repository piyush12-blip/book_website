/**
 * Master Index of Top Popular Manga & Manhwa
 * Enables instant typing search (<1ms) for prefixes (e.g. "bluelo", "jujut", "chains", "solo lev", "one pie")
 * Maps directly to exact Mangapill series IDs, titles, and high-res cover art.
 */

const POPULAR_MANGA_CATALOG = [
    {
        id: 'mangapill-580-blue-lock',
        title: 'Blue Lock',
        altTitle: 'BLUELOCK',
        author: 'Kaneshiro Muneyuki · Nomura Yuusuke',
        slug: 'blue-lock',
        mangaId: '580',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/580.webp',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2018',
        synopsis: 'After a disastrous defeat at the 2018 World Cup, Japan struggles to regroup. The Japanese Football Union hires Ego Jinpachi to create Blue Lock: a training facility where 300 high school strikers compete until only one remains.'
    },
    {
        id: 'mangapill-6749-blue-lock-episode-nagi',
        title: 'Blue Lock: Episode Nagi',
        altTitle: 'BLUELOCK -EPISODE Nagi-',
        author: 'Kaneshiro Muneyuki · Sannomiya Kouta',
        slug: 'blue-lock-episode-nagi',
        mangaId: '6749',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/6749.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2022',
        synopsis: 'A spin-off following Seishiro Nagi, a second-year high school student whose lazy life changes when classmate Reo Mikage discovers his hidden soccer genius.'
    },
    {
        id: 'mangapill-7652-shousetsu-blue-lock-tatakai-no-mae-bokura-wa',
        title: 'Shousetsu Blue Lock: Tatakai no Mae, Bokura wa.',
        altTitle: 'Blue Lock Novel',
        author: 'Kaneshiro Muneyuki · Yoshizawa Satoru',
        slug: 'shousetsu-blue-lock-tatakai-no-mae-bokura-wa',
        mangaId: '7652',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/7652.jpeg',
        genre: 'LIGHT NOVEL',
        status: 'Publishing',
        year: '2022',
        synopsis: 'Official light novel detailing the untold pasts and backstories of Blue Lock strikers before entering the facility.'
    },
    {
        id: 'mangapill-8136-solo-leveling-novel',
        title: 'Solo Leveling Novel',
        altTitle: 'Na Honjaman Level Up',
        author: 'Chugong',
        slug: 'solo-leveling-novel',
        mangaId: '8136',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/8136.jpeg',
        genre: 'LIGHT NOVEL',
        status: 'Finished',
        year: '2016',
        synopsis: 'Known as the Weakest Hunter of All Mankind, Sung Jinwoo discovers a dual dungeon that grants him a unique quest log that allows him to level up endlessly.'
    },
    {
        id: 'mangapill-8202-solo-leveling-ragnarok-novel',
        title: 'Solo Leveling: Ragnarok Novel',
        altTitle: 'Solo Leveling Ragnarok',
        author: 'Daul',
        slug: 'solo-leveling-ragnarok-novel',
        mangaId: '8202',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/8202.jpeg',
        genre: 'LIGHT NOVEL',
        status: 'Publishing',
        year: '2023',
        synopsis: 'The official sequel novel to Solo Leveling focusing on Sung Suho, the son of Shadow Monarch Sung Jinwoo.'
    },
    {
        id: 'mangapill-723-chainsaw-man',
        title: 'Chainsaw Man',
        altTitle: 'CSM',
        author: 'Fujimoto Tatsuki',
        slug: 'chainsaw-man',
        mangaId: '723',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/723.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2018',
        synopsis: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita. When betrayed and killed, Pochita merges with Denji, reviving him as the Chainsaw Man.'
    },
    {
        id: 'mangapill-2-one-piece',
        title: 'One Piece',
        altTitle: 'OP',
        author: 'Oda Eiichiro',
        slug: 'one-piece',
        mangaId: '2',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '1997',
        synopsis: 'Monkey D. Luffy embarks on a journey with his pirate crew across the Grand Line to find the legendary treasure One Piece and become King of the Pirates.'
    },
    {
        id: 'mangapill-3069-naruto',
        title: 'Naruto',
        altTitle: 'NARUTO',
        author: 'Kishimoto Masashi',
        slug: 'naruto',
        mangaId: '3069',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/3069.jpg',
        genre: 'MANGA',
        status: 'Finished',
        year: '1999',
        synopsis: 'Naruto Uzumaki, an orphan ninja hosting the Nine-Tailed Demon Fox, strives for the acknowledgment of his peers and dreams of becoming Hokage.'
    },
    {
        id: 'mangapill-7529-kagurabachi',
        title: 'Kagurabachi',
        altTitle: 'Kagura Bachi',
        author: 'Hokazono Takeru',
        slug: 'kagurabachi',
        mangaId: '7529',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/7529.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2023',
        synopsis: 'Chihiro, son of a renowned swordsmith, uses his enchanted blade to avenge his father and recover six stolen mystical katanas.'
    },
    {
        id: 'mangapill-5460-dandadan',
        title: 'Dandadan',
        altTitle: 'Dan Da Dan',
        author: 'Tatsu Yukinobu',
        slug: 'dandadan',
        mangaId: '5460',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/5460.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2021',
        synopsis: 'Momo Ayase believes in ghosts, and Okarun believes in aliens. When they test each other’s beliefs, they stumble into a chaotic world of occult curses and extraterrestrial battles.'
    },
    {
        id: 'mangapill-2245-kengan-omega',
        title: 'Kengan Omega',
        altTitle: 'Kengan Asura 2',
        author: 'Sandrovich Yabako · Daromeon',
        slug: 'kengan-omega',
        mangaId: '2245',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/2245.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2019',
        synopsis: 'Two years after the Kengan Annihilation Tournament, a young man named Narushima Koga strives to enter the underground combat circuit.'
    },
    {
        id: 'mangapill-1828-hunter-x-hunter',
        title: 'Hunter x Hunter',
        altTitle: 'HxH',
        author: 'Togashi Yoshihiro',
        slug: 'hunter-x-hunter',
        mangaId: '1828',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/1828.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '1998',
        synopsis: 'Gon Freecss discovers his father is a legendary Hunter and embarks on a dangerous journey to pass the Hunter Examination and find him.'
    },
    {
        id: 'mangapill-8-kingdom',
        title: 'Kingdom',
        altTitle: 'Warring States',
        author: 'Hara Yasuhisa',
        slug: 'kingdom',
        mangaId: '8',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/8.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2006',
        synopsis: 'During China’s Warring States period, orphan Xin trains relentlessly to fulfill a promise to become the greatest general under the heavens.'
    },
    {
        id: 'mangapill-17-bleach',
        title: 'Bleach',
        altTitle: 'BLEACH',
        author: 'Kubo Tite',
        slug: 'bleach',
        mangaId: '17',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/17.jpeg',
        genre: 'MANGA',
        status: 'Finished',
        year: '2001',
        synopsis: 'Ichigo Kurosaki gains the powers of a Soul Reaper and must protect the living and the spirit world from malicious spirits called Hollows.'
    },
    {
        id: 'mangapill-1-berserk',
        title: 'Berserk',
        altTitle: 'The Black Swordsman',
        author: 'Miura Kentaro',
        slug: 'berserk',
        mangaId: '1',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/1.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '1989',
        synopsis: 'Guts, a solitary mercenary known as the Black Swordsman, wanders a dark, brutal medieval world seeking revenge against his former comrade Griffith.'
    },
    {
        id: 'mangapill-6040-jujutsu-kaisen',
        title: 'Jujutsu Kaisen',
        altTitle: 'JJK',
        author: 'Akutami Gege',
        slug: 'jujutsu-kaisen',
        mangaId: '6040',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/6040.jpeg',
        genre: 'MANGA',
        status: 'Finished',
        year: '2018',
        synopsis: 'Yuji Itadori swallows a cursed talisman—the finger of Ryomen Sukuna—and joins Jujutsu High to exorcise dangerous Curses.'
    },
    {
        id: 'mangapill-10144-fairy-tail-re-fantasia',
        title: 'FAIRY TAIL Re:Fantasia',
        altTitle: 'Fairy Tail Spin-off',
        author: 'Mashima Hiro',
        slug: 'fairy-tail-re-fantasia',
        mangaId: '10144',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/10144.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2026',
        synopsis: 'A brand-new dimension-hopping adventure featuring the beloved Fairy Tail guild.'
    },
    {
        id: 'mangapill-4933-spy-x-family',
        title: 'Spy x Family',
        altTitle: 'Spy Family',
        author: 'Endo Tatsuya',
        slug: 'spy-x-family',
        mangaId: '4933',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/4933.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2019',
        synopsis: 'A master spy must construct a fake family for a mission, unknowingly adopting a telepathic daughter and marrying a professional assassin.'
    },
    {
        id: 'mangapill-5085-tokyo-revengers',
        title: 'Tokyo Revengers',
        altTitle: 'Tokyo Manji Gang, Tokyo Manji Revengers',
        author: 'Wakui Ken',
        slug: 'tokyo-revengers',
        mangaId: '5085',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/5085.jpeg',
        genre: 'MANGA',
        status: 'Finished',
        year: '2017',
        synopsis: 'Takemichi Hanagaki travels 12 years back in time to his middle school years to save his ex-girlfriend Hinata from being murdered by the Tokyo Manji Gang.'
    },
    {
        id: 'mangapill-4080-sono-bisque-doll-wa-koi-wo-suru',
        title: 'Sono Bisque Doll wa Koi wo Suru',
        altTitle: 'My Dress-Up Darling',
        author: 'Fukuda Shinichi',
        slug: 'sono-bisque-doll-wa-koi-wo-suru',
        mangaId: '4080',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/4080.jpeg',
        genre: 'MANGA',
        status: 'Finished',
        year: '2018',
        synopsis: 'Traumatized by a childhood incident, doll-artisan hopeful Wakana Gojou passes his days as a loner until popular girl Marin Kitagawa discovers his secret talent.'
    },
    {
        id: 'mangapill-4081-vinland-saga',
        title: 'Vinland Saga',
        altTitle: 'Vinland',
        author: 'Yukimura Makoto',
        slug: 'vinland-saga',
        mangaId: '4081',
        coverImage: 'https://cdn.readdetectiveconan.com/file/mangapill/i/4081.jpeg',
        genre: 'MANGA',
        status: 'Publishing',
        year: '2005',
        synopsis: 'Thorfinn pursues vengeance against Askeladd, his father’s killer, while dreaming of finding the peaceful land of Vinland.'
    },
    {
        id: 'mangabuddy-hidden-fire.ZDIUlQ',
        title: 'Hidden Fire',
        altTitle: 'Secret Fire · 숨겨진 불',
        author: 'Lee Yeonwoo',
        slug: 'hidden-fire.ZDIUlQ',
        coverImage: 'https://cdn1.love4awalk.xyz/thumb/hidden-fire.webp',
        genre: 'MANHWA (+18)',
        status: 'Ongoing',
        year: '2025',
        synopsis: 'Seo Doyoon welcomes his young stepmother Lee Yeonwoo into their home following his father’s remarriage. While they appear to be a harmonious family on the surface, a hidden fire of forbidden attraction and intense tension begins to spark between them.'
    },
    {
        id: 'mangabuddy-secret-class.Yf0t1Y',
        title: 'Secret Class',
        altTitle: 'Bimil Su-eop · 비밀수업',
        author: 'Wang Gang Cheol · Minchan',
        slug: 'secret-class.Yf0t1Y',
        coverImage: 'https://cdn1.love4awalk.xyz/thumb/secret-class.webp',
        genre: 'MANHWA (+18)',
        status: 'Ongoing',
        year: '2020',
        synopsis: 'Daeho became an orphan at age 13 and was taken in by his father’s friend. As an adult, Daeho knows nothing about relationships until his foster family starts giving him secret lessons.'
    },
    {
        id: 'mangabuddy-boarding-diary.5E2Q1A',
        title: 'Boarding Diary',
        altTitle: 'Hasukilgi · 하숙일기',
        author: 'Kim Junshik · Park Hyeong-jun',
        slug: 'boarding-diary.5E2Q1A',
        coverImage: 'https://cdn1.love4awalk.xyz/thumb/boarding-diary.webp',
        genre: 'MANHWA (+18)',
        status: 'Completed',
        year: '2020',
        synopsis: 'Jun-woo moves to Seoul for college and boards at his mom’s friend’s house, only to discover unexpected charms and daily excitement with the family.'
    },
    {
        id: 'mangabuddy-silent-war.lF2M1Q',
        title: 'Silent War',
        altTitle: 'My Kingdom · 조용한 전쟁',
        author: 'Tharchin',
        slug: 'silent-war.lF2M1Q',
        coverImage: 'https://cdn1.love4awalk.xyz/thumb/silent-war.webp',
        genre: 'MANHWA (+18)',
        status: 'Completed',
        year: '2019',
        synopsis: 'Hyun-soo was an ordinary guy who was bullied and humiliated by his wealthy peers until he discovered their deepest secrets and turned the tables.'
    }
];

function searchCatalogIndex(query) {
    if (!query) return [];
    const cleanQ = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanQ.length < 2) return [];

    const matches = [];
    for (const item of POPULAR_MANGA_CATALOG) {
        const normTitle = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normAlt = (item.altTitle || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normSlug = (item.slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normTitle.includes(cleanQ) || normAlt.includes(cleanQ) || normSlug.includes(cleanQ) ||
            cleanQ.includes(normTitle) || normTitle.startsWith(cleanQ) || normAlt.startsWith(cleanQ)) {
            const proxied = `/api/proxy/image?url=${encodeURIComponent(item.coverImage)}`;
            matches.push({
                id: item.id,
                title: item.title,
                altTitle: item.altTitle,
                author: item.author,
                cover: proxied,
                image: proxied,
                lines: item.title.split(' ').slice(0, 3).join('<br>'),
                genre: item.genre,
                mood: 'Popular',
                year: item.year,
                status: item.status,
                pages: 100,
                rating: 5,
                synopsis: item.synopsis,
                hasEpub: false,
                format: item.genre,
                _isDirectSearchMatch: true
            });
        }
    }

    return matches;
}

module.exports = {
    POPULAR_MANGA_CATALOG,
    searchCatalogIndex
};
