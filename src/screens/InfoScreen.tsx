import { useEffect, useRef, useState } from 'react';
import { markBackupDone, mergeSessions, replaceAllData, setSetting, type PersistState } from '../db/db';
import type { Session, SetLog, Settings } from '../db/models';
import { backupFileName, buildBackup, detectFormat, parseBackup } from '../logic/backup';
import { convertPrototype } from '../logic/importPrototype';
import { fmtDate } from '../logic/format';
import { PUSHUP_LEVELS } from '../program/program';
import { wakeLockSupported } from '../hooks/useWakeLock';

interface Props {
  sessions: Session[];
  logs: SetLog[];
  settings: Settings;
  persist: PersistState | null;
  toast: (msg: string) => void;
}

const PERSIST_TEXT: Record<PersistState, string> = {
  granted: '✅ Archiviazione persistente concessa: il browser non cancellerà i dati da solo.',
  denied:
    '⚠️ Archiviazione persistente NON concessa. Di solito viene concessa dopo aver installato l’app sulla schermata Home. Nel frattempo fai backup frequenti.',
  unsupported:
    '⚠️ Archiviazione persistente non disponibile qui (normale durante i test in Wi-Fi via http). Sull’app installata verrà richiesta di nuovo.',
};

export function InfoScreen({ sessions, logs, settings, persist, toast }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<string>('');
  const [autoRest, setAutoRest] = useState(settings.autoRest);
  useEffect(() => setAutoRest(settings.autoRest), [settings.autoRest]);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null) setUsage(`${(e.usage / 1024).toFixed(0)} KB usati`);
    });
  }, [sessions.length]);

  const onExport = async () => {
    const data = buildBackup(sessions, logs, settings);
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    await markBackupDone();
    toast('Backup esportato (cartella Download)');
  };

  const onFile = async (file: File) => {
    try {
      const obj = JSON.parse(await file.text());
      const fmt = detectFormat(obj);
      if (fmt === 'teachergym') {
        const data = parseBackup(obj);
        if (!confirm(`Il backup contiene ${data.sessions.length} sedute. SOSTITUISCE tutti i dati attuali (${sessions.length} sedute). Continuo?`)) return;
        await replaceAllData(data.sessions, data.setLogs, data.settings);
        toast(`Backup importato: ${data.sessions.length} sedute`);
      } else if (fmt === 'prototype') {
        const res = convertPrototype(obj);
        if (!confirm(`Backup del prototipo: ${res.sessions.length} sedute. Le aggiungo allo storico (quelle già importate vengono saltate)?`)) return;
        const added = await mergeSessions(res.sessions, res.setLogs);
        alert([`Importate ${added} sedute dal prototipo.`, ...res.warnings].join('\n'));
      } else {
        alert('File non riconosciuto: non è un backup di TeacherGym né del prototipo.');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'File non valido.');
    }
  };

  return (
    <>
      <h2>Impostazioni</h2>
      <label className="toggle">
        <input
          type="checkbox"
          checked={autoRest}
          onChange={(e) => {
            setAutoRest(e.target.checked);
            void setSetting('autoRest', e.target.checked);
          }}
        />
        Recupero automatico (parte quando confermi una serie con ✓)
      </label>
      <div className="box wakelock-info">
        {wakeLockSupported()
          ? 'Schermo sempre acceso: supportato (attivo durante l’allenamento).'
          : 'Schermo sempre acceso: non supportato.'}
      </div>

      <h2>Dati e backup</h2>
      <div className="box">
        <b>Archiviazione</b>
        {persist ? PERSIST_TEXT[persist] : 'Verifica in corso…'}
        <div className="muted small">
          {sessions.length} sedute, {logs.length} serie salvate{usage && ` · ${usage}`}
        </div>
      </div>
      <div className="warnbox">
        <b>Attenzione:</b> i dati esistono <b>solo su questo telefono</b>. Disinstallare l’app o cancellare i dati del sito
        da Chrome <b>cancella tutto lo storico</b>. Il backup è l’unica copia di sicurezza: tienine una copia anche fuori dal
        telefono (es. inviala a te stesso o su Drive).
      </div>
      <div className="warnbox" data-testid="address-note">
        I dati sono legati all'indirizzo dell'app. Prima di passare dalla versione di prova a quella pubblicata, esporta il
        backup e importalo nella nuova.
      </div>
      <div className="box">
        <b>Backup</b>
        Ultimo backup: {settings.lastBackupAt ? fmtDate(settings.lastBackupAt) : 'mai'}
        {settings.sessionsSinceBackup > 0 && ` · ${settings.sessionsSinceBackup} sedute da allora`}
        <div className="row2">
          <button className="ghost" onClick={onExport}>
            Esporta backup
          </button>
          <button className="ghost" onClick={() => fileRef.current?.click()}>
            Importa backup
          </button>
        </div>
        <div className="muted small">L’import riconosce sia i backup di TeacherGym sia quelli del prototipo “Scheda casa”.</div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void onFile(f);
          }}
        />
      </div>

      <h2>Settimana tipo</h2>
      <table>
        <tbody>
          <tr><th>Giorno</th><th>Attività</th></tr>
          <tr><td>Lun</td><td>Seduta A — full body</td></tr>
          <tr><td>Mar</td><td>Camminata veloce 30-40 min</td></tr>
          <tr><td>Mer</td><td>Seduta C — braccia, spalle, femorali + circuito</td></tr>
          <tr><td>Gio</td><td>Riposo (passi quotidiani)</td></tr>
          <tr><td>Ven</td><td>Seduta B — full body</td></tr>
          <tr><td>Sab</td><td>Camminata veloce 30-40 min</td></tr>
          <tr><td>Dom</td><td>Riposo</td></tr>
        </tbody>
      </table>
      <div className="box">
        <b>Ogni giorno</b>7.000-9.000 passi. Camminate in zona 2: riesci a parlare, non a cantare. Tra A e B almeno 48 ore.
      </div>
      <div className="box">
        <b>Regole</b>
        <ul>
          <li><strong>RIR 2</strong> (Reps In Reserve): chiudi la serie quando ne avresti ancora 2.</li>
          <li><strong>Settimane 1-2</strong>: 2 serie, RIR 3 (interruttore in cima a ogni seduta).</li>
          <li><strong>Doppia progressione</strong>: quando arrivi al massimo del range su tutte le serie, aumenta il carico o passa alla variante più difficile.</li>
          <li><strong>Esercizi a un arto</strong>: parti dal sinistro, stesse reps col destro.</li>
          <li><strong>Superset</strong> (stessa lettera, es. 2a/2b): esercizi di seguito, recupero solo dopo la coppia.</li>
          <li><strong>Gambe senza carico extra</strong> (quando 14 kg diventa leggero): discesa in 4-5 s, pausa 2 s in basso, 1,5 reps.</li>
          <li><strong>Dolore articolare</strong> (non fatica muscolare): fermati e cambia esercizio.</li>
        </ul>
      </div>
      <div className="box">
        <b>Push-up: scala degli appoggi</b>
        {Object.entries(PUSHUP_LEVELS).map(([k, v]) => `${k} ${v}`).join(' → ')}. Passi al livello successivo quando fai 3 × 12 a RIR 2.
      </div>
    </>
  );
}
