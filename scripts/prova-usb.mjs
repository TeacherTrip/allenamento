// Prove sul telefono vero via USB. Solo a mano: npm run prova-usb  (dettagli in cima a playwright.usb.config.ts)
// - adb dal PATH oppure dalla variabile d'ambiente ADB (nessun percorso personale nei file);
// - serve la versione costruita su http://localhost:5173 (solo 127.0.0.1: non raggiungibile dalla rete Wi-Fi);
// - per la prova offline (ultima) ferma DAVVERO il server quando la prova lo chiede (file «pronto-offline»)
//   e glielo conferma (file «server-fermo»): togliere solo l'inoltro non basta, un collegamento aperto resta in piedi;
// - alla fine toglie gli inoltri USB e ferma il server, anche in caso di errore.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const ADB = process.env.ADB ?? 'adb';
const PORT = 5173;
const URL = `http://127.0.0.1:${PORT}/allenamento/`;
const SHOTS = path.join(os.tmpdir(), 'teachergym-usb');
const READY = path.join(SHOTS, 'pronto-offline');
const STOPPED = path.join(SHOTS, 'server-fermo');

const adb = (...args) => execFileSync(ADB, args, { encoding: 'utf8' });
const up = async () => {
  try {
    return (await fetch(URL, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (await up()) {
  console.error(`La porta ${PORT} è già occupata: ferma prima l'altro server (es. npm run dev).`);
  process.exit(1);
}
try {
  if (!adb('devices').split('\n').slice(1).some((l) => /\tdevice\b/.test(l))) throw new Error('nessun telefono autorizzato');
} catch (e) {
  console.error(`adb non trovato o telefono non collegato (${e.message}). Imposta ADB col percorso di adb se non è nel PATH.`);
  process.exit(1);
}

mkdirSync(SHOTS, { recursive: true });
for (const f of [READY, STOPPED, path.join(SHOTS, 'misure.json')]) rmSync(f, { force: true });

console.log('Costruisco la versione da provare…');
if (spawnSync('npx', ['vite', 'build', '--logLevel', 'warn'], { stdio: 'inherit', shell: true }).status !== 0) process.exit(1);

// node diretto (non npx): un solo processo, che si ferma davvero
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  stdio: 'ignore',
});
const stopServer = async () => {
  if (server.exitCode == null) server.kill();
  for (let i = 0; i < 20 && (await up()); i++) await sleep(250);
};

let status = 1;
try {
  for (let i = 0; i < 60 && !(await up()); i++) await sleep(500);
  if (!(await up())) throw new Error('il server non è partito');
  adb('forward', 'tcp:9222', 'localabstract:chrome_devtools_remote');
  adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);
  // Chrome deve essere aperto perché il canale di debug esista: lo si apre su localhost (mai su altri indirizzi)
  adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `http://localhost:${PORT}/allenamento/favicon.svg`, 'com.android.chrome');
  const debugUp = async () => {
    try {
      return (await fetch('http://127.0.0.1:9222/json/version', { signal: AbortSignal.timeout(2000) })).ok;
    } catch {
      return false;
    }
  };
  for (let i = 0; i < 40 && !(await debugUp()); i++) await sleep(500);
  if (!(await debugUp())) throw new Error('Chrome sul telefono non risponde: sblocca il telefono e riprova');

  const tests = spawn('npx', ['playwright', 'test', '-c', 'playwright.usb.config.ts'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ADB },
  });
  const watch = setInterval(async () => {
    if (!existsSync(READY) || existsSync(STOPPED)) return;
    await stopServer();
    if (await up()) return console.error('Il server risponde ancora: la prova offline non è valida.');
    writeFileSync(STOPPED, '');
  }, 500);
  status = await new Promise((r) => tests.on('exit', (code) => r(code ?? 1)));
  clearInterval(watch);
} catch (e) {
  console.error(String(e.message ?? e));
} finally {
  await stopServer();
  for (const args of [['reverse', '--remove', `tcp:${PORT}`], ['forward', '--remove', 'tcp:9222']]) {
    try {
      adb(...args);
    } catch {
      /* già tolto */
    }
  }
  for (const f of [READY, STOPPED]) rmSync(f, { force: true });
  console.log(`Schermate e misure: ${SHOTS}`);
}
process.exit(status);
