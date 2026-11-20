// Prova a secco della migrazione sui dati reali (backup del telefono in dati-locali/). Solo a mano: npm run prova-a-secco
// - lancia SOLO e2e/prova-a-secco.spec.ts, in un profilo del browser temporaneo;
// - stampa solo conteggi e percorsi delle differenze (mai i dati);
// - alla fine cancella test-results/ (in caso di errore Playwright ci salva una copia della pagina, quindi dati reali).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';

const DIR = 'dati-locali';
if (!existsSync(DIR) || !readdirSync(DIR).some((f) => f.toLowerCase().endsWith('.json'))) {
  console.error(`Metti il backup JSON esportato dal telefono in ${DIR}/ (cartella esclusa da Git e bloccata dal pre-commit).`);
  process.exit(1);
}
const res = spawnSync('npx', ['playwright', 'test', 'e2e/prova-a-secco.spec.ts', '--reporter=list', '--workers=1'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PROVA_A_SECCO: '1' },
});
rmSync('test-results', { recursive: true, force: true });
process.exit(res.status ?? 1);
