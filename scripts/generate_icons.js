const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgCode = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="#0057B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v20"/>
    <path d="M2 12h20"/>
    <path d="m4.9 4.9 14.2 14.2"/>
    <path d="m4.9 19.1 14.2-14.2"/>
    <polygon points="12 6 16.2 7.8 18 12 16.2 16.2 12 18 7.8 16.2 6 12 7.8 7.8"/>
    <polygon points="12 9 14.1 9.9 15 12 14.1 14.1 12 15 9.9 14.1 9 12 9.9 9.9"/>
</svg>`;

const outputDir = path.join(__dirname, '..', 'extension', 'icons');
const sizes = [16, 32, 48, 128];

async function generateIcons() {
    for (const size of sizes) {
        await sharp(Buffer.from(svgCode))
            .resize(size, size)
            .png()
            .toFile(path.join(outputDir, `${size}.png`));
        console.log(`Generated ${size}.png`);
    }
}

generateIcons().catch(console.error);
