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
  const seriesUrl = 'https://divascans.org/series/comic/wicked-obedience';
  const res = await fetchUrl(seriesUrl);

  // Search for any chapter lists or chapter objects inside the page payload
  const body = res.body;
  
  // Find all occurrences of "chapter" or "chapters" in JSON or scripts
  const chMatches = body.match(/"(?:chapterNumber|number|chapter_number|chapterSlug|index|title|id)":\s*(?:"[^"]+"|\d+)/g) || [];
  console.log('JSON Chapter fields count:', chMatches.length);
  console.log('Sample JSON Chapter fields:', chMatches.slice(0, 30));

  // Also look for seriesId or internal API query paths
  const apiMatches = body.match(/\/api\/[a-zA-Z0-9_\-\/]+/g) || [];
  console.log('API routes mentioned in page:', [...new Set(apiMatches)]);

  // Check for trpc or graphql or rest query endpoints
  const queryMatches = body.match(/"queryKey":\[[\s\S]*?\]/g) || [];
  console.log('React Query Keys:', queryMatches.slice(0, 10));
}

run().catch(console.error);
