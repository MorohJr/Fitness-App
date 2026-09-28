// גוף: מדידה אחרונה עם שינוי מהקודמת ומהבסיס, היסטוריה וגרף לכל היקף (פרק 7)
import { useState } from 'preact/hooks';
import { CIRCUMFERENCES, type BodyMeasurement, type Circumference } from '../../../domain/types';
import { listMeasurements } from '../../../data/repos/body';
import { listDayLogs } from '../../../data/repos/dayLogs';
import { clock } from '../../../data/clock';
import { composition, deltas, BF_NOTE } from '../../../domain/calc/bodyfat';
import { measurementDue } from '../../../domain/rules/R-BODY';
import { trendWeight } from '../../../domain/calc/weight';
import { formatDate } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { CIRC_LABELS, fmtDelta, fmtNum } from '../../labels';
import { LineChart, type Pt } from '../../components/LineChart';
import { BodyTabs } from './BodyTabs';

type Metric = 'weight' | 'bodyFat' | 'lean' | 'fat' | Circumference;
const METRIC_LABELS: Record<Metric, string> = { weight: 'משקל', bodyFat: 'אחוז שומן', lean: 'מסה רזה', fat: 'מסת שומן', ...CIRC_LABELS };

export function metricOf(m: BodyMeasurement, k: Metric): number | null {
  if (k === 'weight') return m.weightKg;
  const c = composition(m);
  if (k === 'bodyFat') return c.bodyFat;
  if (k === 'lean') return c.leanKg;
  if (k === 'fat') return c.fatKg;
  return m.circ[k] ?? null;
}

const unitOf = (k: Metric) => (k === 'bodyFat' ? '%' : k === 'weight' || k === 'lean' || k === 'fat' ? 'ק"ג' : 'ס"מ');

export function BodyScreen() {
  const data = useLive(async () => ({ ms: await listMeasurements(), logs: await listDayLogs() }));
  const [metric, setMetric] = useState<Metric>('weight');
  if (!data) return null;
  const { ms, logs } = data;
  const today = clock.today();
  const last = ms[ms.length - 1];
  const idx = ms.length - 1;
  const series = (k: Metric) => ms.map((m) => metricOf(m, k));
  const row = (k: Metric) => {
    const v = last ? metricOf(last, k) : null;
    const d = deltas(series(k), idx);
    return (
      <tr key={k}>
        <td>{METRIC_LABELS[k]}</td>
        <td class="num"><b>{fmtNum(v, 1)}</b> {v !== null ? unitOf(k) : ''}</td>
        <td class="num small">{fmtDelta(d.fromPrev)}</td>
        <td class="num small">{fmtDelta(d.fromBase)}</td>
      </tr>
    );
  };

  // גרף: משקל = קו מגמה (R-BODY-3) + שקילות. אחר: ערכי המדידות
  const weighIns = [
    ...logs.filter((l) => typeof l.morningWeightKg === 'number').map((l) => ({ date: l.date, weightKg: l.morningWeightKg as number })),
    ...ms.filter((m) => m.weightKg !== null).map((m) => ({ date: m.date, weightKg: m.weightKg as number }))
  ];
  let chartSeries: Pt[];
  let raw: Pt[] | undefined;
  if (metric === 'weight') {
    const dates = [...new Set(weighIns.map((w) => w.date))].sort();
    raw = dates.map((d) => ({ x: d, y: weighIns.filter((w) => w.date === d).pop()!.weightKg }));
    chartSeries = dates.map((d) => ({ x: d, y: trendWeight(weighIns, d) }));
  } else chartSeries = ms.map((m) => ({ x: m.date, y: metricOf(m, metric) }));
  const hasChart = chartSeries.filter((p) => p.y !== null).length + (raw?.length ?? 0) >= 2;

  return (
    <div>
      <div class="row">
        <h1>גוף ושיאים</h1>
        <a class="btn" href="#/body/measure/new">+ מדידה</a>
      </div>
      <BodyTabs active="/body" />
      {measurementDue(last?.date ?? null, today) && <div class="alert warn">עברו 14 יום מהמדידה האחרונה. זמן למדידה חדשה (R-BODY-4)</div>}
      {!last ? (
        <div class="card">
          <p>עוד אין מדידות. המדידה הראשונה היא הבסיס, וכל השינויים יחושבו מולה.</p>
          <a class="btn primary block" href="#/body/measure/new">מדידה ראשונה</a>
        </div>
      ) : (
        <div class="card">
          <div class="row">
            <h2 style={{ margin: 0 }}>מדידה אחרונה</h2>
            <span class="small muted">{formatDate(last.date)}</span>
          </div>
          <table class="plain" style={{ marginTop: '8px' }}>
            <thead>
              <tr><th></th><th>ערך</th><th>מהקודמת</th><th>מהבסיס</th></tr>
            </thead>
            <tbody>
              {(['weight', 'bodyFat', 'lean', 'fat'] as Metric[]).map(row)}
              {CIRCUMFERENCES.filter((c) => ms.some((m) => m.circ[c])).map(row)}
            </tbody>
          </table>
          <p class="small muted" style={{ margin: '8px 0 0' }}>אחוז שומן בשיטת הצי האמריקאי. {BF_NOTE}.</p>
        </div>
      )}

      {(ms.length > 0 || weighIns.length > 0) && (
        <div class="card">
          <label class="field">
            <span class="label">גרף</span>
            <select class="input" value={metric} onChange={(e) => setMetric((e.currentTarget as HTMLSelectElement).value as Metric)}>
              {(Object.keys(METRIC_LABELS) as Metric[]).map((k) => <option key={k} value={k}>{METRIC_LABELS[k]}{k === 'weight' ? ' (מגמה)' : ''}</option>)}
            </select>
          </label>
          {hasChart ? <LineChart series={chartSeries} raw={raw} label={metric === 'weight' ? 'משקל מגמה' : METRIC_LABELS[metric]} unit={unitOf(metric)} /> : <p class="small muted">צריך לפחות שתי מדידות כדי להציג גרף.</p>}
        </div>
      )}

      {ms.length > 0 && (
        <>
          <h2>היסטוריה</h2>
          <div class="list">
            {[...ms].reverse().map((m, i) => {
              const c = composition(m);
              return (
                <a key={m.id} href={`#/body/measure/${m.id}`}>
                  <span class="grow">
                    {formatDate(m.date)}{i === ms.length - 1 ? ' · בסיס' : ''}
                    <div class="small muted">{m.weightKg !== null ? `${fmtNum(m.weightKg, 1)} ק"ג` : ''}{c.bodyFat !== null ? ` · ${c.bodyFat}% שומן` : ''}{m.circ.waist ? ` · מותניים ${m.circ.waist}` : ''}</div>
                  </span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
