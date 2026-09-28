// מאגר התרגילים: לוח לפי סטטוס, סינון, וסולמות (פרק 7)
import { useState } from 'preact/hooks';
import type { Exercise, ExerciseStatus, LocationId } from '../../../domain/types';
import { listExercises } from '../../../data/repos/exercises';
import { listInjuries } from '../../../data/repos/injuries';
import { getProfile } from '../../../data/repos/profile';
import { CATEGORY_LABELS, FAMILY_IDS, FAMILY_META, type Category, type FamilyId } from '../../../domain/families';
import { availableAt, ladder, levelIn } from '../../../domain/calc/exercises';
import { isBlocked } from '../../../domain/rules/R-INJ';
import { useLive } from '../../hooks';
import { LOCATION_LABELS, STATUS_EMOJI, STATUS_LABELS } from '../../labels';
import { BackLink, Segmented } from '../../components/Fields';
import { ExerciseCard, StatusDot } from '../../components/ExerciseBits';

const STATUSES: ExerciseStatus[] = ['red', 'yellow', 'green'];

export function LibraryScreen() {
  const data = useLive(async () => {
    const [exercises, injuries, profile] = await Promise.all([listExercises(), listInjuries(), getProfile()]);
    return { exercises, injuries, profile };
  });
  const [view, setView] = useState<'board' | 'ladders'>('board');
  const [tab, setTab] = useState<ExerciseStatus>('red');
  const [family, setFamily] = useState<FamilyId | ''>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [loc, setLoc] = useState<LocationId | ''>('');
  const [q, setQ] = useState('');
  if (!data?.profile) return null;
  const { exercises, injuries, profile } = data;
  const location = loc ? profile.locations.find((l) => l.id === loc) : undefined;

  const match = (e: Exercise) =>
    (!family || e.familyIds.includes(family)) &&
    (!category || e.category === category) &&
    (!q || e.name.toLowerCase().includes(q.toLowerCase()));
  const off = (e: Exercise) => (location ? !availableAt(e, location) : false);
  const strength = exercises.filter((e) => e.status !== null && match(e));
  const pools = exercises.filter((e) => e.status === null && match(e));
  const fams = FAMILY_IDS.filter((f) => FAMILY_META[f].kind === 'strength' && (!family || f === family) && (!category || FAMILY_META[f].category === category));

  return (
    <div>
      <BackLink to="/workout" label="אימון" />
      <div class="row">
        <h1>מאגר תרגילים</h1>
        <a class="btn" href="#/workout/new-exercise">+ חדש</a>
      </div>

      <div class="filters">
        <label class="field">
          <span class="label">משפחה</span>
          <select class="input" value={family} onChange={(e) => setFamily((e.currentTarget as HTMLSelectElement).value as FamilyId)}>
            <option value="">הכול</option>
            {FAMILY_IDS.map((f) => <option key={f} value={f}>{FAMILY_META[f].name}</option>)}
          </select>
        </label>
        <label class="field">
          <span class="label">קטגוריה</span>
          <select class="input" value={category} onChange={(e) => setCategory((e.currentTarget as HTMLSelectElement).value as Category)}>
            <option value="">הכול</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
        <label class="field">
          <span class="label">מיקום וציוד</span>
          <select class="input" value={loc} onChange={(e) => setLoc((e.currentTarget as HTMLSelectElement).value as LocationId)}>
            <option value="">הכול</option>
            {profile.locations.map((l) => <option key={l.id} value={l.id}>זמין ב{LOCATION_LABELS[l.id]}</option>)}
          </select>
        </label>
        <label class="field">
          <span class="label">חיפוש</span>
          <input class="input en" placeholder="Push-up" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} />
        </label>
      </div>

      <Segmented<'board' | 'ladders'> value={view} options={[{ value: 'board', label: 'לפי סטטוס' }, { value: 'ladders', label: 'סולמות' }]} onChange={setView} />

      {view === 'board' ? (
        <>
          <div class="kanban-tabs">
            <Segmented<ExerciseStatus>
              value={tab}
              options={STATUSES.map((s) => ({ value: s, label: `${STATUS_EMOJI[s]} ${strength.filter((e) => e.status === s).length}` }))}
              onChange={setTab}
            />
          </div>
          <div class="kanban">
            {STATUSES.map((s) => {
              const list = strength.filter((e) => e.status === s);
              return (
                <div key={s} class={s === tab ? '' : 'col-off'}>
                  <div class="col-head">
                    <span>{STATUS_EMOJI[s]} {STATUS_LABELS[s]}</span>
                    <span>{list.length}</span>
                  </div>
                  {list.length === 0 && <p class="small muted">אין תרגילים כאן</p>}
                  {list.map((e) => <ExerciseCard key={e.id} ex={e} blocked={isBlocked(e, injuries)} off={off(e)} />)}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        fams.map((f) => (
          <div class="card" key={f}>
            <h2>{FAMILY_META[f].name}</h2>
            {ladder(exercises, f)
              .filter(match)
              .map((e) => (
                <a class="rung" key={e.id} href={`#/workout/exercise/${e.id}`} style={off(e) ? { opacity: 0.45 } : undefined}>
                  <span class="lvl">{levelIn(e, f)}</span>
                  <span class="nm">{e.name}</span>
                  {isBlocked(e, injuries) && <span class="tag block">⛔</span>}
                  <StatusDot ex={e} />
                </a>
              ))}
          </div>
        ))
      )}

      {pools.length > 0 && (
        <details class="card">
          <summary>יציבה, לסת ומוביליטי ({pools.length})</summary>
          <div style={{ marginTop: '10px' }}>
            {pools.map((e) => <ExerciseCard key={e.id} ex={e} blocked={isBlocked(e, injuries)} off={off(e)} />)}
          </div>
        </details>
      )}
    </div>
  );
}
