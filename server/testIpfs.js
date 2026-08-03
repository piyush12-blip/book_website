const axios = require('axios');

async function testLibgenIpfsResolver(title, author) {
    console.log('TESTING LIBGEN/ANNA AUTOMATED IPFS RESOLVER FOR:', title, author);
    try {
        // Query LibGen JSON API
        const searchUrl = `https://libgen.is/search.php?req=${encodeURIComponent(title + ' ' + author)}&open=0&res=25&view=simple&phrase=1&column=def`;
        const res = await axios.get(searchUrl, { timeout: 8000 });
        const html = res.data;
        
        // Match md5 hash from HTML
        const md5Matches = html.match(/[a-fA-F0-9]{32}/g) || [];
        console.log('Found MD5 Hashes:', md5Matches.slice(0, 5));

        if (md5Matches.length > 0) {
            const md5 = md5Matches[0];
            console.log('Testing LibGen Gateway URL for MD5:', md5);
            const downloadPageUrl = `http://library.lol/main/${md5}`;
            console.log('Download Page:', downloadPageUrl);
        }
    } catch(e) {
        console.error('LibGen Resolver Error:', e.message);
    }
}

testLibgenIpfsResolver('It Ends with Us', 'Colleen Hoover');
