// מסך "היום" (פרק 7): מדדים (הזנה ידנית), התאוששות, תוספים, שתייה ואוכל
import { useEffect } from 'preact/hooks';
import type { DayLog, ISODate, Supplement, SupplementTiming } from '../../../domain/types';
import { clock } from '../../../data/clock';
import { addWater, ensureDayLog, getDayLog, updateDayLog, type DayLogPatch } from '../../../data/repos/dayLogs';
import { listSupplementLogs, listSupplements, setSupplementTaken } from '../../../data/repos/supplements';
import { addDays, dayOfWeek, formatDate } from '../../../domain/calc/dates';
import { recoveryScore } from '../../../domain/rules/R-REC';
import { useLive } from '../../hooks';
import { DAY_TYPE_LABELS, WEEKDAYS, fmtNum } from '../../labels';
import { NumberField, ScaleField } from '../../components/Fields';
import { showToast } from '../../store';
import { TodayFood } from './TodayFood';

export const TIMING_LABELS: Record<SupplementTiming, string> = { morning: 'בוקר', preWorkout: 'לפני אימון', night: 'לילה' };

export function TodayScreen({ date: dateParam }: { date?: string }) {
  const today = clock.today();
  const date: ISODate = dateParam && dateParam <= today ? dateParam : today;
  const data = useLive(async () => {
    const [log, supplements, supLogs] = await Promise.all([getDayLog(date), listSupplements(), listSupplementLogs(date)]);
    return { log, supplements: supplements.filter((s) => s.active), supLogs };
  }, [date]);
  useEffect(() => {
    // יום בלי רשומה: יוצרים (יעדים לפי מה שהיה בתוקף, R-VER-1)
    if (data && !data.log) ensureDayLog(date);
  }, [data, date]);
  if (!data || !data.log) return null;
  const log: DayLog = data.log;
  const set = (patch: DayLogPatch) => updateDayLog(date, patch);
  const rec = recoveryScore(log);
  const waterTarget = (log.targets.waterL ?? 0) * 1000;
  const water = log.waterMl ?? 0;

  async function water$(ml: number) {
    const prev = await addWater(date, ml);
    showToast(`+${ml} מ"ל`, () => updateDayLog(date, { waterMl: prev }).then(() => undefined));
  }

  const groups = (['morning', 'preWorkout', 'night'] as SupplementTiming[]).map((t) => ({ t, list: data.supplements.filter((s) => s.timing === t) })).filter((g) => g.list.length);
  const taken = (s: Supplement) => data.supLogs.find((l) => l.supplementId === s.id)?.taken ?? false;

  return (
    <div>
      <div class="daynav">
        <a href={`#/today/${addDays(date, -1)}`} aria-label="יום קודם">›</a>
        <div style={{ textAlign: 'center' }}>
          <div class="eyebrow" style={{ margin: 0 }}>{WEEKDAYS[dayOfWeek(date)]} · {formatDate(date)}</div>
          <strong>{date === today ? 'היום' : 'יום קודם'}</strong>
        </div>
        {date < today ? <a href={`#/today/${addDays(date, 1)}`} aria-label="יום הבא">‹</a> : <span style={{ width: '44px' }} />}
      </div>
      <div class="chips" style={{ justifyContent: 'center' }}>
        <span class="badge accent">{DAY_TYPE_LABELS[log.dayType]}</span>
      </div>

      <div class="card">
        <h2>התאוששות</h2>
        <div class="big">
          <span class="v">{rec.score === null ? '—' : fmtNum(rec.score, 1)}</span>
          <span class="of">מתוך 10{rec.manual ? ' · ידני' : ''}</span>
        </div>
        {rec.parts.length > 0 && <p class="small muted">{rec.parts.map((p) => `${p.label} ${fmtNum(p.value, 1)}`).join(' · ')}</p>}
        <div class="grid2">
          <NumberField label="שעות שינה" decimal step={0.1} value={log.sleepHours ?? null} onChange={(v) => set({ sleepHours: v })} />
          <NumberField label="צעדים" step={100} value={log.steps ?? null} onChange={(v) => set({ steps: v })} />
        </div>
        <ScaleField label="איכות שינה" value={log.sleepQuality} onChange={(v) => set({ sleepQuality: v })} />
        <ScaleField label="אנרגיה" value={log.energy} onChange={(v) => set({ energy: v })} />
        <ScaleField label="ריכוז" value={log.focus} onChange={(v) => set({ focus: v })} />
        <ScaleField label="DOMS (כאבי שרירים)" value={log.doms} onChange={(v) => set({ doms: v })} />
        <ScaleField label="תיקון ידני לציון" value={log.manualRecovery} onChange={(v) => set({ manualRecovery: v })} hint="אם מוזן, הוא דורס את הציון המחושב" />
        <NumberField label="משקל בוקר" suffix='ק"ג' decimal step={0.1} value={log.morningWeightKg ?? null} onChange={(v) => set({ morningWeightKg: v })} />
      </div>

      <div class="card">
        <div class="row">
          <h2 style={{ margin: 0 }}>שתייה</h2>
          <span class="num">{fmtNum(water / 1000, 2)}{waterTarget ? ` / ${fmtNum(waterTarget / 1000, 1)}` : ''} ל'</span>
        </div>
        <div class={`bar${waterTarget && water > waterTarget * 1.5 ? ' over' : ''}`} style={{ margin: '10px 0' }}>
          <i style={{ width: `${waterTarget ? Math.min(100, (water / waterTarget) * 100) : 0}%` }} />
        </div>
        <div class="water">
          <button class="btn" onClick={() => water$(250)}>+250</button>
          <button class="btn" onClick={() => water$(500)}>+500</button>
          <button class="btn" onClick={() => water$(750)}>+750</button>
        </div>
      </div>

      <div class="card">
        <div class="row">
          <h2 style={{ margin: 0 }}>תוספים</h2>
          <a href="#/nutrition/supplements" class="small">ניהול</a>
        </div>
        {groups.length === 0 && <p class="small muted" style={{ marginTop: '8px' }}>אין תוספים פעילים.</p>}
        {groups.map((g) => (
          <div key={g.t}>
            <div class="label" style={{ marginTop: '10px' }}>{TIMING_LABELS[g.t]}</div>
            {g.list.map((s) => (
              <label class="check-row" key={s.id}>
                <input type="checkbox" checked={taken(s)} onChange={(e) => setSupplementTaken(date, s, (e.currentTarget as HTMLInputElement).checked)} />
                <span class="grow">{s.name}</span>
                <span class="small muted">{s.dose}</span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <TodayFood date={date} log={log} />
    </div>
  );
}
