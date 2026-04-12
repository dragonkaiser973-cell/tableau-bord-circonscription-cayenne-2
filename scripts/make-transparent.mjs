import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, '..', 'public', 'Gemini_Generated_Image_3sbord3sbord3sbo (1).png');
const outputPath = path.join(__dirname, '..', 'public', 'tree-transparent.png');

const LO = 4;   // pixels with max(R,G,B) <= LO become fully transparent
const HI = 8;   // pixels between LO and HI get gradual transparency (very tight = minimal halo)

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const output = Buffer.from(data);

for (let i = 0; i < output.length; i += channels) {
  const r = output[i];
  const g = output[i + 1];
  const b = output[i + 2];
  const max = Math.max(r, g, b);

  if (max <= LO) {
    output[i + 3] = 0;
  } else if (max <= HI) {
    output[i + 3] = Math.round(((max - LO) / (HI - LO)) * 255);
  }
  // else keep original alpha (255)
}

await sharp(output, { raw: { width, height, channels } })
  .png()
  .toFile(outputPath);

console.log(`Done! Saved to ${outputPath}`);
console.log(`Dimensions: ${width}x${height}`);
