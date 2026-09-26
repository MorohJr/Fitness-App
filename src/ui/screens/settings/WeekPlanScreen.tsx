// תוכנית שבועית ותבניות (R-DAY-1, R-VER-2, נספח ב')
import { useEffect, useState } from 'preact/hooks';
import type { DayPlan, DayType } from '../../../domain/types';
import { clock } from '../../../data/clock';
import { cancelPendingWeekPlan, listTemplates, listWeekPlanVersions, saveWeekPlan } from '../../../data/repos/weekPlan';
import { versionForDate } from '../../../domain/rules/R-VER';
import { DEFAULT_WEEK_DAYS } from '../../../domain/rules/R-DAY';
import { FAMILIES, type FamilyId } from '../../../domain/families';
import { formatDate, nextSunday } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { DAY_TYPE_LABELS, WEEKDAYS } from '../../labels';
import { BackLink, ErrorList, Segmented } from '../../components/Fields';
import { showToast } from '../../store';

const PRIORITY = { main: 'ראשי', secondary: 'משני', accessory: 'אביזר' };

export function WeekPlanScreen() {
  const today = clock.today();
  const data = useLive(async () => {
    const [versions, templates] = await Promise.all([listWeekPlanVersions(), listTemplates()]);
    const current = versionForDate(versions, today);
    const pending = versions.filter((v) => v.effectiveFrom > today).pop() ?? null;
    return { versions, templates, current, pending };
  }, [today]);
  const [days, setDays] = useState<DayPlan[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (data && !days) setDays(structuredClone((data.pending ?? data.current)?.days ?? DEFAULT_WEEK_DAYS));
  }, [data]);
  if (!data || !days) return null;
  const { templates, current, pending } = data;
  const nameOf = (id: string | null) => templates.find((t) => t.id === id)?.name ?? '—';

  const setDay = (i: number, patch: Partial<DayPlan>) => setDays(days.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const changeType = (i: number, dayType: DayType) => {
    const templateId = dayType === 'rest' ? null : dayType === 'activeRecovery' ? templates.find((t) => t.kind === 'recovery')?.id ?? null : templates.find((t) => t.kind === 'training')?.id ?? null;
    setDay(i, { dayType, templateId });
  };

  async function save() {
    try {
      const v = await saveWeekPlan(days!);
      setErrors([]);
      showToast(`התוכנית נשמרה. תחול מ-${formatDate(v.effectiveFrom)}`);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <div>
      <BackLink />
      <h1>תוכנית שבועית</h1>

      {current && (
        <div class="card">
          <h2>בתוקף עכשיו</h2>
          <table class="plain">
            <tbody>
              {current.days.map((d, i) => (
                <tr key={i}>
                  <td>{WEEKDAYS[i]}</td>
                  <td>{DAY_TYPE_LABELS[d.dayType]}</td>
                  <td>{d.dayType === 'rest' ? '' : nameOf(d.templateId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending && (
        <div class="alert warn">
          יש שינוי שמתוכנן להתחיל ב-{formatDate(pending.effectiveFrom)}.{' '}
          <button
            class="btn"
            onClick={async () => {
              await cancelPendingWeekPlan(pending.id);
              setDays(structuredClone(current?.days ?? DEFAULT_WEEK_DAYS));
              showToast('השינוי המתוכנן בוטל');
            }}
          >
            בטל את השינוי
          </button>
        </div>
      )}

      <div class="card">
        <h2>עריכה</h2>
        <p class="small muted">שינוי חל מיום ראשון הבא ({formatDate(nextSunday(today))}), כדי לא לשנות את השבוע הנוכחי.</p>
        {days.map((d, i) => (
          <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? '12px' : 0 }}>
            <strong>{WEEKDAYS[i]}</strong>
            <Segmented<DayType>
              value={d.dayType}
              options={(Object.keys(DAY_TYPE_LABELS) as DayType[]).map((v) => ({ value: v, label: DAY_TYPE_LABELS[v] }))}
              onChange={(t) => changeType(i, t)}
            />
            {d.dayType !== 'rest' && (
              <select class="input" style={{ marginBottom: '12px' }} value={d.templateId ?? ''} onChange={(e) => setDay(i, { templateId: (e.currentTarget as HTMLSelectElement).value })}>
                {templates
                  .filter((t) => t.kind === (d.dayType === 'training' ? 'training' : 'recovery'))
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
              </select>
            )}
          </div>
        ))}
        <ErrorList errors={errors} />
        <button class="btn primary block" onClick={save}>
          שמור תוכנית
        </button>
      </div>

      <h2>תבניות</h2>
      {templates.map((t) => (
        <details class="card" key={t.id}>
          <summary style={{ minHeight: '28px', cursor: 'pointer', fontWeight: 600 }}>{t.name}</summary>
          {t.slots.length === 0 ? (
            <p class="small muted" style={{ marginTop: '8px' }}>בלי עבודת כוח: מוביליטי, מתיחות, יציבה, לסת ומדיטציה (R-DAY-2)</p>
          ) : (
            <table class="plain" style={{ marginTop: '8px' }}>
              <tbody>
                {t.slots.map((s, i) => (
                  <tr key={i}>
                    <td>{FAMILIES[s.family as FamilyId] ?? s.family}</td>
                    <td>{PRIORITY[s.priority]}</td>
                    <td>{s.sets} סטים</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      ))}
      <p class="small muted">עריכת תבניות תיבנה עם מנוע האימונים (שלב 5).</p>
    </div>
  );
}
