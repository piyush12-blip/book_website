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
,
    'silentpatient': {
    "title": "The Silent Patient",
    "author": "Alex Michaelides",
    "genre": "Psychological Thriller",
    "setting": "The Grove (Psychiatric Hospital, London)",
    "mainCharacters": [
        "Alicia Berenson",
        "Theo Faber",
        "Gabriel Berenson",
        "Jean-Felix"
    ],
    "chapters": [
        {
            "title": "Part 1: Alicia",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">A</span>licia Berenson was thirty-three years old when she killed her husband.</p><p>They had been married for seven years. They were both artists—Alicia was a painter, and Gabriel was a well-known fashion photographer. He was murdered late one evening, tied to a chair and shot five times in the face.</p><p>Alicia was found standing by the fireplace, her white dress covered in blood. And she never spoke another word.</p>"
        },
        {
            "title": "Part 2: Theo Faber",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">I</span> had been waiting for the opportunity to work with Alicia Berenson for a long time. As a criminal psychotherapist, her case fascinated me. Why did she remain silent? What was she hiding?</p><p>When a position opened at The Grove, the secure psychiatric facility where she was held, I applied immediately. I was determined to be the one to make her speak.</p>"
        },
        {
            "title": "Part 3: The Alcestis",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">A</span>licia's final painting before the murder was a self-portrait. In the bottom left corner, she had scrawled a single word in light blue paint: ALCESTIS.</p><p>Alcestis is a Greek myth about a woman who sacrifices her life for her husband, and upon returning from the dead, remains eternally silent. I stared at the painting, realizing the key to her silence was locked within that myth.</p>"
        }
    ]
},
    'harrypotter': {
    "title": "Harry Potter and the Sorcerers Stone",
    "author": "J.K. Rowling",
    "genre": "Fantasy",
    "setting": "Hogwarts School of Witchcraft and Wizardry",
    "mainCharacters": [
        "Harry Potter",
        "Ron Weasley",
        "Hermione Granger",
        "Albus Dumbledore"
    ],
    "chapters": [
        {
            "title": "Chapter 1: The Boy Who Lived",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">M</span>r. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.</p><p>They were the last people you'd expect to be involved in anything strange or mysterious, because they just didn't hold with such nonsense. But late one night, a giant flying motorcycle landed on their street, delivering a baby with a lightning-bolt scar on his forehead.</p>"
        },
        {
            "title": "Chapter 2: The Vanishing Glass",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">N</span>early ten years had passed since the Dursleys had woken up to find their nephew on the front step, but Privet Drive had hardly changed at all.</p><p>Harry was forced to sleep in the cupboard under the stairs. But strange things always seemed to happen around him. Like the time at the zoo, when the glass on the boa constrictor's tank suddenly vanished, and the snake slithered out, whispering, 'Brazil, here I come.'</p>"
        }
    ]
},
    'davincicode': {
    "title": "The Da Vinci Code",
    "author": "Dan Brown",
    "genre": "Thriller",
    "setting": "The Louvre, Paris",
    "mainCharacters": [
        "Robert Langdon",
        "Sophie Neveu",
        "Jacques Saunière",
        "Silas"
    ],
    "chapters": [
        {
            "title": "Chapter 1: The Louvre",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">R</span>enowned curator Jacques Saunière staggered through the vaulted archway of the museum's Grand Gallery. He lunged for the nearest painting he could see, a Caravaggio.</p><p>Grabbing the gilded frame, the seventy-six-year-old man heaved his masterpiece toward himself until it tore from the wall. As he collapsed, a thundering iron gate fell nearby, barricading the entrance to the suite. He knew his assassin was on the other side.</p>"
        },
        {
            "title": "Chapter 2: Robert Langdon",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">R</span>obert Langdon awoke with a start. The phone beside his bed in the Hotel Ritz was ringing. It was the French police.</p><p>The curator of the Louvre had been murdered, and Langdon was the last person scheduled to meet him. When Langdon arrived at the scene, he found Saunière's body arranged in the exact position of Leonardo da Vinci's Vitruvian Man, with a cryptic message written in blood.</p>"
        }
    ]
},
    'hobbit': {
    "title": "The Hobbit",
    "author": "J.R.R. Tolkien",
    "genre": "Fantasy",
    "setting": "Middle-earth",
    "mainCharacters": [
        "Bilbo Baggins",
        "Gandalf",
        "Thorin Oakenshield",
        "Gollum"
    ],
    "chapters": [
        {
            "title": "Chapter 1: An Unexpected Party",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">I</span>n a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat: it was a hobbit-hole, and that means comfort.</p><p>Bilbo Baggins was a very respectable hobbit. But his peaceful life was turned upside down the day Gandalf the wizard arrived, followed closely by thirteen dwarves, who proceeded to eat everything in his pantry and sing songs of dark mountains and stolen gold.</p>"
        }
    ]
},
    '1984': {
    "title": "1984",
    "author": "George Orwell",
    "genre": "Dystopian",
    "setting": "Airstrip One",
    "mainCharacters": [
        "Winston Smith"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>It was a bright cold day in April, and the clocks were striking thirteen.</p>"
        }
    ]
},
    'dune': {
    "title": "Dune",
    "author": "Frank Herbert",
    "genre": "Sci-Fi",
    "setting": "Arrakis",
    "mainCharacters": [
        "Paul Atreides"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>A beginning is the time for taking the most delicate care that the balances are correct.</p>"
        }
    ]
},
    'farenheit451': {
    "title": "Fahrenheit 451",
    "author": "Ray Bradbury",
    "genre": "Dystopian",
    "setting": "America",
    "mainCharacters": [
        "Guy Montag"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>It was a pleasure to burn.</p>"
        }
    ]
},
    'greatgatsby': {
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "genre": "Classic",
    "setting": "New York",
    "mainCharacters": [
        "Jay Gatsby"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>In my younger and more vulnerable years my father gave me some advice.</p>"
        }
    ]
},
    'broker': {
    "title": "The Broker",
    "author": "John Grisham",
    "genre": "Thriller",
    "setting": "Italy",
    "mainCharacters": [
        "Joel Backman"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">T</span>he President of the United States, in the final hours of his term, granted a controversial pardon to Joel Backman, a notorious Washington power broker who had been imprisoned for hiding secrets that compromised the nation's most advanced satellite system.</p><p>The CIA had engineered the pardon, pulling the strings from the shadows. Their plan was simple: smuggle Backman out of the country, give him a new identity, and then leak his whereabouts to the foreign powers who wanted him dead. They would sit back and watch who killed him to figure out who really built the satellite system.</p>"
        },
        {
            "title": "Chapter 2",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">B</span>ackman was whisked away on a military cargo plane under the cover of darkness. He awoke in a safe house in Bologna, Italy. A CIA handler named Luigi gave him his new identity: Marco Lazzeri, a retired Canadian professor.</p><p>Joel had to learn Italian, blend into the cobblestone streets, and constantly look over his shoulder. He knew he was bait. The game of survival had just begun.</p>"
        }
    ]
},
    'lesmiserables': {
    "title": "Les Misérables",
    "author": "Victor Hugo",
    "genre": "Classic Literature",
    "setting": "France",
    "mainCharacters": [
        "Jean Valjean", "Bishop Myriel"
    ],
    "chapters": [
        {
            "title": "Volume 1: Fantine - Book First: A Just Man - Chapter 1: M. Myriel",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">I</span>n 1815, M. Charles-François-Bienvenu Myriel was Bishop of Digne. He was an old man of about seventy-five years of age; he had occupied the see of Digne since 1806.</p><p>Although this detail has no connection whatever with the real substance of what we are about to relate, it will not be superfluous, if merely for the sake of exactness in all points, to mention here the various rumors and remarks which had been in circulation about him from the very moment when he arrived in the diocese.</p><p>True or false, that which is said of men often occupies as important a place in their lives, and above all in their destinies, as that which they do. M. Myriel was the son of a councillor of the Parliament of Aix; hence he belonged to the nobility of the bar.</p>"
        },
        {
            "title": "Chapter 2: M. Myriel becomes M. Welcome",
            "html": "<p class=\"dropcap-para\"><span class=\"dropcap\">T</span>he episcopal palace of Digne adjoined the hospital. The episcopal palace was a huge and beautiful house, built of stone at the beginning of the last century by M. Henri Puget, Doctor of Theology of the Faculty of Paris, Abbé of Simore, who had been Bishop of Digne in 1712. This palace was a genuine seignorial residence.</p><p>Everything about it had a grand air,—the apartments of the Bishop, the drawing-rooms, the chambers, the court of honor, which was very large, with walks arched with Florence brick, and gardens planted with magnificent trees.</p><p>In the dining-room, a long and superb gallery which was situated on the ground floor and opened on the gardens, M. Henri Puget had entertained in state, on the 29th of July, 1714, Monseigneur Charles Brûlart de Genlis, archbishop; Prince de Embrun; Antoine de Mesgrigny, the capuchin, Bishop of Grasse; Philippe de Vendôme, Grand Prior of France, Abbé of Saint Honoré de Lérins; François de Berton de Crillon, bishop, Baron de Vence; César de Sabran de Forcalquier, bishop, Seignor of Glandève; and Jean Soanen, Priest of the Oratory, preacher in ordinary to the king, bishop, Seignor of Senez. The portraits of these seven reverend personages decorated this apartment; and this memorable date, the 29th of July, 1714, was there engraved in letters of gold on a table of white marble.</p>"
        }
    ]
},
    'mockingbird': {
    "title": "To Kill a Mockingbird",
    "author": "Harper Lee",
    "genre": "Classic",
    "setting": "Maycomb",
    "mainCharacters": [
        "Scout Finch"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow.</p>"
        }
    ]
},
    'catcher': {
    "title": "The Catcher in the Rye",
    "author": "J.D. Salinger",
    "genre": "Classic",
    "setting": "New York",
    "mainCharacters": [
        "Holden Caulfield"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>If you really want to hear about it, the first thing you'll probably want to know is where I was born.</p>"
        }
    ]
},
    'lordoftherings': {
    "title": "The Fellowship of the Ring",
    "author": "J.R.R. Tolkien",
    "genre": "Fantasy",
    "setting": "Middle-earth",
    "mainCharacters": [
        "Frodo"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>When Mr. Bilbo Baggins of Bag End announced that he would shortly be celebrating his eleventy-first birthday...</p>"
        }
    ]
},
    'prideandprejudice': {
    "title": "Pride and Prejudice",
    "author": "Jane Austen",
    "genre": "Romance",
    "setting": "England",
    "mainCharacters": [
        "Elizabeth Bennet"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p>"
        }
    ]
},
    'alchemist': {
    "title": "The Alchemist",
    "author": "Paulo Coelho",
    "genre": "Fiction",
    "setting": "Spain",
    "mainCharacters": [
        "Santiago"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>The boy's name was Santiago. Dusk was falling as the boy arrived with his herd at an abandoned church.</p>"
        }
    ]
},
    'daisyjones': {
    "title": "Daisy Jones & The Six",
    "author": "Taylor Jenkins Reid",
    "genre": "Fiction",
    "setting": "Los Angeles",
    "mainCharacters": [
        "Daisy Jones"
    ],
    "chapters": [
        {
            "title": "Chapter 1",
            "html": "<p>I had absolutely no interest in being somebody else's muse.</p>"
        }
    ]
}};

function resolveAIBookKnowledge(query) {
    if (!query) return null;
    const clean = query.toLowerCase().replace(/[^a-z0-9]/g, ''); // strip all spaces

    for (const key of Object.keys(KNOWN_BOOKS_KNOWLEDGE)) {
        if (clean.includes(key)) {
            return KNOWN_BOOKS_KNOWLEDGE[key];
        }
    }
    
    // Hardcoded fixes for typos and stripped accents
    if (clean.includes('fahrenheit451') || clean.includes('farenheit')) return KNOWN_BOOKS_KNOWLEDGE['farenheit451'];
    if (clean.includes('daisyjones')) return KNOWN_BOOKS_KNOWLEDGE['daisyjones'];
    if (clean.includes('lesmisrables') || clean.includes('lesmiserables') || clean.includes('jeanvaljean')) return KNOWN_BOOKS_KNOWLEDGE['lesmiserables'];
    
    return null;
}

module.exports = { resolveAIBookKnowledge };
