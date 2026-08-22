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
  
  // Find all _next/static/chunks script tags
  const chunkRegex = /\/_next\/static\/chunks\/[a-zA-Z0-9_\-.]+\.js/g;
  const chunkUrls = [...new Set(seriesPage.body.match(chunkRegex) || [])];
  console.log(`Found ${chunkUrls.length} JS chunk files.`);

  // Inspect the chunks to find chapter API endpoint
  for (const chunkPath of chunkUrls.slice(0, 10)) {
    const chunkUrl = `https://divascans.org${chunkPath}`;
    const chunkRes = await fetchUrl(chunkUrl);
    if (chunkRes.body.includes('/api/') || chunkRes.body.includes('chapter')) {
      const endpoints = chunkRes.body.match(/["']\/api\/[^"']+["']/g) || [];
      if (endpoints.length) {
        console.log(`Chunk: ${chunkPath} -> API Endpoints:`, [...new Set(endpoints)]);
      }
    }
  }
}

run().catch(console.error);
