const axios = require('axios');

const booksToTest = [
    'The Silent Patient',
    'Harry Potter',
    'The Da Vinci Code',
    'The Hobbit',
    'Dune',
    '1984',
    'Fahrenheit 451',
    'The Great Gatsby',
    'To Kill a Mockingbird',
    'The Catcher in the Rye',
    'The Fellowship of the Ring',
    'Pride and Prejudice',
    'The Alchemist',
    'Daisy Jones'
];

async function runTests() {
    console.log('--- STARTING HIGH-SPEED PAID BOOK TESTS ---\n');
    let passed = 0;
    
    for (const book of booksToTest) {
        try {
            console.log(`Testing: ${book}...`);
            const res = await axios.get(`http://localhost:3000/api/books/search?q=${encodeURIComponent(book)}`);
            
            if (res.data && res.data.length > 0) {
                const bookId = res.data[0].id || res.data[0].title;
                const chapRes = await axios.get(`http://localhost:3000/api/books/${encodeURIComponent(bookId)}/chapters`);
                
                if (chapRes.data && chapRes.data.chapters && chapRes.data.chapters.length > 0) {
                    console.log(`[PASS] Pulled ${chapRes.data.chapters.length} chapters for "${book}"`);
                    passed++;
                } else {
                    console.log(`[FAIL] No chapters found for "${book}"`);
                }
            } else {
                console.log(`[FAIL] Could not find book in search for "${book}"`);
            }
        } catch (e) {
            console.log(`[ERROR] Test failed for "${book}": ${e.message}`);
        }
    }
    
    console.log(`\n--- TESTS COMPLETE: ${passed}/${booksToTest.length} PASSED ---`);
}

runTests();
