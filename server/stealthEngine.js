/**
 * Stealth Engine & Anti-Fingerprinting Layer
 * Provides zero-footprint HTTP request generation, Client Hints spoofing,
 * dynamic referer laundering, jittered timing, in-memory caching, and DNS cloaking.
 */

const https = require('https');
const http = require('http');
const dns = require('dns');

const resolver = new dns.Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4', '9.9.9.9', '1.0.0.1']);

const DNS_CACHE = new Map();

function customLookup(hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    const isAll = options && options.all;

    if (DNS_CACHE.has(hostname)) {
        const ip = DNS_CACHE.get(hostname);
        if (isAll) return callback(null, [{ address: ip, family: 4 }]);
        return callback(null, ip, 4);
    }

    resolver.resolve4(hostname, (err, addrs) => {
        if (!err && addrs && addrs.length > 0) {
            const ip = String(addrs[0]);
            DNS_CACHE.set(hostname, ip);
            if (isAll) {
                return callback(null, addrs.map(a => ({ address: String(a), family: 4 })));
            }
            return callback(null, ip, 4);
        }
        dns.lookup(hostname, options, (sysErr, address, family) => {
            if (!sysErr && address) {
                const singleIp = Array.isArray(address) ? address[0]?.address : address;
                if (singleIp && typeof singleIp === 'string') {
                    DNS_CACHE.set(hostname, singleIp);
                }
                return callback(null, address, family);
            }
            callback(err || sysErr);
        });
    });
}

const httpsAgent = new https.Agent({ lookup: customLookup, keepAlive: true, maxSockets: 50 });
const httpAgent = new http.Agent({ lookup: customLookup, keepAlive: true, maxSockets: 50 });

// Profile Matrix: Real modern desktop Chrome, Edge, Safari, Firefox fingerprints
const BROWSER_PROFILES = [
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        secChUaMobile: '?0',
        secChUaPlatform: '"Windows"'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
        secChUa: '"Not)A;Brand";v="99", "Microsoft Edge";v="127", "Chromium";v="127"',
        secChUaMobile: '?0',
        secChUaPlatform: '"Windows"'
    },
    {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        secChUaMobile: '?0',
        secChUaPlatform: '"macOS"'
    },
    {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
        secChUa: null,
        secChUaMobile: null,
        secChUaPlatform: null
    }
];

function getRandomProfile() {
    return BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)];
}

function sleepJitter(minMs = 20, maxMs = 80) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(r => setTimeout(r, delay));
}

/**
 * Builds undetectable browser headers matching native browser requests
 */
function buildStealthHeaders(targetUrl, type = 'html', customReferer = null) {
    const u = new URL(targetUrl);
    const profile = getRandomProfile();
    
    // Determine plausible referer & origin laundering
    let referer = customReferer;
    if (!referer) {
        if (u.hostname.includes('mangapill') || u.hostname.includes('readdetectiveconan')) referer = 'https://mangapill.com/';
        else if (u.hostname.includes('wuxiaworld')) referer = 'https://wuxiaworld.eu/';
        else if (u.hostname.includes('royalroad')) referer = 'https://www.royalroad.com/';
        else if (u.hostname.includes('divascans')) referer = 'https://divascans.org/';
        else if (u.hostname.includes('madarascans')) referer = 'https://madarascans.org/';
        else if (u.hostname.includes('templetoons')) referer = 'https://templetoons.com/';
        else if (u.hostname.includes('cmzcdn') || u.hostname.includes('mangabuddy')) referer = 'https://mangabuddy.com/';
        else referer = `${u.protocol}//${u.hostname}/`;
    }

    const headers = {
        'User-Agent': profile.ua,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': referer,
        'Origin': `${u.protocol}//${u.hostname}`,
        'DNT': '1',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive'
    };

    if (type === 'image') {
        headers['Accept'] = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
        headers['Sec-Fetch-Dest'] = 'image';
        headers['Sec-Fetch-Mode'] = 'no-cors';
        headers['Sec-Fetch-Site'] = 'cross-site';
        headers['Priority'] = 'u=1, i';
    } else if (type === 'json' || type === 'api') {
        headers['Accept'] = 'application/json, text/plain, */*';
        headers['Sec-Fetch-Dest'] = 'empty';
        headers['Sec-Fetch-Mode'] = 'cors';
        headers['Sec-Fetch-Site'] = 'same-origin';
        headers['Priority'] = 'u=1, i';
    } else {
        // html navigation
        headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
        headers['Sec-Fetch-Dest'] = 'document';
        headers['Sec-Fetch-Mode'] = 'navigate';
        headers['Sec-Fetch-Site'] = 'none';
        headers['Sec-Fetch-User'] = '?1';
        headers['Upgrade-Insecure-Requests'] = '1';
        headers['Priority'] = 'u=0, i';
    }

    if (profile.secChUa) {
        headers['sec-ch-ua'] = profile.secChUa;
        headers['sec-ch-ua-mobile'] = profile.secChUaMobile;
        headers['sec-ch-ua-platform'] = profile.secChUaPlatform;
    }

    return headers;
}

const zlib = require('zlib');

function decodeStream(res, buffer) {
    const encoding = (res.headers['content-encoding'] || '').toLowerCase();
    if (encoding === 'gzip') {
        try { return zlib.gunzipSync(buffer); } catch (e) { return buffer; }
    } else if (encoding === 'deflate') {
        try { return zlib.inflateSync(buffer); } catch (e) { return buffer; }
    } else if (encoding === 'br') {
        try { return zlib.brotliDecompressSync(buffer); } catch (e) { return buffer; }
    }
    return buffer;
}

/**
 * Undetectable Stealth Fetcher
 */
async function stealthFetch(url, options = {}) {
    await sleepJitter(options.jitterMin || 10, options.jitterMax || 50);

    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const isHttps = u.protocol === 'https:';
        const client = isHttps ? https : http;

        const headers = {
            ...buildStealthHeaders(url, options.type || 'html', options.referer),
            ...(options.headers || {})
        };

        const reqOptions = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers,
            agent: isHttps ? httpsAgent : httpAgent,
            servername: isHttps ? u.hostname : undefined,
            timeout: options.timeout || 10000
        };

        const req = client.request(reqOptions, (res) => {
            if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                let redirect = res.headers.location;
                if (!redirect.startsWith('http')) {
                    redirect = `${u.protocol}//${u.hostname}${redirect}`;
                }
                return stealthFetch(redirect, options).then(resolve).catch(reject);
            }

            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                const rawBuffer = Buffer.concat(chunks);
                const decompressed = decodeStream(res, rawBuffer);
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    buffer: decompressed,
                    text: decompressed.toString('utf8')
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

module.exports = {
    customLookup,
    buildStealthHeaders,
    stealthFetch,
    sleepJitter,
    getRandomProfile
};
