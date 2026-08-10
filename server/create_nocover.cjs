const fs = require('fs');
const path = require('path');

// 1x1 or transparent / placeholder PNG buffer
// Sleek dark gradient PNG (8-byte PNG header + minimal chunks)
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buf = Buffer.from(pngBase64, 'base64');

const paths = [
    path.join(__dirname, '../public/nocover-new-min.png'),
    path.join(__dirname, '../public/assets/nocover-new-min.png')
];

for (const p of paths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buf);
    console.log(`Created: ${p}`);
}
