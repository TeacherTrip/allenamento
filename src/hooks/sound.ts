// Suono e vibrazione. I browser permettono l'audio solo dopo un tocco dell'utente:
// unlockAudio() va chiamata dentro un gestore di tocco (✓, Sx/Dx, Inizia, Avvia recupero).
// Ogni funzione è protetta: se un'API manca o fallisce, non blocca nient'altro.

let ac: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac ??= new AC();
    if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
  } catch {
    /* audio non disponibile */
  }
}

/** Un bip, eventualmente ritardato di `delaySec` (programmato nell'orologio audio, non con setTimeout). */
export function beep(freq = 988, dur = 0.3, delaySec = 0): void {
  try {
    if (!ac) return;
    const t = ac.currentTime + delaySec;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ac.destination);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  } catch {
    /* ignora */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* non supportata: su Xiaomi serve "Vibrazione tattile" attiva */
  }
}

/** Istanti dei 4 bip di fine recupero: due coppie. */
export const END_BEEPS = [0, 0.45, 1.2, 1.65];

/** Fine recupero: 4 bip (due coppie) + vibrazione. Suono e vibrazione indipendenti. */
export function restEndAlert(): void {
  try {
    for (const t of END_BEEPS) beep(988, 0.3, t);
  } catch {
    /* ignora */
  }
  vibrate([300, 150, 300, 450, 300, 150, 300]);
}

// ---------- circuito cardio ----------

/** Conto alla rovescia negli ultimi 3 secondi di ogni fase: bip corto. */
export function countdownTick(): void {
  beep(660, 0.12);
}

/** Inizio del lavoro: bip alto e lungo + vibrazione. */
export function workStartAlert(): void {
  beep(988, 0.5);
  vibrate(400);
}

/** Inizio della pausa: bip basso + doppia vibrazione corta. */
export function restStartAlert(): void {
  beep(520, 0.5);
  vibrate([200, 100, 200]);
}

/** Fine circuito: tre note salenti + vibrazione lunga. */
export function circuitDoneAlert(): void {
  beep(660, 0.25, 0);
  beep(880, 0.25, 0.3);
  beep(1175, 0.6, 0.6);
  vibrate([500, 200, 500]);
}
