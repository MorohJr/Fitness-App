// מבחן פתיחה מודרך (פרק 6)
import { useState } from 'preact/hooks';
import type { Exercise, ExerciseStatus, Injury, LocationId, LocationSetup } from '../../../domain/types';
import { listExercises } from '../../../data/repos/exercises';
import { listInjuries } from '../../../data/repos/injuries';
import { getProfile } from '../../../data/repos/profile';
import { saveTestFamily, type TestSetInput } from '../../../data/repos/workouts';
import { FAMILY_META, STRENGTH_FAMILIES, type FamilyId } from '../../../domain/families';
import { availableAt, ladder, levelIn } from '../../../domain/calc/exercises';
import { evaluateTest, familyReady, familyStatusChanges, testValue, type TestOutcome } from '../../../domain/rules/opening-test';
import { isBlocked } from '../../../domain/rules/R-INJ';
import { useLive } from '../../hooks';
import { LOCATION_LABELS, MEASURE_UNIT, STATUS_EMOJI, STATUS_LABELS } from '../../labels';
import { BackLink, ErrorList, NumberField, Segmented } from '../../components/Fields';
import { StatusDot } from '../../components/ExerciseBits';
import { RestTimer } from '../../components/RestTimer';
import { showToast } from '../../store';

const REST_BETWEEN_TESTS = 120;

/** התרגיל הכי גבוה שמוכן (🟢/🟡) במשפחה */
function best(exs: Exercise[], f: string): Exercise | undefined {
  return ladder(exs, f).filter((e) => e.status === 'green' || e.status === 'yellow').pop();
}

