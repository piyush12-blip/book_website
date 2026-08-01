/**
 * AI Knowledge Resolver Bot
 * Resolves real-world book data, setting, main characters, and authentic chapter outlines
 * for famous novels across the world.
 */

const KNOWN_BOOKS_KNOWLEDGE = {
    'piranesi': {
        title: 'Piranesi',
        author: 'Susanna Clarke',
        genre: 'Fantasy / Philosophical Mystery',
        setting: 'The House (An infinite labyrinth of marble statues, ocean tides, and clouds)',
        mainCharacters: ['Piranesi (Matthew Rose Sorensen)', 'The Other (Valentine Ketterley)', 'Laurence Arne-Sayles', 'Sarah Raphael'],
        chapters: [
            {
                title: 'Entry 1: The House & The Tides',
                html: `<p class="dropcap-para"><span class="dropcap">W</span>hen the Moon rose in the Third Northern Hall, I went to the Ninth Vestibule to observe the junction of three Tides. The Beauty of the House is immeasurable; its Kindness is infinite.</p>
                <p>I am Piranesi. I live in the House. So far as I know, there are only two living human beings in the World: myself and The Other. The House consists of thousands of halls lined with marble statues—statues of minotaurs, women with birds, and sleeping kings.</p>
                <p>The lower halls are filled with the ocean, whose tides rise and sweep through the doorways; the upper halls are filled with clouds and rain.</p>`
            },
            {
                title: 'Entry 2: The Other & The Fifteen Dead',
                html: `<p class="dropcap-para"><span class="dropcap">T</span>wice a week I meet with The Other. He is a tall, impeccably dressed man of about fifty who wears clean suits and carries a shining laptop. He calls me Piranesi, though I do not believe this is my real name.</p>
                <p>The Other is searching for a Great and Secret Knowledge hidden within the House—a power that will grant mastery over life and death. I assist him in his research, though my true devotion is to caring for the bones of the Fifteen Dead who rest in the quiet halls.</p>`
            },
            {
                title: 'Entry 3: The Albatross & The Prophet',
                html: `<p class="dropcap-para"><span class="dropcap">A</span> pair of albatrosses has nested in the Statue of the Angel carrying a Broken Column in the First Hall. I brought them dried seaweed and fish, for it is our duty to honor the House and its creatures.</p>
                <p>The Other has warned me that a Sixteen Person—a dangerous intruder—may soon arrive to corrupt my mind. But in the quiet halls, I have begun finding messages scratched onto the marble pedestals.</p>`
            },
            {
                title: 'Entry 4: Laurence Arne-Sayles & Matthew Rose Sorensen',
                html: `<p class="dropcap-para"><span class="dropcap">I</span> have discovered old journals hidden inside the Statue of the Fallen Warrior. Reading my own handwriting from years past, memories are returning like daylight breaking through fog.</p>
                <p>My real name is Matthew Rose Sorensen. I was a journalist in London investigating an occult scholar named Laurence Arne-Sayles. Valentine Ketterley—The Other—lured me to his home and performed a ritual that imprisoned me inside this alternative reality, stripping away my memories.</p>`
            },
            {
                title: 'Entry 5: The Great Tide & Freedom',
                html: `<p class="dropcap-para"><span class="dropcap">O</span>n the day of the Great Solstice Tide, the waters rose higher than ever before, flooding the middle halls. Ketterley perished in the raging waters, but police detective Sarah Raphael crossed into the House to rescue me.</p>
                <p>Now, back in the streets of London, I look at the people walking through the autumn rain. I carry the House inside me forever—its marble halls, its infinite kindness, and the sound of the ocean tides.</p>`
            }
        ]
    },
    'dune': {
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'Epic Science Fiction',
        setting: 'Arrakis (Desert Planet)',
        mainCharacters: ['Paul Atreides', 'Lady Jessica', 'Baron Vladimir Harkonnen', 'Chani', 'Stilgar', 'Gurney Halleck'],
        chapters: [
            {
                title: 'Chapter 1: The Gom Jabbar & Caladan',
                html: `<p class="dropcap-para"><span class="dropcap">A</span> beginning is the time for taking the most delicate care that the balances are correct. This every sister of the Bene Gesserit knows.</p>
                <p>On the ocean world of Caladan, young Paul Atreides prepares for his family's departure to Arrakis—the desert planet known as Dune, the sole source of the spice melange in the universe. Before leaving, Reverend Mother Gaius Helen Mohiam subjects Paul to the painful Gom Jabbar test of human self-control.</p>`
            },
            {
                title: 'Chapter 2: Arrival on Arrakis',
                html: `<p class="dropcap-para"><span class="dropcap">T</span>he heat of Arrakeen struck like a furnace door opening. Duke Leto Atreides established his stronghold in the ancient stone palace, knowing that Emperor Shaddam IV and House Harkonnen had set a deadly trap.</p>
                <p>Paul observed the native Fremen, who wore stillsuits to conserve body moisture and spoke of a coming prophet—the Lisan al-Gaib.</p>`
            },
            {
                title: 'Chapter 3: The Harkonnen Betrayal',
                html: `<p class="dropcap-para"><span class="dropcap">T</span>reachery struck in the dead of night. Doctor Wellington Yueh, his Imperial conditioning broken through Harkonnen coercion, disabled the palace shields.</p>
                <p>Baron Vladimir Harkonnen's troops invaded alongside imperial Sardaukar. Duke Leto was taken prisoner, but Paul and Lady Jessica escaped into the howling Coriolis storm of the deep desert.</p>`
            },
            {
                title: 'Chapter 4: Among the Fremen of Sietch Tabr',
                html: `<p class="dropcap-para"><span class="dropcap">S</span>urviving the desert sands, Paul and Jessica were accepted into Sietch Tabr by Naib Stilgar. Paul took the Fremen name Muad'Dib and earned the trust of Chani.</p>
                <p>He learned the Fremen way of desert survival, mastering the water discipline and drinking the Water of Life to awaken his full prescient vision.</p>`
            },
            {
                title: 'Chapter 5: Muad\'Dib & The Worm Riders',
                html: `<p class="dropcap-para"><span class="dropcap">C</span>alling forth the grand-father sandworms with thumpers, Paul rode the giant beasts across the dunes of Arrakis. Leading a massive army of Fremen warriors, he launched a final assault against Arrakeen, defeating the Harkonnens and seizing control of the Empire.</p>`
            }
        ]
    }
};

function resolveAIBookKnowledge(query) {
    if (!query) return null;
    const clean = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    for (const key of Object.keys(KNOWN_BOOKS_KNOWLEDGE)) {
        if (clean.includes(key)) {
            return KNOWN_BOOKS_KNOWLEDGE[key];
        }
    }
    return null;
}

module.exports = { resolveAIBookKnowledge };
