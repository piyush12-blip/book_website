const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://divascans.org/'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  const url = 'https://divascans.org/series/comic/salvation-of-spring/chapter/1';
  console.log('Fetching chapter 1 payload from:', url);
  const res = await fetchUrl(url);
  
  // Find all image URLs inside the raw HTML / scripts
  const rawBody = res.body;
  
  // Look for image extensions (webp, jpg, png, etc.) or storage URLs
  const imgPattern = /https?:\/\/[^\s"'<>\\]+?\.(?:webp|jpg|jpeg|png|avif)[^\s"'<>\\]*/gi;
  const matches = rawBody.match(imgPattern) || [];
  console.log('Raw Image Regex Matches Count:', matches.length);
  console.log('Sample Image URLs found:');
  const cleanMatches = [...new Set(matches.map(m => m.replace(/\\u0026/g, '&').replace(/\\/g, '')))];
  console.log(cleanMatches.slice(0, 15));

  // Also look for relative upload paths like /uploads/...
  const uploadPattern = /\/uploads\/[^\s"'<>\\]+?\.(?:webp|jpg|jpeg|png|avif)/gi;
  const uploadMatches = rawBody.match(uploadPattern) || [];
  console.log('\nRelative Upload URLs Count:', uploadMatches.length);
  const cleanUploads = [...new Set(uploadMatches)];
  console.log(cleanUploads.slice(0, 15));

  // Let's test pulling one of the clean chapter images directly
  const chapterImages = cleanMatches.filter(u => u.includes('/chapter') || u.includes('/manga') || u.includes('/uploads') || u.includes('/comics') || u.includes('/series') || u.includes('cdn'));
  
  let targetTestImg = chapterImages.length ? chapterImages[0] : (cleanUploads.length ? 'https://divascans.org' + cleanUploads[0] : cleanMatches[0]);
  
  if (targetTestImg) {
    console.log('\n--- TESTING DOWNLOAD OF MANGA PAGE IMAGE ---');
    console.log('Target Image:', targetTestImg);
    const imgFetch = await fetchUrl(targetTestImg);
    console.log('Image Status:', imgFetch.status);
    console.log('Image Headers:', imgFetch.headers);
    console.log('Downloaded Byte Size:', imgFetch.body.length);
  }
}

run().catch(console.error);
