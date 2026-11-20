import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CATALOG_BY_ID } from '../src/catalog/exercises';
import { TEMPLATES } from '../src/catalog/templates';
import { WARMUP } from '../src/program/program';
import { CARDIO_EXERCISES } from '../src/program/cardio';

// Fase 4-bis passo 9: ogni immagine usata dal Modello 1 e dal Modello 2 esiste in public/ e si carica nel browser.

const PUBLIC = join(process.cwd(), 'public');

/** Percorsi relativi alla base dell'app (es. "esercizi/gsq.webp"), senza doppioni, con chi li usa. */
function usedImages(): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of TEMPLATES) {
    if (t.image) out.set(t.image, `immagine del ${t.label}`);
    for (const p of t.programs)
      for (const it of p.items) {
        const c = CATALOG_BY_ID[it.exerciseId];
        if (!c) throw new Error(`${t.label}, scheda ${p.name}: esercizio non in catalogo: ${it.exerciseId}`);
        if (!c.image) throw new Error(`${t.label}, scheda ${p.name}: «${c.name}» senza immagine nel catalogo`);
        out.set(`esercizi/${c.image}.webp`, `${c.name} (${it.exerciseId})`);
      }
  }
  for (const w of [...WARMUP, ...CARDIO_EXERCISES]) if (w.image) out.set(`esercizi/${w.image}.webp`, w.name);
  return out;
}

test('IM01 ogni immagine del Modello 1, del Modello 2 e dei modelli ha il suo file in public/', () => {
  const images = usedImages();
  expect(TEMPLATES.map((t) => t.id)).toEqual(['m1', 'm2']);
  expect([...images.keys()].filter((p) => p.startsWith('modelli/'))).toHaveLength(2);
  const missing = [...images].filter(([p]) => !existsSync(join(PUBLIC, p))).map(([p, who]) => `public/${p} — ${who}`);
  expect(missing, `File mancanti:\n${missing.join('\n')}`).toEqual([]);
});

test('IM02 ogni immagine si carica davvero nel browser (larghezza reale > 0)', async ({ page }) => {
  const paths = [...usedImages().keys()];
  await page.goto('./');
  const results = await page.evaluate(
    (paths) =>
      Promise.all(
        paths.map(
          (p) =>
            new Promise<[string, number]>((resolve) => {
              const img = new Image();
              img.onload = () => resolve([p, img.naturalWidth]);
              img.onerror = () => resolve([p, 0]);
              img.src = new URL(p, document.baseURI).href; // base dell'app: /allenamento/
            }),
        ),
      ),
    paths,
  );
  const broken = results.filter(([, w]) => !(w > 0)).map(([p]) => p);
  expect(broken, `Immagini che non si caricano:\n${broken.join('\n')}`).toEqual([]);
  expect(results).toHaveLength(paths.length);
});
