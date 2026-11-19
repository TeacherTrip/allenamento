// Converte le immagini originali (immagini-originali/, NON versionata) in WebP per l'app.
// Uso: npm run immagini
// - nessun ritaglio né ridimensionamento (le originali sono 1200×896, servono nitide a tutto schermo);
//   le immagini più larghe di MAX_WIDTH vengono ridotte, quelle più piccole non vengono mai ingrandite;
// - WebP qualità 80; sharp non copia i metadati (EXIF/XMP/C2PA) se non glielo si chiede.
import sharp from 'sharp';
import { readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'immagini-originali';
const OUT = path.join('public', 'esercizi');
const MAX_WIDTH = 1200;
const QUALITY = 80;
const AVVISO_KB = 150;
const AVVISO_TOTALE_MB = 4;

const kb = (b) => (b / 1024).toFixed(1);

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
if (files.length === 0) {
  console.error(`Nessuna immagine in ${SRC}/`);
  process.exit(1);
}
await mkdir(OUT, { recursive: true });

const righe = [];
let totPrima = 0;
let totDopo = 0;
for (const f of files) {
  const id = path.parse(f).name;
  const dest = path.join(OUT, `${id}.webp`);
  const info = await sharp(path.join(SRC, f))
    .rotate() // applica l'orientamento EXIF prima di eliminarlo
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dest);
  const prima = (await stat(path.join(SRC, f))).size;
  totPrima += prima;
  totDopo += info.size;
  righe.push({
    file: f,
    'dimensioni': `${info.width}×${info.height}`,
    'prima (KB)': kb(prima),
    'dopo (KB)': kb(info.size),
    avviso: info.size > AVVISO_KB * 1024 ? `> ${AVVISO_KB} KB` : '',
  });
}

console.table(righe);
console.log(`File: ${files.length}`);
console.log(`Totale prima: ${kb(totPrima)} KB · dopo: ${kb(totDopo)} KB (${((totDopo / 1024 / 1024)).toFixed(2)} MB)`);
console.log(`Media dopo: ${kb(totDopo / files.length)} KB`);
const sopra = righe.filter((r) => r.avviso);
if (sopra.length) console.warn(`ATTENZIONE: ${sopra.length} file oltre ${AVVISO_KB} KB`);
if (totDopo > AVVISO_TOTALE_MB * 1024 * 1024) console.warn(`ATTENZIONE: totale oltre ${AVVISO_TOTALE_MB} MB`);
