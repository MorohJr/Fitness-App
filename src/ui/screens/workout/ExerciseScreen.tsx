// דף תרגיל: פרטים, סטטוס, עריכה (4.2)
import { useState } from 'preact/hooks';
import type { ExerciseStatus } from '../../../domain/types';
import { deleteCustomExercise, getExercise, restoreExercise, setExerciseStatus, updateExercise } from '../../../data/repos/exercises';
import { listInjuries } from '../../../data/repos/injuries';
import { getProfile } from '../../../data/repos/profile';
import { FAMILY_META, type FamilyId } from '../../../domain/families';
import { MUSCLES, type MuscleId } from '../../../domain/muscles';
import { blockReasons, INJURY_AREAS } from '../../../domain/rules/R-INJ';
import { videoUrl } from '../../../domain/calc/exercises';
import { useLive } from '../../hooks';
import { LOCATION_LABELS, MEASURE_LABELS, MEASURE_UNIT, STATUS_EMOJI, STATUS_LABELS } from '../../labels';
import { BackLink } from '../../components/Fields';
import { showToast } from '../../store';
import { navigate } from '../../router';
import { ExerciseForm, formFromExercise } from './ExerciseForm';

const muscleNames = (ids: string[]) => ids.map((m) => MUSCLES[m as MuscleId]?.name ?? m).join(', ') || '—';

export function ExerciseScreen({ id }: { id: string }) {
  const data = useLive(async () => {
    const [ex, injuries, profile] = await Promise.all([getExercise(id), listInjuries(), getProfile()]);
    return { ex, injuries, profile };
  }, [id]);
  const [edit, setEdit] = useState(false);
  const [pending, setPending] = useState<ExerciseStatus | null>(null);
  if (!data) return null;
  const { ex, injuries, profile } = data;
  if (!ex || !profile) {
    return (
      <div>
        <BackLink to="/workout/library" label="מאגר תרגילים" />
        <p>התרגיל לא נמצא.</p>
      </div>
    );
  }
  const reasons = blockReasons(ex, injuries);
  const eqName = (q: string) => profile.equipment.find((e) => e.id === q)?.name ?? q;
  const unit = MEASURE_UNIT[ex.measure];

  return (
    <div>
      <BackLink to="/workout/library" label="מאגר תרגילים" />
      <h1 class="en">{ex.name}</h1>
      <div class="chips">
        {ex.status && <span class="badge accent">{STATUS_EMOJI[ex.status]} {STATUS_LABELS[ex.status]}</span>}
        {ex.families.map((f) => <span class="badge" key={f.family}>{FAMILY_META[f.family as FamilyId]?.name ?? f.family} · רמה {f.level}</span>)}
        {ex.custom && <span class="badge">שלי</span>}
      </div>

      {reasons.length > 0 && (
        <div class="alert danger">
          ⛔ חסום בגלל פציעה ב{[...new Set(reasons.map((r) => INJURY_AREAS[r.area]?.name ?? r.area))].join(', ')} (R-INJ-1). לא ייכנס לאימונים עד שהפציעה תחלים.
        </div>
      )}

      {edit ? (
        <ExerciseForm
          initial={formFromExercise(ex)}
          editIdentity={ex.custom}
          equipmentList={profile.equipment}
          submitLabel="שמור"
          onCancel={() => setEdit(false)}
          onSubmit={async (v) => {
            await updateExercise(ex.id, ex.custom ? v : { ...v, name: ex.name, families: ex.families });
            setEdit(false);
            showToast('התרגיל נשמר. אימונים שעברו לא משתנים');
          }}
        />
      ) : (
        <>
          <div class="card">
            <h2>דגשי טכניקה</h2>
            <ul class="cues">{ex.cues.map((c) => <li key={c}>{c}</li>)}</ul>
            {ex.safety && <p class="small" style={{ marginTop: '8px' }}>⚠️ {ex.safety}</p>}
            <a class="btn block" href={videoUrl(ex)} target="_blank" rel="noopener">▶ סרטונים ביוטיוב</a>
          </div>

          <div class="card">
            <table class="plain">
              <tbody>
                <tr><td>מדידה</td><td>{MEASURE_LABELS[ex.measure]}{ex.unilateral ? ', כל צד בנפרד' : ''}</td></tr>
                <tr><td>טווח יעד</td><td class="num">{ex.targetMin}–{ex.targetMax} {unit}{ex.unilateral ? ' לכל צד' : ''}</td></tr>
                <tr><td>מנוחה</td><td class="num">{ex.restSec} שניות</td></tr>
                <tr><td>זמן לסט</td><td class="num">{ex.secondsPerSet} שניות</td></tr>
                <tr><td>קצב</td><td>{ex.tempo}</td></tr>
                <tr><td>ציוד</td><td>{ex.equipment.map(eqName).join(', ') || 'בלי'}</td></tr>
                <tr><td>מיקומים</td><td>{ex.locations.map((l) => LOCATION_LABELS[l]).join(', ')}</td></tr>
                <tr><td>שרירים ראשיים</td><td>{muscleNames(ex.primaryMuscles)}</td></tr>
                <tr><td>שרירים משניים</td><td>{muscleNames(ex.secondaryMuscles)}</td></tr>
              </tbody>
            </table>
            <button class="btn block" style={{ marginTop: '12px' }} onClick={() => setEdit(true)}>ערוך תרגיל</button>
          </div>

          {ex.status && (
            <div class="card">
              <h2>שינוי סטטוס ידני</h2>
              <p class="small muted">בדרך כלל הסטטוס משתנה לפי מבחן הפתיחה והצעות ההתקדמות. כאן אפשר לשנות בעצמך.</p>
              <div class="seg">
                {(['red', 'yellow', 'green'] as ExerciseStatus[]).map((s) => (
                  <button key={s} type="button" aria-pressed={s === (pending ?? ex.status)} onClick={() => setPending(s === ex.status ? null : s)}>
                    {STATUS_EMOJI[s]} {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              {pending && (
                <div class="actions">
                  <button class="btn" onClick={() => setPending(null)}>ביטול</button>
                  <button
                    class="btn primary"
                    onClick={async () => {
                      const prev = ex.status!;
                      await setExerciseStatus(ex.id, pending);
                      setPending(null);
                      showToast(`הסטטוס שונה ל-${STATUS_EMOJI[pending]}`, () => setExerciseStatus(ex.id, prev));
                    }}
                  >
                    אשר שינוי ל-{STATUS_EMOJI[pending]}
                  </button>
                </div>
              )}
            </div>
          )}

          {ex.custom && (
            <button
              class="btn danger block"
              onClick={async () => {
                await deleteCustomExercise(ex.id);
                navigate('/workout/library');
                showToast('התרגיל נמחק', () => restoreExercise(ex.id));
              }}
            >
              מחק תרגיל
            </button>
          )}
        </>
      )}
    </div>
  );
}