export function OpeningTestScreen() {
  const data = useLive(async () => {
    const [exercises, injuries, profile] = await Promise.all([listExercises(), listInjuries(), getProfile()]);
    return { exercises, injuries, profile };
  });
  const [loc, setLoc] = useState<LocationId>('outdoor');
  const [family, setFamily] = useState<FamilyId | null>(null);
  if (!data?.profile) return null;
  const { exercises, injuries, profile } = data;
  const location = profile.locations.find((l) => l.id === loc)!;
  const ready = STRENGTH_FAMILIES.filter((f) => familyReady(exercises, f)).length;

  if (family) {
    return (
      <FamilyTest
        family={family}
        exercises={exercises}
        injuries={injuries}
        location={location}
        onClose={() => setFamily(null)}
      />
    );
  }

  return (
    <div>
      <BackLink to="/workout" label="אימון" />
      <h1>מבחן פתיחה</h1>
      <p class="muted small">
        לכל משפחה: סט מקסימלי אחד בטכניקה נקייה, מהרמה שנראית לך מתאימה. האפליקציה אומרת אם לעלות רמה או לרדת. אפשר לבדוק כל משפחה בנפרד, בכל יום.
      </p>
      <div class="progress-line"><i style={{ width: `${(ready / STRENGTH_FAMILIES.length) * 100}%` }} /></div>
      <p class="small muted">{ready} מתוך {STRENGTH_FAMILIES.length} משפחות מוכנות</p>
      <Segmented<LocationId>
        label="איפה אתה עכשיו?"
        value={loc}
        options={profile.locations.filter((l) => l.enabled).map((l) => ({ value: l.id, label: LOCATION_LABELS[l.id] }))}
        onChange={setLoc}
      />
      <div class="list">
        {STRENGTH_FAMILIES.map((f) => {
          const b = best(exercises, f);
          const any = ladder(exercises, f).some((e) => availableAt(e, location) && !isBlocked(e, injuries));
          return (
            <a
              key={f}
              href="#/workout/test"
              onClick={(e) => {
                e.preventDefault();
                if (any) setFamily(f);
              }}
              style={any ? undefined : { opacity: 0.45 }}
            >
              <span class="grow">
                {FAMILY_META[f].name}
                <div class="small muted en" style={{ fontWeight: 400 }}>
                  {b ? `${STATUS_EMOJI[b.status!]} ${b.name}` : any ? 'לא נבדק' : `אין תרגיל זמין ב${LOCATION_LABELS[loc]}`}
                </div>
              </span>
              {b && <span class="done">✓</span>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

interface Done {
  exercise: Exercise;
  level: number;
  value: number | null;
  right: number | null;
  left: number | null;
  outcome: TestOutcome;
}

function FamilyTest({ family, exercises, injuries, location, onClose }: { family: FamilyId; exercises: Exercise[]; injuries: Injury[]; location: LocationSetup; onClose: () => void }) {
  const lad = ladder(exercises, family);
  const usable = (e: Exercise) => availableAt(e, location) && !isBlocked(e, injuries);
  const [done, setDone] = useState<Done[]>([]);
  const [current, setCurrent] = useState<Exercise | null>(null);
  const [choices, setChoices] = useState<Exercise[] | null>(null);
  const [val, setVal] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [restFrom, setRestFrom] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const name = FAMILY_META[family].name;
  const last = done[done.length - 1];

  function pick(e: Exercise) {
    setCurrent(e);
    setChoices(null);
    setVal(null);
    setRight(null);
    setLeft(null);
  }

  function record() {
    if (!current) return;
    const v = testValue(right, left, val, current.unilateral);
    if (v === null || v < 0) {
      setErrors([current.unilateral ? 'הזן תוצאה לשני הצדדים' : 'הזן תוצאה']);
      return;
    }
    setErrors([]);
    const level = levelIn(current, family)!;
    const outcome = evaluateTest(exercises, family, { exerciseId: current.id, level, value: v }, current.targetMin, current.targetMax, [...done.map((d) => d.level), level]);
    const next = [...done, { exercise: current, level, value: val, right, left, outcome }];
    setDone(next);
    setCurrent(null);
    if (outcome.next.action === 'done') {
      setFinished(true);
      return;
    }
    const nl = outcome.next.level;
    const options = lad.filter((e) => levelIn(e, family) === nl && usable(e));
    if (!options.length) {
      setFinished(true);
      return;
    }
    setRestFrom(Date.now());
    setChoices(options);
  }

  // סיכום ואישור (E2)
  if (finished) {
    const results = done.map((d) => ({ exerciseId: d.exercise.id, level: d.level, status: d.outcome.status }));
    const changes = familyStatusChanges(exercises, family, results);
    const byId = new Map(exercises.map((e) => [e.id, e]));
    const nextUnavailable = last && last.outcome.next.action !== 'done';
    return (
      <div>
        <h1>{name}: סיכום</h1>
        {nextUnavailable && <div class="alert warn">הרמה הבאה לבדיקה לא זמינה במיקום הזה (ציוד או פציעה). אפשר לבדוק אותה בפעם אחרת.</div>}
        <div class="card">
          <h2>מה נבדק</h2>
          {done.map((d, i) => (
            <div class="rung" key={i}>
              <span class="lvl">{d.level}</span>
              <span class="nm">{d.exercise.name}</span>
              <span class="small num">{d.exercise.unilateral ? `ימין ${d.right} / שמאל ${d.left}` : d.value} {MEASURE_UNIT[d.exercise.measure]}</span>
              <span>{STATUS_EMOJI[d.outcome.status]}</span>
            </div>
          ))}
        </div>
        <div class="card">
          <h2>שינויי סטטוס</h2>
          {Object.keys(changes).length === 0 && <p class="small muted">אין שינויים</p>}
          {Object.entries(changes).map(([id, st]) => {
            const e = byId.get(id)!;
            return (
              <div class="rung" key={id}>
                <span class="nm">{e.name}</span>
                <span>{e.status ? STATUS_EMOJI[e.status] : '•'} ← {STATUS_EMOJI[st as ExerciseStatus]}</span>
              </div>
            );
          })}
        </div>
        <ErrorList errors={errors} />
        <div class="actions">
          <button class="btn" onClick={onClose}>בטל, בלי לשמור</button>
          <button
            class="btn primary"
            onClick={async () => {
              try {
                const sets: TestSetInput[] = done.map((d) => ({ exercise: d.exercise, family, value: d.value, right: d.right, left: d.left, status: d.outcome.status }));
                await saveTestFamily(location.id, sets, changes);
                showToast(`${name}: התוצאות נשמרו`);
                onClose();
              } catch (e) {
                setErrors([(e as Error).message]);
              }
            }}
          >
            אשר ושמור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <a class="back" href="#/workout/test" onClick={(e) => { e.preventDefault(); onClose(); }}>‹ כל המשפחות</a>
      <h1>{name}</h1>

      {last && (
        <div class="card">
          <div class="row">
            <span class="en" style={{ fontWeight: 700 }}>{last.exercise.name}</span>
            <span class="badge accent">{STATUS_EMOJI[last.outcome.status]} {STATUS_LABELS[last.outcome.status]}</span>
          </div>
          <p class="small" style={{ margin: '8px 0 0' }}>{last.outcome.message}</p>
        </div>
      )}

      {restFrom && choices && (
        <div class="card">
          <RestTimer startedAt={restFrom} seconds={REST_BETWEEN_TESTS} />
        </div>
      )}

      {!current && (
        <div class="card">
          <h2>{choices ? 'הבדיקה הבאה' : 'בחר רמה להתחיל ממנה'}</h2>
          {(choices ?? lad).map((e) => {
            const ok = usable(e);
            return (
              <a
                class="rung"
                key={e.id}
                href="#/workout/test"
                style={ok ? undefined : { opacity: 0.4 }}
                onClick={(ev) => {
                  ev.preventDefault();
                  if (ok) pick(e);
                }}
              >
                <span class="lvl">{levelIn(e, family)}</span>
                <span class="nm">{e.name}</span>
                {isBlocked(e, injuries) ? <span class="tag block">⛔</span> : !availableAt(e, location) ? <span class="tag">לא זמין</span> : <StatusDot ex={e} />}
              </a>
            );
          })}
        </div>
      )}

      {current && (
        <div class="card">
          <h2 class="en" style={{ textAlign: 'right' }}>{current.name}</h2>
          <p class="small">
            טווח יעד: <b class="num">{current.targetMin}–{current.targetMax}</b> {MEASURE_UNIT[current.measure]}
            {current.unilateral ? ' לכל צד' : ''}. סט אחד, מקסימום בטכניקה נקייה.
          </p>
          <ul class="cues small">{current.cues.map((c) => <li key={c}>{c}</li>)}</ul>
          {current.unilateral ? (
            <div class="grid2">
              <NumberField label="ימין" value={right} onChange={setRight} suffix={MEASURE_UNIT[current.measure]} min={0} />
              <NumberField label="שמאל" value={left} onChange={setLeft} suffix={MEASURE_UNIT[current.measure]} min={0} />
            </div>
          ) : (
            <NumberField label="תוצאה" value={val} onChange={setVal} suffix={MEASURE_UNIT[current.measure]} min={0} />
          )}
          <ErrorList errors={errors} />
          <div class="actions">
            <button class="btn" onClick={() => setCurrent(null)}>החלף תרגיל</button>
            <button class="btn primary" onClick={record}>שמור תוצאה</button>
          </div>
        </div>
      )}
    </div>
  );
}
