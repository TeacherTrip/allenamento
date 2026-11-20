// Prova di aggiornamento reale (passo 10 della Fase 4-bis). Solo a mano: npm run prova-aggiornamento
// Simula il telefono con l'app già installata: stessa porta e stesso indirizzo di base per le due versioni.
// 1. costruisce la versione PUBBLICATA (commit VECCHIA, sotto) e quella del ramo attuale (cartella di lavoro);
// 2. lancia e2e-aggiornamento/ con playwright.aggiornamento.config.ts: il server della prova serve prima la
//    vecchia, poi la nuova allo stesso indirizzo; l'app si aggiorna col pulsante «Aggiorna» come sul telefono.
// Tutto (sorgenti della vecchia versione, build, risultati) va nella cartella temporanea di sistema
// (teachergym-aggiornamento): niente nel progetto né in Git. Esclusa da CI, npm test e npx playwright test.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const VECCHIA = process.env.AGG_VECCHIA_COMMIT ?? 'd66419b'; // versione pubblicata prima della Fase 4-bis
const ROOT = process.cwd();
const TMP = path.join(os.tmpdir(), 'teachergym-aggiornamento');
const SRC_OLD = path.join(TMP, 'sorgenti-vecchia');
const DIST_OLD = path.join(TMP, 'dist-vecchia');
const DIST_NEW = path.join(TMP, 'dist-nuova');
const VITE = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

const run = (cmd, args, cwd = ROOT) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`Comando fallito: ${cmd} ${args.join(' ')}`);
    process.exit(1);
  }
};
const out = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();

if (out('git', ['status', '--porcelain'])) console.warn('Attenzione: ci sono modifiche non salvate in Git: la versione nuova le comprende.');
console.log(`Versione vecchia: ${VECCHIA}  ·  versione nuova: ${out('git', ['rev-parse', '--short', 'HEAD'])} (${out('git', ['branch', '--show-current'])})`);

rmSync(TMP, { recursive: true, force: true });
mkdirSync(SRC_OLD, { recursive: true });

console.log('Estraggo i sorgenti della versione vecchia…');
run('git', ['archive', '--format=tar', '-o', path.join(TMP, 'vecchia.tar'), VECCHIA]);
run('tar', ['-xf', '../vecchia.tar'], SRC_OLD);
// stesse dipendenze (package-lock.json invariato dal commit vecchio): collegamento, nessuna installazione
symlinkSync(path.join(ROOT, 'node_modules'), path.join(SRC_OLD, 'node_modules'), 'junction');

console.log('Costruisco la versione vecchia…');
run(process.execPath, [VITE, 'build', '--outDir', DIST_OLD, '--emptyOutDir', '--logLevel', 'warn'], SRC_OLD);
console.log('Costruisco la versione nuova…');
run(process.execPath, [VITE, 'build', '--outDir', DIST_NEW, '--emptyOutDir', '--logLevel', 'warn']);
for (const d of [DIST_OLD, DIST_NEW]) if (!existsSync(path.join(d, 'sw.js'))) throw new Error(`manca sw.js in ${d}`);

const r = spawnSync('npx', ['playwright', 'test', '-c', 'playwright.aggiornamento.config.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, AGG_DIST_OLD: DIST_OLD, AGG_DIST_NEW: DIST_NEW },
});
process.exit(r.status ?? 1);
