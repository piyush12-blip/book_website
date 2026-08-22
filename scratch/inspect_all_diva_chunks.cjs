const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://divascans.org/'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  const seriesPage = await fetchUrl('https://divascans.org/series/comic/the-forbidden-child');
  const chunkRegex = /\/_next\/static\/chunks\/[a-zA-Z0-9_\-.]+\.js/g;
  const chunkUrls = [...new Set(seriesPage.body.match(chunkRegex) || [])];
  
  const allEndpoints = new Set();
  for (const chunkPath of chunkUrls) {
    const chunkUrl = `https://divascans.org${chunkPath}`;
    const chunkRes = await fetchUrl(chunkUrl);
    const matches = chunkRes.body.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
    matches.forEach(m => allEndpoints.add(m));
  }
  console.log('All API Routes found in Next.js Chunks:');
  console.log(Array.from(allEndpoints));
}

run().catch(console.error);
