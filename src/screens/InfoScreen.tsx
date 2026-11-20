import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  isStarted,
  markBackupDone,
  mergeSessions,
  reloadTemplate,
  setSeparateSides,
  StartedWorkoutError,
  replaceAllData,
  setPhase1,
  setSetting,
  type PersistState,
} from '../db/db';
import { TEMPLATE_BY_ID } from '../catalog/templates';
import { ModelCards } from '../components/ModelCards';
import type { Program, TemplateId } from '../program/types';
import type { Session, SetLog, Settings } from '../db/models';
import { backupFileName, buildBackup, detectFormat, parseBackup } from '../logic/backup';
import { convertPrototype, protoImportMessage } from '../logic/importPrototype';
import { fmtDate } from '../logic/format';
import { PUSHUP_LEVELS } from '../program/program';
import { wakeLockSupported } from '../hooks/useWakeLock';

interface Props {
  sessions: Session[];
  logs: SetLog[];
  settings: Settings;
  programs: Program[];
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

/** Versione: numero di pubblicazione e commit, scritti da GitHub Actions al momento della build. */
function appVersion(): string {
  const n = import.meta.env.VITE_BUILD_NUMBER;
  const sha = import.meta.env.VITE_COMMIT;
  return n && sha ? `versione ${n} (${sha.slice(0, 7)})` : 'sviluppo locale';
}

const ddmm = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

export function InfoScreen({ sessions, logs, settings, programs, persist, toast }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<string>('');
  const [autoRest, setAutoRest] = useState(settings.autoRest);
  useEffect(() => setAutoRest(settings.autoRest), [settings.autoRest]);
  const [phase1, setPhase1Local] = useState(settings.phase1);
  // «Separa i lati»: valore locale aggiornato subito al tocco (come gli altri interruttori)
  const [sides, setSidesLocal] = useState(settings.separateSides);
  useEffect(() => setSidesLocal(settings.separateSides), [settings.separateSides]);
  useEffect(() => setPhase1Local(settings.phase1), [settings.phase1]);
  // «Ricarica un modello»: elenco aperto e modello scelto (finestra di conferma)
  const [reloadOpen, setReloadOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<TemplateId | null>(null);
  const [reloading, setReloading] = useState(false);
  // allenamento avviato (cronometro o circuito): blocca la ricarica e «Separa i lati»
  const startedDraft = useLiveQuery(async () => (await db.drafts.toArray()).find(isStarted) ?? null, []);
  const startedName = startedDraft ? (programs.find((p) => p.id === startedDraft.day)?.name ?? startedDraft.day) : null;

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      if (e.usage != null) setUsage(`${(e.usage / 1024).toFixed(0)} KB usati`);
    });
  }, [sessions.length]);

  const onExport = async () => {
    const programs = await db.programs.orderBy('order').toArray();
    const data = buildBackup(sessions, logs, settings, programs);
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

  const onReplace = async () => {
    if (!confirmId || reloading) return;
    setReloading(true);
    try {
      await reloadTemplate(confirmId);
      toast(`Schede del ${TEMPLATE_BY_ID[confirmId].label} caricate`);
      setConfirmId(null);
      setReloadOpen(false);
    } catch (e) {
      setConfirmId(null);
      alert(
        e instanceof StartedWorkoutError
          ? e.message
          : `Ricarica non riuscita: le schede non sono cambiate. ${e instanceof Error ? e.message : ''}`.trim(),
      );
    } finally {
      setReloading(false);
    }
  };

  const onFile = async (file: File) => {
    try {
      const obj = JSON.parse(await file.text());
      const fmt = detectFormat(obj);
      if (fmt === 'teachergym') {
        const data = parseBackup(obj);
        if (!confirm(`Il backup contiene ${data.sessions.length} sedute. SOSTITUISCE tutti i dati attuali (${sessions.length} sedute). Continuo?`)) return;
        await replaceAllData(data.sessions, data.setLogs, data.settings, data.programs);
        toast(`Backup importato: ${data.sessions.length} sedute`);
      } else if (fmt === 'prototype') {
        const res = convertPrototype(obj);
        if (!confirm(`Backup del prototipo: ${res.sessions.length} sedute. Le aggiungo allo storico (quelle già importate vengono saltate)?`)) return;
        const addedIds = await mergeSessions(res.sessions, res.setLogs);
        alert(protoImportMessage(res, addedIds));
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
          checked={phase1}
          onChange={(e) => {
            setPhase1Local(e.target.checked);
            void setPhase1(e.target.checked);
          }}
        />
        <span>
          Settimane 1-2: massimo 2 serie, RIR 3
          <span className="muted small block" data-testid="phase1-since">
            {!phase1
              ? 'Disattivate'
              : settings.phase1Since
                ? `Attive dal ${ddmm(settings.phase1Since)}`
                : 'La data parte dalla prima seduta salvata'}
          </span>
        </span>
      </label>
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
      <label className="toggle">
        <input
          type="checkbox"
          checked={sides}
          disabled={!!startedName}
          onChange={(e) => {
            const on = e.target.checked;
            setSidesLocal(on);
            setSeparateSides(on).catch((err: unknown) => {
              setSidesLocal(!on); // rifiutato (allenamento avviato nel frattempo): torna com'era
              alert(err instanceof Error ? err.message : String(err));
            });
          }}
        />
        <span>
          Separa i lati
          <span className="muted small block">
            {sides
              ? 'Esercizi a un arto: un tasto per lato, dal lato di partenza.'
              : 'Esercizi a un arto: un solo ✓ per serie, ripetizioni e kg per lato.'}
          </span>
        </span>
      </label>
      {startedName && (
        <div className="warnbox" data-testid="sides-blocked">
          C’è un allenamento avviato sulla scheda <b>{startedName}</b>: concludilo o annullalo prima di cambiare «Separa i lati».
        </div>
      )}
      {sides && (
        <div className="box" data-testid="start-side">
          <b>Lato di partenza</b>
          <div className="row2 sides" role="group" aria-label="Lato di partenza">
            {(['left', 'right'] as const).map((side) => (
              <button
                key={side}
                className={`ghost${settings.startSide === side ? ' on' : ''}`}
                aria-pressed={settings.startSide === side}
                onClick={() => void setSetting('startSide', side)}
              >
                {side === 'left' ? 'Sinistro' : 'Destro'}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="box wakelock-info">
        {wakeLockSupported()
          ? 'Schermo sempre acceso: supportato (attivo durante l’allenamento).'
          : 'Schermo sempre acceso: non supportato.'}
      </div>

      <h2>Schede</h2>
      <div className="box">
        <b>Schede attuali</b>
        {programs.map((p) => p.name).join(', ') || 'nessuna'}
        {settings.templateId && TEMPLATE_BY_ID[settings.templateId] && ` (dal ${TEMPLATE_BY_ID[settings.templateId].label})`}
        <button className="ghost" onClick={() => setReloadOpen((o) => !o)} aria-expanded={reloadOpen}>
          Ricarica un modello
        </button>
      </div>
      {reloadOpen &&
        (startedName ? (
          <div className="warnbox" data-testid="reload-blocked">
            C’è un allenamento avviato sulla scheda <b>{startedName}</b>: concludilo o annullalo prima di ricaricare un modello.
          </div>
        ) : (
          <div data-testid="reload-models">
            <p className="sub">Tocca un modello. Le schede attuali verranno sostituite; lo storico resta.</p>
            <ModelCards onChoose={(id) => setConfirmId(id)} />
          </div>
        ))}
      {confirmId && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="reload-title">
          <div className="dialog">
            <h2 id="reload-title">Ricaricare il {TEMPLATE_BY_ID[confirmId].label}?</h2>
            <p>Le schede attuali verranno sostituite. Lo storico resta.</p>
            <button className="ghost" onClick={() => void onExport()}>
              Scarica backup
            </button>
            <button className="primary" onClick={() => void onReplace()} disabled={reloading}>
              Sostituisci
            </button>
            <button className="ghost" onClick={() => setConfirmId(null)} disabled={reloading}>
              Annulla
            </button>
          </div>
        </div>
      )}

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
          <li><strong>Settimane 1-2</strong>: 2 serie, RIR 3 (interruttore qui sopra, in Impostazioni).</li>
          <li><strong>Doppia progressione</strong>: quando arrivi al massimo del range su tutte le serie, aumenta il carico o passa alla variante più difficile.</li>
          <li><strong>Esercizi a un arto</strong>: ripetizioni e kg per lato, stesse reps con l’altro lato.</li>
          <li><strong>Superset</strong> (stessa lettera, es. 2a/2b): esercizi di seguito, recupero solo dopo la coppia.</li>
          <li><strong>Gambe senza carico extra</strong> (quando 14 kg diventa leggero): discesa in 4-5 s, pausa 2 s in basso, 1,5 reps.</li>
          <li><strong>Dolore articolare</strong> (non fatica muscolare): fermati e cambia esercizio.</li>
        </ul>
      </div>
      <div className="box">
        <b>Push-up: scala degli appoggi</b>
        {Object.entries(PUSHUP_LEVELS).map(([k, v]) => `${k} ${v}`).join(' → ')}. Passi al livello successivo quando fai 3 × 12 a RIR 2.
      </div>

      <p className="muted small" data-testid="app-version">
        TeacherGym · {appVersion()}
      </p>
    </>
  );
}
