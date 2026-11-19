/**
 * Percorso dell'immagine di un esercizio.
 * Usa BASE_URL ('/allenamento/' su GitHub Pages), mai un '/' iniziale fisso.
 */
export function imageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}esercizi/${image}.webp`;
}
