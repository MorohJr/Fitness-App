// סיכום אימון: מה בוצע, הושג או לא, והצעות חדשות
import type { Workout } from '../../../domain/types';
import { getWorkout, listSets, listWorkoutExercises } from '../../../data/repos/workouts';
import { listExercises } from '../../../data/repos/exercises';
import { evaluate } from '../../../domain/rules/R-PRG';
import { setValues } from '../../../domain/engine/history';
import { formatDate } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { DAY_TYPE_LABELS, LOCATION_LABELS, MEASURE_UNIT, STATUS_EMOJI, STATUS_LABELS } from '../../labels';
import { BackLink } from '../../components/Fields';
import { SuggestionsList } from '../../components/Suggestions';

const OUT = { achieved: '✓ היעד הושג', missed: '✗ מתחת לטווח', inRange: 'בתוך הטווח' };

export function WorkoutSummary({ id }: { id: string }) {
  const data = useLive(async () => {
    const w = await getWorkout(id);
    if (!w) return { w: null as Workout | null };
    const wes = await listWorkoutExercises(id);
    const [sets, exs] = await Promise.all([listSets(wes.map((x) => x.id)), listExercises()]);
    return { w, wes, sets, exs: new Map(exs.map((e) => [e.id, e])) };
  }, [id]);
  if (!data) return null;
  if (!data.w) return <div><BackLink to="/workout" label="אימון" /><p>האימון לא נמצא.</p></div>;
  const { w, wes, sets, exs } = data;
  const dur = w.startedAt && w.endedAt ? Math.round((new Date(w.endedAt).getTime() - new Date(w.startedAt).getTime()) / 60000) : null;
  const ids = new Set(wes!.map((x) => x.exerciseId));
  return (
    <div>
      <BackLink to="/workout" label="אימון" />
      <h1>{w.templateName ?? DAY_TYPE_LABELS[w.dayType ?? 'training']}</h1>
      <p class="muted">
        {formatDate(w.date)} · {LOCATION_LABELS[w.location]}{dur !== null ? ` · ${dur} דק'` : ''}{w.feeling ? ` · תחושה ${w.feeling}/10` : ''}{w.isDeload ? ' · הורדת עומס' : ''}
        {w.status === 'skipped' ? ' · דולג' : ''}
      </p>
      <SuggestionsList filter={(s) => !!s.refId && ids.has(s.refId)} />
      {wes!.map((we) => {
        const ex = exs!.get(we.exerciseId);
        const own = sets!.filter((s) => s.workoutExerciseId === we.id);
        const vals = ex ? setValues(own.map((s) => ({ setNumber: s.setNumber, side: s.side, reps: s.reps, seconds: s.seconds, load: s.load, rpe: s.rpe })), ex.measure, ex.unilateral) : [];
        const out = ex && own.length && we.role === 'work' ? evaluate(ex, { sets: own, targetMin: we.targetMin, targetMax: we.targetMax }) : null;
        return (
          <div class="card" key={we.id}>
            <div class="row">
              <strong class="en">{we.exerciseName}</strong>
              {w.kind === 'test' && we.statusAtTime ? <span class="badge accent">{STATUS_EMOJI[we.statusAtTime]} {STATUS_LABELS[we.statusAtTime]}</span> : we.role === 'technique' ? <span class="tag">טכניקה</span> : out ? <span class={`badge${out === 'achieved' ? ' accent' : out === 'missed' ? ' warn' : ''}`}>{OUT[out]}</span> : <span class="badge">לא בוצע</span>}
            </div>
            <p class="small muted" style={{ margin: '6px 0 0' }}>
              יעד {we.targetToday} · בוצע: <span class="num">{vals.map((v) => v.value).join(', ') || '—'}</span> {ex ? MEASURE_UNIT[ex.measure] : ''}
              {vals.length && w.kind !== 'test' ? ` · RPE ${vals.map((v) => v.rpe ?? '—').join(', ')}` : ''}
            </p>
          </div>
        );
      })}
      {w.notes && <div class="card"><h2>הערות</h2><p>{w.notes}</p></div>}
    </div>
  );
}
