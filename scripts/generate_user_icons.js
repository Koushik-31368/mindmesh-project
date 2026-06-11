const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = "C:\\Users\\KOUSHIK REEDY\\.gemini\\antigravity-ide\\brain\\dccda023-af58-4258-9619-08107ea81188\\media__1781098802564.png";
const outputDir = path.join(__dirname, '..', 'extension', 'icons');
const sizes = [16, 32, 48, 128];

async function processIcons() {
    for (const size of sizes) {
        await sharp(inputImagePath)
            .trim() // Trims away empty space or uniform background to tightly bound the web
            .resize({
                width: size,
                height: size,
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent padding
            })
            .png()
            .toFile(path.join(outputDir, `${size}.png`));
        console.log(`Generated centered ${size}.png`);
    }
}

processIcons().catch(console.error);
