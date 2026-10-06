// מבחן פתיחה בתוך מצב הביצוע הרגיל (R-TST-4 עד R-TST-6)
import { useState } from 'preact/hooks';
import type { Exercise, ExerciseStatus, SetLog, Workout, WorkoutExercise } from '../../../domain/types';
import { deleteTestSet, finishTest, logTestSet, swapTestExercise, testReview } from '../../../data/repos/testWorkout';
import { cancelWorkout, restoreWorkout } from '../../../data/repos/workouts';
import { FAMILY_META, type FamilyId } from '../../../domain/families';
import { ladder, levelIn, videoUrl } from '../../../domain/calc/exercises';
import { useLive } from '../../hooks';
import { MEASURE_UNIT, STATUS_EMOJI, STATUS_LABELS } from '../../labels';
import { StatusDot } from '../../components/ExerciseBits';
import { navigate } from '../../router';
import { showToast } from '../../store';
import { unlockAudio } from '../../device';

const famName = (f: string) => FAMILY_META[f as FamilyId]?.name ?? f;

/** תרגיל אחד במבחן: סט מקסימלי אחד, בלי RPE */
export function TestExerciseRun({ we, ex, sets, exercises, usable, onDone }: {
  we: WorkoutExercise; ex: Exercise; sets: SetLog[]; exercises: Exercise[]; usable: (e: Exercise) => boolean; onDone: (added: boolean) => void;
}) {
  const unit = MEASURE_UNIT[ex.measure];
  const done = sets.length > 0;
  const [val, setVal] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCues, setShowCues] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const num = (e: Event) => {
    const t = (e.currentTarget as HTMLInputElement).value;
    return t.trim() === '' ? null : Number(t);
  };

  async function save() {
    unlockAudio();
    setBusy(true);
    setErr(null);
    try {
      const r = await logTestSet(we.id, ex.unilateral ? { value: null, right: val, left } : { value: val, right: null, left: null });
      showToast(`${STATUS_EMOJI[r.status]} ${STATUS_LABELS[r.status]}${r.added ? ': עוברים לרמה נוספת' : ''}`);
      onDone(r.added);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div class="card">
      <div class="label">{famName(we.family)} · רמה {we.level}</div>
      <div class="row" style={{ marginTop: '4px' }}>
        <h2 class="en" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)', textAlign: 'right' }}>{ex.name}</h2>
        <span class="badge accent">{we.targetToday}</span>
      </div>
      <p class="small muted" style={{ margin: '6px 0' }}>
        טווח יעד {we.targetMin}–{we.targetMax} {unit}{ex.unilateral ? ' לכל צד' : ''} · קצב {we.tempo} · כמה שיוצא בטכניקה נקייה
      </p>
      <div class="actions" style={{ marginTop: 0 }}>
        <button class="btn" onClick={() => setShowCues(!showCues)}>{showCues ? 'הסתר דגשים' : 'דגשי טכניקה'}</button>
        <a class="btn" href={videoUrl(ex)} target="_blank" rel="noopener">▶ סרטון</a>
        <a class="btn" href={`#/workout/exercise/${ex.id}`}>פרטים</a>
      </div>
      {showCues && <ul class="cues small" style={{ marginTop: '10px' }}>{ex.cues.map((c) => <li key={c}>{c}</li>)}{ex.safety && <li>⚠️ {ex.safety}</li>}</ul>}

      {done ? (
        <>
          <div class="setrow done" style={{ marginTop: '10px' }}>
            <span class="n">1</span>
            <span class="num">
              {sets.map((s) => `${s.side === 'right' ? 'ימין ' : s.side === 'left' ? 'שמאל ' : ''}${ex.measure === 'time' ? s.seconds : s.reps}`).join(' / ')} {unit}
            </span>
            <button class="icon-btn" aria-label="מחק את הסט" onClick={async () => { await deleteTestSet(we.id); showToast('הסט נמחק'); }}>✕</button>
          </div>
          {we.statusAtTime && (
            <div class="alert" style={{ marginTop: '10px' }} role="status">
              <b>{STATUS_EMOJI[we.statusAtTime]} {STATUS_LABELS[we.statusAtTime]}</b>
              {we.note ? <div class="small" style={{ marginTop: '4px' }}>{we.note}</div> : null}
            </div>
          )}
        </>
      ) : (
        <div style={{ marginTop: '10px' }}>
          <div class="label" style={{ marginBottom: '6px' }}>סט מקסימלי</div>
          <div class="grid2">
            <label class="field">
              <span class="label">{ex.unilateral ? 'ימין' : ex.measure === 'time' ? 'שניות' : 'חזרות'}</span>
              <input class="input" type="number" inputMode="numeric" min={0} value={val ?? ''} onInput={(e) => setVal(num(e))} />
            </label>
            {ex.unilateral && (
              <label class="field">
                <span class="label">שמאל</span>
                <input class="input" type="number" inputMode="numeric" min={0} value={left ?? ''} onInput={(e) => setLeft(num(e))} />
              </label>
            )}
          </div>
          {err && <div class="alert danger" role="alert">{err}</div>}
          <button class="btn primary block" disabled={busy} onClick={save}>✓ שמור סט</button>
          <button class="btn block" style={{ marginTop: '8px' }} onClick={() => setSwapping(!swapping)}>{swapping ? 'סגור' : 'החלף תרגיל (קל או קשה יותר)'}</button>
          {swapping && (
            <div style={{ marginTop: '8px' }}>
              {ladder(exercises, we.family).map((e) => {
                const ok = usable(e);
                return (
                  <button
                    type="button"
                    class="rung"
                    key={e.id}
                    disabled={!ok}
                    aria-current={e.id === ex.id ? 'true' : undefined}
                    style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--border)', color: 'inherit', font: 'inherit', opacity: ok ? 1 : 0.4 }}
                    onClick={async () => {
                      await swapTestExercise(we.id, e.id);
                      setSwapping(false);
                    }}
                  >
                    <span class="lvl">{levelIn(e, we.family)}</span>
                    <span class="nm">{e.name}{e.id === ex.id ? ' ✓' : ''}</span>
                    {ok ? <StatusDot ex={e} /> : <span class="tag">לא זמין</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** לשונית סיום במבחן: אישור לכל משפחה (R-TST-6, E2) */
export function TestFinish({ w, exs }: { w: Workout; exs: Map<string, Exercise> }) {
  const review = useLive(() => testReview(w.id), [w.id, w.updatedAt]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  if (!review) return null;
  const tested = review.filter((r) => r.tried.some((t) => t.sets.length));
  const untested = review.filter((r) => !r.tried.some((t) => t.sets.length));
  const back = (w.plan as { foundation?: boolean } | undefined)?.foundation ? '/workout/foundation' : '/workout';

  return (
    <div>
      <div class="card">
        <h2>סיום המבחן</h2>
        <p class="small muted">נבדקו {tested.length} מתוך {review.length} משפחות. סמן אילו שינויים לאשר.</p>
      </div>
      {tested.map((r) => {
        const on = !rejected.includes(r.family);
        return (
          <div class="card" key={r.family}>
            <label class="check-row" style={{ borderBottom: 0 }}>
              <input type="checkbox" checked={on} onChange={() => setRejected(on ? [...rejected, r.family] : rejected.filter((f) => f !== r.family))} />
              <span class="grow" style={{ fontWeight: 700 }}>{famName(r.family)}</span>
              <span class="small muted">{on ? 'אשר' : 'לא לשמור'}</span>
            </label>
            {r.tried.filter((t) => t.sets.length).map((t) => {
              const ex = exs.get(t.we.exerciseId);
              const unit = ex ? MEASURE_UNIT[ex.measure] : '';
              return (
                <div class="rung" key={t.we.id}>
                  <span class="lvl">{t.we.level}</span>
                  <span class="nm">{t.we.exerciseName}</span>
                  <span class="small num">{t.sets.map((s) => (ex?.measure === 'time' ? s.seconds : s.reps)).join(' / ')} {unit}</span>
                  <span>{t.we.statusAtTime ? STATUS_EMOJI[t.we.statusAtTime] : ''}</span>
                </div>
              );
            })}
            <div class="small" style={{ marginTop: '8px' }}>
              {Object.keys(r.changes).length === 0 ? <span class="muted">אין שינוי בסטטוס</span> : (
                Object.entries(r.changes).map(([id, st]) => {
                  const e = exs.get(id);
                  return <div key={id}><span class="en">{e?.name}</span>: {e?.status ? STATUS_EMOJI[e.status] : '•'} ← {STATUS_EMOJI[st as ExerciseStatus]}</div>;
                })
              )}
            </div>
          </div>
        );
      })}
      {untested.length > 0 && <p class="small muted">לא נבדקו (נשארות לפעם אחרת): {untested.map((r) => famName(r.family)).join(', ')}</p>}
      <div class="card">
        <label class="field">
          <span class="label">הערות</span>
          <textarea class="input" value={notes} onInput={(e) => setNotes((e.currentTarget as HTMLTextAreaElement).value)} />
        </label>
        <button
          class="btn primary block"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await finishTest(w.id, tested.map((r) => r.family).filter((f) => !rejected.includes(f)), notes);
            navigate(`/workout/summary/${w.id}`);
            showToast('המבחן נשמר');
          }}
        >
          שמור וסיים
        </button>
        <button
          class="btn danger block"
          style={{ marginTop: '10px' }}
          onClick={async () => {
            await cancelWorkout(w.id);
            navigate(back);
            showToast('המבחן בוטל, בלי שינויים', () => restoreWorkout(w.id));
          }}
        >
          בטל מבחן (בלי לשמור)
        </button>
      </div>
    </div>
  );
}
