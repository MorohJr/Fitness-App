// שיאים אישיים (R-BODY-5) ואבני דרך (R-BODY-6)
import { useState } from 'preact/hooks';
import { deleteMilestone, listMilestones, restoreMilestone, saveMilestone, setMilestoneAchieved } from '../../../data/repos/body';
import { listExercises } from '../../../data/repos/exercises';
import { getHistory } from '../../../data/repos/workouts';
import { milestoneState, personalRecords, SUGGESTED_MILESTONES } from '../../../domain/rules/R-BODY';
import { formatDate } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { fmtNum } from '../../labels';
import { ErrorList, Field, NumberField } from '../../components/Fields';
import { showToast } from '../../store';
import { BodyTabs } from './BodyTabs';

const STATE = { locked: '🔒 נעול', ready: '⚔️ מוכן למבחן', achieved: '🏆 הושג' };

export function RecordsScreen() {
  const data = useLive(async () => {
    const [exs, history, ms] = await Promise.all([listExercises(), getHistory(), listMilestones()]);
    const byId = new Map(exs.map((e) => [e.id, e]));
    return { exs, byId, prs: personalRecords(history, byId), ms };
  });
  const [name, setName] = useState('');
  const [exId, setExId] = useState('');
  const [val, setVal] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  if (!data) return null;
  const { exs, byId, prs, ms } = data;
  const prList = [...prs.values()].filter((p) => byId.get(p.exerciseId)?.status !== null).sort((a, b) => b.date.localeCompare(a.date));
  const unused = SUGGESTED_MILESTONES.filter((s) => !ms.some((m) => m.name === s.name));

  return (
    <div>
      <h1>גוף ושיאים</h1>
      <BodyTabs active="/body/records" />
      <h2>אבני דרך</h2>
      {ms.length === 0 && <p class="small muted">אין אבני דרך. בחר מהרשימה או צור משלך.</p>}
      {ms.map((m) => {
        const st = milestoneState(m, prs);
        return (
          <div class="ex-card" key={m.id}>
            <div class="row">
              <strong>{m.name}</strong>
              <span class={`badge${st === 'achieved' ? ' accent' : st === 'ready' ? ' warn' : ''}`}>{STATE[st]}</span>
            </div>
            <div class="meta">
              {m.requirements.map((r) => {
                const e = byId.get(r.exerciseId);
                const pr = prs.get(r.exerciseId);
                return <div key={r.exerciseId}><span class="en">{e?.name}</span>: {r.value} · שיא {fmtNum(pr?.maxReps ?? pr?.maxSeconds ?? null)}</div>;
              })}
              {m.completedDate && <div>הושג ב-{formatDate(m.completedDate)}</div>}
            </div>
            <div class="actions">
              {st === 'ready' && <button class="btn primary" onClick={() => setMilestoneAchieved(m.id, true)}>הושג במבחן 🏆</button>}
              {st === 'achieved' && <button class="btn" onClick={() => setMilestoneAchieved(m.id, false)}>בטל סימון</button>}
              <button class="btn danger" onClick={async () => { await deleteMilestone(m.id); showToast('נמחק', () => restoreMilestone(m.id)); }}>מחק</button>
            </div>
          </div>
        );
      })}
      {unused.length > 0 && (
        <div class="card">
          <h2>הצעות</h2>
          {unused.map((s) => (
            <div class="log-item" key={s.name}>
              <span class="grow">{s.name}</span>
              <button class="btn" onClick={() => saveMilestone({ name: s.name, requirements: s.requirements, targetDate: null })}>הוסף</button>
            </div>
          ))}
        </div>
      )}
      <div class="card">
        <h2>אבן דרך משלך</h2>
        <Field label="שם">
          <input class="input" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        </Field>
        <div class="grid2">
          <Field label="תרגיל">
            <select class="input" value={exId} onChange={(e) => setExId((e.currentTarget as HTMLSelectElement).value)}>
              <option value="">בחר</option>
              {exs.filter((e) => e.status !== null).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <NumberField label="ערך נדרש" value={val} onChange={setVal} />
        </div>
        <ErrorList errors={errors} />
        <button
          class="btn block"
          onClick={async () => {
            try {
              await saveMilestone({ name, requirements: [{ exerciseId: exId, value: val ?? 0 }], targetDate: null });
              setName('');
              setVal(null);
              setErrors([]);
            } catch (e) {
              setErrors([(e as Error).message]);
            }
          }}
        >
          הוסף אבן דרך
        </button>
      </div>

      <h2>שיאים אישיים</h2>
      {prList.length === 0 ? (
        <p class="small muted">השיאים מחושבים מהסטים שנרשמו באימונים ובמבחן הפתיחה.</p>
      ) : (
        <div class="card">
          <table class="plain">
            <thead><tr><th>תרגיל</th><th>שיא</th><th>עומס</th><th>תאריך</th></tr></thead>
            <tbody>
              {prList.map((p) => {
                const e = byId.get(p.exerciseId)!;
                return (
                  <tr key={p.exerciseId}>
                    <td class="en" style={{ textAlign: 'right' }}>{e.name}</td>
                    <td class="num">{p.maxSeconds !== null ? `${p.maxSeconds} שנ'` : p.maxReps}{e.unilateral ? ' לצד' : ''}</td>
                    <td class="num">{p.maxLoad !== null ? `${p.maxLoad}` : '—'}</td>
                    <td class="num small">{formatDate(p.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
