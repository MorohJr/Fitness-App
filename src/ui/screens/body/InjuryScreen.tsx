// טופס פציעה (4.2, R-INJ-1, נספח ו')
import { useEffect, useState } from 'preact/hooks';
import type { Exercise, Injury, InjuryStatus } from '../../../domain/types';
import { deleteInjury, listInjuries, restoreInjury, saveInjury, type InjuryInput } from '../../../data/repos/injuries';
import { listExercises } from '../../../data/repos/exercises';
import { clock } from '../../../data/clock';
import { FAMILY_META, STRENGTH_FAMILIES } from '../../../domain/families';
import { MUSCLES, MUSCLE_IDS } from '../../../domain/muscles';
import { INJURY_AREAS, isBlocked } from '../../../domain/rules/R-INJ';
import { useLive } from '../../hooks';
import { INJURY_STATUS_LABELS } from '../../labels';
import { BackLink, DateField, ErrorList, Field, Segmented, SelectField } from '../../components/Fields';
import { ChipsSelect } from '../../components/ExerciseBits';
import { navigate } from '../../router';
import { showToast } from '../../store';

function emptyInjury(): InjuryInput {
  return { area: 'knee', pain: 5, status: 'active', startDate: clock.today(), healedDate: null, notes: '', blockedExercises: [], blockedFamilies: [...INJURY_AREAS.knee.families], blockedMuscles: [...INJURY_AREAS.knee.muscles] };
}

export function InjuryScreen({ id }: { id: string | null }) {
  const data = useLive(async () => {
    const [injuries, exercises] = await Promise.all([listInjuries(), listExercises()]);
    return { injury: id ? injuries.find((i) => i.id === id) : undefined, exercises };
  }, [id]);
  const [f, setF] = useState<InjuryInput | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!data || f) return;
    if (id && data.injury) {
      const { area, pain, status, startDate, healedDate, notes, blockedExercises, blockedFamilies, blockedMuscles } = data.injury as Injury;
      setF(structuredClone({ area, pain, status, startDate, healedDate, notes, blockedExercises, blockedFamilies, blockedMuscles }));
    } else if (!id) setF(emptyInjury());
  }, [data]);
  if (!data) return null;
  if (id && !data.injury) return <div><BackLink to="/body/injuries" label="פציעות" /><p>הפציעה לא נמצאה.</p></div>;
  if (!f) return null;
  const set = (p: Partial<InjuryInput>) => setF({ ...f, ...p });
  const preview = { ...f, id: 'preview', createdAt: '', updatedAt: '', deletedAt: null, status: 'active' as InjuryStatus };
  const blocked = data.exercises.filter((e) => isBlocked(e, [preview]));
  const exName = (eid: string) => data.exercises.find((e) => e.id === eid)?.name ?? eid;
  const search: Exercise[] = q.length >= 2 ? data.exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()) && !f.blockedExercises.includes(e.id)).slice(0, 6) : [];

  async function save() {
    try {
      await saveInjury(f!, id ?? undefined);
      showToast(id ? 'הפציעה עודכנה' : 'הפציעה נשמרה');
      navigate('/body/injuries');
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <div>
      <BackLink to="/body/injuries" label="פציעות" />
      <h1>{id ? 'פציעה' : 'פציעה חדשה'}</h1>
      <div class="card">
        <SelectField
          label="אזור"
          value={f.area}
          options={Object.entries(INJURY_AREAS).map(([k, v]) => ({ value: k, label: v.name }))}
          onChange={(area) => {
            // הצעת חסימות לפי אזור (נספח ו'). אפשר לשנות למטה
            const def = INJURY_AREAS[area];
            set({ area, blockedFamilies: [...def.families], blockedMuscles: [...def.muscles] });
          }}
          hint="בחירת אזור מציעה מה לחסום. אפשר לשנות למטה"
        />
        <Field label={`עוצמת כאב: ${f.pain}/10`}>
          <input type="range" min={1} max={10} value={f.pain} onInput={(e) => set({ pain: Number((e.currentTarget as HTMLInputElement).value) })} />
        </Field>
        <Segmented<InjuryStatus>
          label="סטטוס"
          value={f.status}
          options={(Object.keys(INJURY_STATUS_LABELS) as InjuryStatus[]).map((s) => ({ value: s, label: INJURY_STATUS_LABELS[s] }))}
          onChange={(status) => set({ status, healedDate: status === 'healed' ? f.healedDate ?? clock.today() : null })}
        />
        <div class="grid2">
          <DateField label="התחלה" value={f.startDate} onChange={(v) => set({ startDate: v ?? clock.today() })} />
          {f.status === 'healed' && <DateField label="החלמה" value={f.healedDate} onChange={(healedDate) => set({ healedDate })} />}
        </div>
        <Field label="הערות">
          <textarea class="input" value={f.notes} onInput={(e) => set({ notes: (e.currentTarget as HTMLTextAreaElement).value })} />
        </Field>
      </div>

      <div class="card">
        <h2>מה חסום (R-INJ-1)</h2>
        {f.status === 'healed' && <div class="alert ok">פציעה שהחלימה לא חוסמת. בשלב 5: באימון הראשון חצי מהסטים, ב-RPE 6 (R-INJ-3).</div>}
        <div class="field">
          <span class="label">משפחות</span>
          <ChipsSelect options={STRENGTH_FAMILIES.map((x) => ({ value: x, label: FAMILY_META[x].name }))} value={f.blockedFamilies} onChange={(blockedFamilies) => set({ blockedFamilies })} />
        </div>
        <div class="field">
          <span class="label">קבוצות שרירים (ראשיות או משניות)</span>
          <ChipsSelect options={MUSCLE_IDS.map((m) => ({ value: m, label: MUSCLES[m].name }))} value={f.blockedMuscles} onChange={(blockedMuscles) => set({ blockedMuscles })} />
        </div>
        <div class="field">
          <span class="label">תרגילים מסוימים</span>
          <div class="chips-sel" style={{ marginBottom: '8px' }}>
            {f.blockedExercises.map((eid) => (
              <button type="button" aria-pressed="true" key={eid} class="en" onClick={() => set({ blockedExercises: f.blockedExercises.filter((x) => x !== eid) })}>
                {exName(eid)} ✕
              </button>
            ))}
          </div>
          <input class="input en" placeholder="חיפוש תרגיל…" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
          {search.map((e) => (
            <a class="rung" key={e.id} href="#" onClick={(ev) => { ev.preventDefault(); set({ blockedExercises: [...f.blockedExercises, e.id] }); setQ(''); }}>
              <span class="nm">{e.name}</span>
              <span>+</span>
            </a>
          ))}
        </div>
        <details>
          <summary class="small">חוסם {blocked.length} תרגילים</summary>
          <p class="small muted en" style={{ marginTop: '6px' }}>{blocked.map((e) => e.name).join(', ') || '—'}</p>
        </details>
      </div>

      <ErrorList errors={errors} />
      <button class="btn primary block" onClick={save}>שמור</button>
      {id && (
        <button
          class="btn danger block"
          style={{ marginTop: '10px' }}
          onClick={async () => {
            await deleteInjury(id);
            navigate('/body/injuries');
            showToast('הפציעה נמחקה', () => restoreInjury(id));
          }}
        >
          מחק פציעה
        </button>
      )}
    </div>
  );
}
