// Genera le icone dell'app (manubrio + "TG") a partire da un unico disegno SVG.
// Uso: npm run icone   → public/favicon.svg e public/icone/*.png (file versionati).
// Il contenuto sta dentro il cerchio centrale dell'80%: così l'icona "maskable"
// (che Android ritaglia a cerchio, goccia, quadrato…) non perde pezzi.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BG = '#111214';
const AC = '#5ad08a';

const disegno = `
  <rect x="150" y="168" width="212" height="20" rx="6" fill="${AC}"/>
  <rect x="150" y="118" width="34" height="120" rx="8" fill="${AC}"/>
  <rect x="118" y="138" width="26" height="80" rx="7" fill="${AC}"/>
  <rect x="328" y="118" width="34" height="120" rx="8" fill="${AC}"/>
  <rect x="368" y="138" width="26" height="80" rx="7" fill="${AC}"/>
  <text x="256" y="382" text-anchor="middle" font-family="Arial, Helvetica, sans-serif"
        font-weight="700" font-size="172" letter-spacing="4" fill="#ecedef">TG</text>`;

// angoli arrotondati per favicon e icona normale; quadrato pieno per la maskable
const svg = (rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
  `<rect width="512" height="512" rx="${rx}" fill="${BG}"/>${disegno}</svg>\n`;

await mkdir('public/icone', { recursive: true });
await writeFile('public/favicon.svg', svg(96));

const png = (s, size, file) => sharp(Buffer.from(s)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
await png(svg(96), 192, 'public/icone/icona-192.png');
await png(svg(96), 512, 'public/icone/icona-512.png');
await png(svg(0), 512, 'public/icone/icona-maskable-512.png');
await png(svg(0), 180, 'public/icone/apple-touch-icon.png'); // iPhone: arrotonda da solo
console.log('Icone create in public/favicon.svg e public/icone/');
