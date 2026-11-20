import { useEffect, useRef, useState } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { fmtNum } from '../logic/values';

// solo i pezzi di Chart.js che usiamo (l'app resta più leggera)
ChartJS.register(LineController, LineElement, PointElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface ChartDataset {
  label: string;
  values: (number | null)[];
  /** Variabile CSS del colore: '--c1' (verde) o '--c2' (blu). */
  color?: '--c1' | '--c2';
}

interface Props {
  type: 'line' | 'bar';
  labels: string[];
  datasets: ChartDataset[];
  /** Unità mostrata nel suggerimento al tocco ("kg", "s"...). */
  unit?: string;
  /** Asse a gradini (elastici, livelli): etichetta di ogni gradino. */
  steps?: string[];
  /** Barre orizzontali (una per gruppo muscolare). */
  horizontal?: boolean;
  /** Linea di riferimento orizzontale (es. 100 per l'indice). */
  baseline?: number;
  height?: number;
  /** Valori solo interi (ripetizioni, secondi): niente tacche come 7,5. */
  integer?: boolean;
  /** Testo per chi usa un lettore di schermo. */
  ariaLabel: string;
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Cambia quando il telefono passa da tema chiaro a scuro: i colori del grafico si rileggono. */
function useThemeKey(): string {
  const [key, setKey] = useState(() => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => setKey(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return key;
}

/** Grafico Chart.js (linee o barre). Tocca un punto per vedere il valore. */
export function Chart({ type, labels, datasets, unit = '', steps, horizontal, baseline, height = 220, integer, ariaLabel }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theme = useThemeKey();

  useEffect(() => {
    if (!canvas.current) return;
    const tx = css('--mut') || '#888';
    const grid = css('--line') || '#333';
    const surface = css('--card') || '#1c1d21';
    const u = unit ? ` ${unit}` : '';
    const fmtValue = (v: number) => (steps ? (steps[Math.round(v)] ?? fmtNum(v)) : `${fmtNum(Math.round(v * 10) / 10)}${u}`);

    const config: ChartConfiguration<'line' | 'bar'> = {
      type,
      data: {
        labels,
        datasets: datasets.map((d, i) => {
          const color = css(d.color ?? (i === 0 ? '--c1' : '--c2')) || '#34a865';
          return type === 'line'
            ? {
                label: d.label,
                data: d.values,
                borderColor: color,
                backgroundColor: color,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBorderColor: surface, // anello del colore dello sfondo tra punti sovrapposti
                pointBorderWidth: 2,
                spanGaps: true,
                tension: 0,
                stepped: steps ? ('before' as const) : false,
              }
            : {
                label: d.label,
                data: d.values,
                backgroundColor: color,
                borderRadius: 4,
                borderSkipped: 'start' as const,
                maxBarThickness: 28,
              };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        indexAxis: horizontal ? 'y' : 'x',
        interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
        plugins: {
          legend: {
            display: datasets.length > 1,
            position: 'bottom',
            labels: { color: tx, boxWidth: 12, boxHeight: 12, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: (c) => {
                const v = c.parsed[horizontal ? 'x' : 'y'];
                return v == null ? '' : `${c.dataset.label}: ${fmtValue(v)}`;
              },
            },
          },
        },
        scales: {
          [horizontal ? 'y' : 'x']: {
            grid: { display: false },
            ticks: { color: tx, maxRotation: 0, autoSkip: !horizontal, autoSkipPadding: 10 },
          },
          [horizontal ? 'x' : 'y']: {
            beginAtZero: type === 'bar' || !!steps,
            grid: { color: grid },
            border: { display: false },
            ...(steps ? { min: 0, max: steps.length - 1 } : type === 'bar' ? { suggestedMax: 2 } : {}),
            ticks: {
              color: tx,
              precision: steps || integer || type === 'bar' ? 0 : undefined, // serie e gradini: solo numeri interi
              stepSize: steps ? 1 : undefined,
              callback: (v: string | number) => (steps ? (steps[Number(v)] ?? '') : fmtNum(Number(v))),
            },
          },
        },
      },
    };
    // linea tratteggiata di riferimento (es. 100 = partenza), sempre visibile anche se non è una tacca dell'asse
    if (baseline != null) {
      config.options!.scales!.y = { ...config.options!.scales!.y, suggestedMin: Math.min(baseline - 10, 90), suggestedMax: baseline + 10 } as never;
      config.plugins = [
        {
          id: 'baseline',
          afterDatasetsDraw(c) {
            const y = c.scales.y.getPixelForValue(baseline);
            const { left, right } = c.chartArea;
            const g = c.ctx;
            g.save();
            g.strokeStyle = tx;
            g.setLineDash([4, 4]);
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(left, y);
            g.lineTo(right, y);
            g.stroke();
            g.restore();
          },
        },
      ];
    }
    const chart = new ChartJS(canvas.current, config);
    // etichette dell'asse delle categorie davvero disegnate (dopo lo scarto automatico): le legge la prova ST05
    const cat = chart.scales[horizontal ? 'y' : 'x'];
    if (cat) canvas.current.dataset.ticks = cat.ticks.map((t) => String(cat.getLabelForValue(t.value))).join('|');
    return () => chart.destroy();
  }, [type, labels, datasets, unit, steps, horizontal, baseline, integer, theme]);

  return (
    <div className="chart" style={{ height }}>
      <canvas ref={canvas} role="img" aria-label={ariaLabel} />
    </div>
  );
}
