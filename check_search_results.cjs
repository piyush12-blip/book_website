(async () => {
    const r1 = await fetch('http://localhost:3000/api/books/search?q=Alice%20in%20Wonderland');
    const d1 = await r1.json();
    console.log('Search "Alice in Wonderland" Result:');
    console.table(d1.map(x => ({ id: x.id, title: x.title, genre: x.genre, author: x.author })));

    const r2 = await fetch('http://localhost:3000/api/books/search?q=Alice%20in%20Borderland');
    const d2 = await r2.json();
    console.log('\nSearch "Alice in Borderland" Result:');
    console.table(d2.map(x => ({ id: x.id, title: x.title, genre: x.genre, author: x.author })));

    // Fetch chapters for Alice in Wonderland
    if (d1.length > 0) {
        const ch1 = await fetch(`http://localhost:3000/api/books/${encodeURIComponent(d1[0].id)}/chapters?q=Alice%20in%20Wonderland`);
        const cd1 = await ch1.json();
        console.log('\nChapters for Alice in Wonderland:', cd1.source, 'Total:', cd1.chapters?.length);
        console.log('Sample Chapter 1 Title:', cd1.chapters?.[0]?.title);
    }

    // Fetch chapters for Alice in Borderland
    if (d2.length > 0) {
        const ch2 = await fetch(`http://localhost:3000/api/books/${encodeURIComponent(d2[0].id)}/chapters?q=Alice%20in%20Borderland`);
        const cd2 = await ch2.json();
        console.log('\nChapters for Alice in Borderland:', cd2.source, 'Total:', cd2.chapters?.length);
        console.log('Chapter 1 Title:', cd2.chapters?.[0]?.title);
        console.log('Chapter 1 ID:', cd2.chapters?.[0]?.chapterId);
        console.log('Last Chapter Title:', cd2.chapters?.[cd2.chapters.length - 1]?.title);
    }
})().catch(e => console.error(e));
