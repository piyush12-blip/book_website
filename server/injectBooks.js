const fs = require('fs');

const moreBooks = {
    'silentpatient': {
        title: 'The Silent Patient',
        author: 'Alex Michaelides',
        genre: 'Psychological Thriller',
        setting: 'The Grove (Psychiatric Hospital, London)',
        mainCharacters: ['Alicia Berenson', 'Theo Faber', 'Gabriel Berenson', 'Jean-Felix'],
        chapters: [
            {
                title: 'Part 1: Alicia',
                html: `<p class="dropcap-para"><span class="dropcap">A</span>licia Berenson was thirty-three years old when she killed her husband.</p><p>They had been married for seven years. They were both artists—Alicia was a painter, and Gabriel was a well-known fashion photographer. He was murdered late one evening, tied to a chair and shot five times in the face.</p><p>Alicia was found standing by the fireplace, her white dress covered in blood. And she never spoke another word.</p>`
            },
            {
                title: 'Part 2: Theo Faber',
                html: `<p class="dropcap-para"><span class="dropcap">I</span> had been waiting for the opportunity to work with Alicia Berenson for a long time. As a criminal psychotherapist, her case fascinated me. Why did she remain silent? What was she hiding?</p><p>When a position opened at The Grove, the secure psychiatric facility where she was held, I applied immediately. I was determined to be the one to make her speak.</p>`
            },
            {
                title: 'Part 3: The Alcestis',
                html: `<p class="dropcap-para"><span class="dropcap">A</span>licia's final painting before the murder was a self-portrait. In the bottom left corner, she had scrawled a single word in light blue paint: ALCESTIS.</p><p>Alcestis is a Greek myth about a woman who sacrifices her life for her husband, and upon returning from the dead, remains eternally silent. I stared at the painting, realizing the key to her silence was locked within that myth.</p>`
            }
        ]
    },
    'harrypotter': {
        title: 'Harry Potter and the Sorcerers Stone',
        author: 'J.K. Rowling',
        genre: 'Fantasy',
        setting: 'Hogwarts School of Witchcraft and Wizardry',
        mainCharacters: ['Harry Potter', 'Ron Weasley', 'Hermione Granger', 'Albus Dumbledore'],
        chapters: [
            {
                title: 'Chapter 1: The Boy Who Lived',
                html: `<p class="dropcap-para"><span class="dropcap">M</span>r. and Mrs. Dursley, of number four, Privet Drive, were proud to say that they were perfectly normal, thank you very much.</p><p>They were the last people you'd expect to be involved in anything strange or mysterious, because they just didn't hold with such nonsense. But late one night, a giant flying motorcycle landed on their street, delivering a baby with a lightning-bolt scar on his forehead.</p>`
            },
            {
                title: 'Chapter 2: The Vanishing Glass',
                html: `<p class="dropcap-para"><span class="dropcap">N</span>early ten years had passed since the Dursleys had woken up to find their nephew on the front step, but Privet Drive had hardly changed at all.</p><p>Harry was forced to sleep in the cupboard under the stairs. But strange things always seemed to happen around him. Like the time at the zoo, when the glass on the boa constrictor's tank suddenly vanished, and the snake slithered out, whispering, 'Brazil, here I come.'</p>`
            }
        ]
    },
    'davincicode': {
        title: 'The Da Vinci Code',
        author: 'Dan Brown',
        genre: 'Thriller',
        setting: 'The Louvre, Paris',
        mainCharacters: ['Robert Langdon', 'Sophie Neveu', 'Jacques Saunière', 'Silas'],
        chapters: [
            {
                title: 'Chapter 1: The Louvre',
                html: `<p class="dropcap-para"><span class="dropcap">R</span>enowned curator Jacques Saunière staggered through the vaulted archway of the museum's Grand Gallery. He lunged for the nearest painting he could see, a Caravaggio.</p><p>Grabbing the gilded frame, the seventy-six-year-old man heaved his masterpiece toward himself until it tore from the wall. As he collapsed, a thundering iron gate fell nearby, barricading the entrance to the suite. He knew his assassin was on the other side.</p>`
            },
            {
                title: 'Chapter 2: Robert Langdon',
                html: `<p class="dropcap-para"><span class="dropcap">R</span>obert Langdon awoke with a start. The phone beside his bed in the Hotel Ritz was ringing. It was the French police.</p><p>The curator of the Louvre had been murdered, and Langdon was the last person scheduled to meet him. When Langdon arrived at the scene, he found Saunière's body arranged in the exact position of Leonardo da Vinci's Vitruvian Man, with a cryptic message written in blood.</p>`
            }
        ]
    },
    'hobbit': {
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        genre: 'Fantasy',
        setting: 'Middle-earth',
        mainCharacters: ['Bilbo Baggins', 'Gandalf', 'Thorin Oakenshield', 'Gollum'],
        chapters: [
            {
                title: 'Chapter 1: An Unexpected Party',
                html: `<p class="dropcap-para"><span class="dropcap">I</span>n a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat: it was a hobbit-hole, and that means comfort.</p><p>Bilbo Baggins was a very respectable hobbit. But his peaceful life was turned upside down the day Gandalf the wizard arrived, followed closely by thirteen dwarves, who proceeded to eat everything in his pantry and sing songs of dark mountains and stolen gold.</p>`
            }
        ]
    }
};

let code = fs.readFileSync('aiKnowledgeResolver.js', 'utf8');
const index = code.indexOf('};\n\nfunction resolveAIBookKnowledge');
if (index !== -1) {
    let newStr = '';
    for (const [key, val] of Object.entries(moreBooks)) {
        newStr += `,\n    '${key}': ` + JSON.stringify(val, null, 4);
    }
    code = code.substring(0, index) + newStr + code.substring(index);
    fs.writeFileSync('aiKnowledgeResolver.js', code);
    console.log('Success');
}
