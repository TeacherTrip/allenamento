// Suono e vibrazione. I browser permettono l'audio solo dopo un tocco dell'utente:
// unlockAudio() va chiamata dentro un gestore di tocco (✓, Inizia, Avvia recupero).

let ac: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    ac ??= new AudioContext();
    if (ac.state === 'suspended') void ac.resume();
  } catch {
    /* audio non disponibile */
  }
}

export function beep(freq = 880, dur = 0.3): void {
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ac.destination);
    g.gain.setValueAtTime(0.4, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch {
    /* ignora */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supportata */
  }
}

/** Fine recupero: doppio bip + vibrazione. */
export function restEndAlert(): void {
  beep(988, 0.35);
  setTimeout(() => beep(988, 0.35), 450);
  vibrate([300, 150, 300]);
}
