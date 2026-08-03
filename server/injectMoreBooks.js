const fs = require('fs');

const moreBooks = {
    'dune': {
        title: 'Dune', author: 'Frank Herbert', genre: 'Sci-Fi', setting: 'Arrakis', mainCharacters: ['Paul Atreides'],
        chapters: [{ title: 'Chapter 1', html: '<p>A beginning is the time for taking the most delicate care that the balances are correct.</p>' }]
    },
    '1984': {
        title: '1984', author: 'George Orwell', genre: 'Dystopian', setting: 'Airstrip One', mainCharacters: ['Winston Smith'],
        chapters: [{ title: 'Chapter 1', html: '<p>It was a bright cold day in April, and the clocks were striking thirteen.</p>' }]
    },
    'farenheit451': {
        title: 'Fahrenheit 451', author: 'Ray Bradbury', genre: 'Dystopian', setting: 'America', mainCharacters: ['Guy Montag'],
        chapters: [{ title: 'Chapter 1', html: '<p>It was a pleasure to burn.</p>' }]
    },
    'greatgatsby': {
        title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', setting: 'New York', mainCharacters: ['Jay Gatsby'],
        chapters: [{ title: 'Chapter 1', html: '<p>In my younger and more vulnerable years my father gave me some advice.</p>' }]
    },
    'mockingbird': {
        title: 'To Kill a Mockingbird', author: 'Harper Lee', genre: 'Classic', setting: 'Maycomb', mainCharacters: ['Scout Finch'],
        chapters: [{ title: 'Chapter 1', html: '<p>When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow.</p>' }]
    },
    'catcher': {
        title: 'The Catcher in the Rye', author: 'J.D. Salinger', genre: 'Classic', setting: 'New York', mainCharacters: ['Holden Caulfield'],
        chapters: [{ title: 'Chapter 1', html: '<p>If you really want to hear about it, the first thing you\'ll probably want to know is where I was born.</p>' }]
    },
    'lordoftherings': {
        title: 'The Fellowship of the Ring', author: 'J.R.R. Tolkien', genre: 'Fantasy', setting: 'Middle-earth', mainCharacters: ['Frodo'],
        chapters: [{ title: 'Chapter 1', html: '<p>When Mr. Bilbo Baggins of Bag End announced that he would shortly be celebrating his eleventy-first birthday...</p>' }]
    },
    'prideandprejudice': {
        title: 'Pride and Prejudice', author: 'Jane Austen', genre: 'Romance', setting: 'England', mainCharacters: ['Elizabeth Bennet'],
        chapters: [{ title: 'Chapter 1', html: '<p>It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p>' }]
    },
    'alchemist': {
        title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', setting: 'Spain', mainCharacters: ['Santiago'],
        chapters: [{ title: 'Chapter 1', html: '<p>The boy\'s name was Santiago. Dusk was falling as the boy arrived with his herd at an abandoned church.</p>' }]
    },
    'daisyjones': {
        title: 'Daisy Jones & The Six', author: 'Taylor Jenkins Reid', genre: 'Fiction', setting: 'Los Angeles', mainCharacters: ['Daisy Jones'],
        chapters: [{ title: 'Chapter 1', html: '<p>I had absolutely no interest in being somebody else\'s muse.</p>' }]
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
    console.log('Injected 10 more books successfully.');
}
