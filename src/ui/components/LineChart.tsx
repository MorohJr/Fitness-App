// גרף קו (Chart.js, נטען רק כשצריך). סדרה אחת בצבע ההדגשה, נקודות גולמיות אפורות, ציר אחד, tooltip במעבר/נגיעה
import { useEffect, useRef } from 'preact/hooks';

export interface Pt {
  x: string;
  y: number | null;
}

interface Props {
  series: Pt[];
  /** נקודות גולמיות (למשל שקילות) מתחת לקו המגמה */
  raw?: Pt[];
  label: string;
  unit: string;
  height?: number;
}

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function LineChart({ series, raw, label, unit, height = 220 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let chart: { destroy: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const { default: Chart } = await import('chart.js/auto');
      if (cancelled || !ref.current) return;
      const ink = css('--accent-ink');
      const muted = css('--muted');
      const grid = css('--border');
      const text = css('--text');
      const labels = [...new Set([...(raw ?? []).map((p) => p.x), ...series.map((p) => p.x)])].sort();
      const at = (list: Pt[]) => labels.map((l) => list.find((p) => p.x === l)?.y ?? null);
      const fmt = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
      chart = new Chart(ref.current, {
        type: 'line',
        data: {
          labels: labels.map(fmt),
          datasets: [
            ...(raw ? [{ label: 'מדידה', data: at(raw), showLine: false, pointRadius: 3, pointBackgroundColor: muted, borderColor: muted }] : []),
            { label, data: at(series), borderColor: ink, backgroundColor: ink, borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, spanGaps: true, tension: 0.25 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: !!raw, labels: { color: text, boxWidth: 12, font: { family: 'Rubik' } } },
            tooltip: { rtl: true, callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y} ${unit}` } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: muted, maxTicksLimit: 6, font: { family: 'Rubik' } }, border: { color: grid } },
            y: { grid: { color: grid }, ticks: { color: muted, font: { family: 'Rubik' } }, border: { display: false } }
          }
        }
      });
    })();
    return () => {
      cancelled = true;
      chart?.destroy();
    };
  }, [JSON.stringify(series), JSON.stringify(raw), label]);
  return (
    <div style={{ height: `${height}px`, direction: 'ltr' }} role="img" aria-label={`גרף ${label}`}>
      <canvas ref={ref} />
    </div>
  );
}
