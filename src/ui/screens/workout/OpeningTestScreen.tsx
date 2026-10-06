// מבחן פתיחה כאימון מודרך (פרק 6, R-TST)
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Exercise, ExerciseStatus, Injury, LocationId, LocationSetup } from '../../../domain/types';
import { listExercises } from '../../../data/repos/exercises';
import { listInjuries } from '../../../data/repos/injuries';
import { getProfile } from '../../../data/repos/profile';
import { clearTestSession, confirmTestFamily, getTestSession, saveTestSession } from '../../../data/repos/testSession';
import { FAMILY_META, STRENGTH_FAMILIES, type FamilyId } from '../../../domain/families';
import { availableAt, ladder, levelIn, videoUrl } from '../../../domain/calc/exercises';
import { familyReady } from '../../../domain/rules/opening-test';
import {
  chooseExercise, currentFamily, defaultSelection, nextFamily, recordSet, sessionChanges, sessionDone, startSession, swapOptions, undoLastSet,
  type TestSession, type Usable
} from '../../../domain/rules/R-TST';
import { isBlocked } from '../../../domain/rules/R-INJ';
import { FOUNDATION_FAMILIES } from '../../../domain/rules/R-BEG';
import { useLive } from '../../hooks';
import { LOCATION_LABELS, MEASURE_UNIT, STATUS_EMOJI, STATUS_LABELS } from '../../labels';
import { BackLink, ErrorList, NumberField, Segmented } from '../../components/Fields';
import { StatusDot } from '../../components/ExerciseBits';
import { navigate } from '../../router';
import { showToast } from '../../store';
import { beep, keepAwake, rearmOnVisible, unlockAudio } from '../../device';

/** הערכה גסה לתכנון: כ-4 דקות למשפחה (סט או שניים ומנוחה) */
const MIN_PER_FAMILY = 4;
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

const usableAt = (location: LocationSetup | undefined, injuries: Injury[]): Usable => (e) => !!location && availableAt(e, location) && !isBlocked(e, injuries);

/** foundation = בדיקת הרמה של תוכנית היסודות (R-TST-8) */
export function OpeningTestScreen({ foundation = false }: { foundation?: boolean }) {
  const data = useLive(async () => {
    const [exercises, injuries, profile] = await Promise.all([listExercises(), listInjuries(), getProfile()]);
    const session = await getTestSession(exercises);
    return { exercises, injuries, profile, session };
  });
  if (!data?.profile) return null;
  const { exercises, injuries, profile, session } = data;
  if (session) {
    const location = profile.locations.find((l) => l.id === session.location);
    return <TestRun s={session} exercises={exercises} usable={usableAt(location, injuries)} injuries={injuries} />;
  }
  return <TestSetup foundation={foundation} exercises={exercises} injuries={injuries} locations={profile.locations} />;
}

// R-TST-1: מיקום ובחירת משפחות
function TestSetup({ foundation, exercises, injuries, locations }: { foundation: boolean; exercises: Exercise[]; injuries: Injury[]; locations: LocationSetup[] }) {
  const FAMS = foundation ? FOUNDATION_FAMILIES : STRENGTH_FAMILIES;
  const enabled = locations.filter((l) => l.enabled);
  const [loc, setLoc] = useState<LocationId>(enabled[0]?.id ?? 'outdoor');
  const location = locations.find((l) => l.id === loc);
  const usable = usableAt(location, injuries);
  const [picked, setPicked] = useState<FamilyId[] | null>(null);
  const selected = picked ?? defaultSelection(exercises, FAMS, usable);
  const ready = FAMS.filter((f) => familyReady(exercises, f)).length;

  function toggle(f: FamilyId) {
    setPicked(selected.includes(f) ? selected.filter((x) => x !== f) : [...selected, f]);
  }

  async function start() {
    unlockAudio();
    await saveTestSession(startSession({ exercises, families: selected, location: loc, foundation, usable, now: Date.now() }));
    window.scrollTo(0, 0);
  }

  return (
    <div>
      {foundation ? <BackLink to="/workout/foundation" label="תוכנית יסודות" /> : <BackLink to="/workout" label="אימון" />}
      <h1>{foundation ? 'בדיקת רמה' : 'מבחן פתיחה'}</h1>
      <p class="muted small">
        בכל משפחה עושים סט אחד, כמה שיוצא בטכניקה נקייה. האפליקציה אומרת מה לבדוק אחר כך, מפעילה טיימר מנוחה, ובסוף כל משפחה מראה מה משתנה. אפשר לעצור באמצע ולהמשיך בפעם אחרת.
      </p>
      <div class="progress-line"><i style={{ width: `${(ready / FAMS.length) * 100}%` }} /></div>
      <p class="small muted">{ready} מתוך {FAMS.length} משפחות כבר נבדקו</p>

      <Segmented<LocationId>
        label="איפה אתה עכשיו?"
        value={loc}
        options={enabled.map((l) => ({ value: l.id, label: LOCATION_LABELS[l.id] }))}
        onChange={(v) => {
          setLoc(v);
          setPicked(null);
        }}
      />

      <div class="card">
        <h2>מה בודקים היום</h2>
        {FAMS.map((f) => {
          const lad = ladder(exercises, f);
          const any = lad.some(usable);
          const best = lad.filter((e) => e.status === 'green' || e.status === 'yellow').pop();
          return (
            <label class="check-row" key={f} style={any ? undefined : { opacity: 0.45 }}>
              <input type="checkbox" checked={selected.includes(f)} disabled={!any} onChange={() => toggle(f)} />
              <span class="grow">
                {FAMILY_META[f].name}
                <div class="small muted en">
                  {!any ? `אין תרגיל זמין ב${LOCATION_LABELS[loc]}` : best ? `${STATUS_EMOJI[best.status!]} ${best.name} · בדיקה חוזרת` : 'לא נבדק'}
                </div>
              </span>
            </label>
          );
        })}
      </div>

      <button class="btn primary block" disabled={!selected.length} onClick={start}>
        {selected.length ? `התחל: ${selected.length} משפחות, כ-${selected.length * MIN_PER_FAMILY} דקות` : 'בחר לפחות משפחה אחת'}
      </button>
      {selected.length > 8 && <p class="small muted">ארוך? אפשר לבחור חלק עכשיו ואת השאר ביום אחר.</p>}
    </div>
  );
}

// R-TST-7: טיימר כולל, התקדמות ומנוחה
function TestBar({ s }: { s: TestSession }) {
  const [now, setNow] = useState(Date.now());
  const signaled = useRef<number | null>(null);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  const restLeft = s.restEndsAt ? Math.ceil((s.restEndsAt - now) / 1000) : null;
  useEffect(() => {
    // סוף מנוחה: הבהוב וצליל (3.6), מחושב משעת הסיום גם אחרי נעילת מסך
    if (s.restEndsAt && restLeft !== null && restLeft <= 0 && signaled.current !== s.restEndsAt) {
      signaled.current = s.restEndsAt;
      if (now - s.restEndsAt < 60_000) {
        setFlash(Date.now());
        beep();
      }
      saveTestSession({ ...s, restEndsAt: null });
    }
  }, [restLeft, s.restEndsAt]);
  const total = s.families.length;
  const pos = Math.min(s.index + 1, total);
  return (
    <div class="runbar">
      <div class="row">
        <div>
          <div class="label">זמן מבחן</div>
          <div class="timer">{mmss((now - s.startedAt) / 1000)}</div>
        </div>
        <span class="badge">משפחה {pos} מתוך {total}</span>
      </div>
      <div class="progress-line" style={{ marginTop: '8px' }}><i style={{ width: `${(s.index / total) * 100}%` }} /></div>
      {restLeft !== null && restLeft > 0 && (
        <div class="rest" role="timer" aria-live="polite">
          <span>מנוחה</span>
          <span class="timer">{mmss(restLeft)}</span>
          <span>
            <button onClick={() => saveTestSession({ ...s, restEndsAt: s.restEndsAt! + 30_000 })}>+30</button>{' '}
            <button onClick={() => saveTestSession({ ...s, restEndsAt: null })}>דלג</button>
          </span>
        </div>
      )}
      {flash ? <div class="flash" key={flash} /> : null}
    </div>
  );
}

function TestRun({ s, exercises, usable, injuries }: { s: TestSession; exercises: Exercise[]; usable: Usable; injuries: Injury[] }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [ending, setEnding] = useState(false);
  useEffect(() => {
    keepAwake(true);
    const off = rearmOnVisible();
    return () => {
      off();
      keepAwake(false);
    };
  }, []);

  const back = s.foundation ? '/workout/foundation' : '/workout';
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    unlockAudio();
    setBusy(true);
    setErrors([]);
    try {
      await fn();
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    await clearTestSession();
    navigate(back);
  }

  if (sessionDone(s)) {
    const name = (f: FamilyId) => FAMILY_META[f].name;
    return (
      <div>
        <h1>{s.foundation ? 'בדיקת הרמה הסתיימה' : 'המבחן הסתיים'}</h1>
        <div class="card">
          <div class="big"><span class="v" style={{ fontSize: '2.6rem' }}>{s.confirmed.length}</span><span class="of">משפחות נבדקו ונשמרו</span></div>
          {s.confirmed.length > 0 && <p class="small">{s.confirmed.map(name).join(', ')}</p>}
          {s.skipped.length > 0 && <p class="small muted">דולגו (אפשר לבדוק בפעם אחרת): {s.skipped.map(name).join(', ')}</p>}
          <p class="small muted">זמן כולל: {mmss((Date.now() - s.startedAt) / 1000)}</p>
        </div>
        <button class="btn primary block" onClick={() => act(finish)}>סיום</button>
      </div>
    );
  }

  const family = currentFamily(s)!;
  const famName = FAMILY_META[family].name;
  const last = s.sets[s.sets.length - 1];
  const byId = new Map(exercises.map((e) => [e.id, e]));

  return (
    <div>
      <TestBar s={s} />
      <div class="eyebrow">{s.foundation ? 'בדיקת רמה' : 'מבחן פתיחה'}</div>
      <h1 style={{ marginBottom: '8px' }}>{famName}</h1>

      {s.phase === 'review' ? (
        <FamilyReview s={s} exercises={exercises} byId={byId} busy={busy}
          onConfirm={() => act(async () => {
            await confirmTestFamily(s, exercises, usable, Date.now());
            showToast(`${famName}: נשמר`);
            window.scrollTo(0, 0);
          })}
          onCancel={() => act(async () => {
            await saveTestSession(nextFamily(s, exercises, usable, false, Date.now()));
            window.scrollTo(0, 0);
          })}
        />
      ) : (
        <>
          {last && (
            <div class="card">
              <div class="row">
                <span class="en" style={{ fontWeight: 700 }}>{byId.get(last.exerciseId)?.name}</span>
                <span class="badge accent">{STATUS_EMOJI[last.status]} {STATUS_LABELS[last.status]}</span>
              </div>
              <p class="small" style={{ margin: '8px 0 0' }}>{last.message}</p>
            </div>
          )}
          {s.current ? (
            <CurrentTest key={`${s.current}-${s.sets.length}`} s={s} ex={byId.get(s.current)!} family={family} exercises={exercises} injuries={injuries} usable={usable} busy={busy} act={act} />
          ) : (
            <div class="card">
              <p>אין במשפחה הזו תרגיל שזמין במיקום הזה (ציוד או פציעה).</p>
            </div>
          )}
          <button class="btn block" style={{ marginTop: '8px' }} disabled={busy} onClick={() => act(async () => {
            await saveTestSession(nextFamily({ ...s, sets: [] }, exercises, usable, false, Date.now()));
            window.scrollTo(0, 0);
          })}>
            דלג על {famName}
          </button>
        </>
      )}

      <ErrorList errors={errors} />
      <div class="card" style={{ marginTop: '16px' }}>
        {!ending ? (
          <button class="btn danger block" onClick={() => setEnding(true)}>סיים את המבחן עכשיו</button>
        ) : (
          <>
            <p class="small">משפחות שאישרת כבר שמורות ({s.confirmed.length}). {s.sets.length ? `מה שנבדק ב${famName} ועוד לא אושר לא יישמר.` : ''}</p>
            <div class="actions">
              <button class="btn" onClick={() => setEnding(false)}>המשך במבחן</button>
              <button class="btn danger" onClick={() => act(finish)}>סיים</button>
            </div>
          </>
        )}
      </div>
      <p class="small muted">המסך נשאר דלוק. אפשר לצאת לפרטים או לסרטון ולחזור, המבחן ממשיך מאותה נקודה.</p>
    </div>
  );
}

function CurrentTest({ s, ex, family, exercises, injuries, usable, busy, act }: {
  s: TestSession; ex: Exercise; family: FamilyId; exercises: Exercise[]; injuries: Injury[]; usable: Usable; busy: boolean; act: (fn: () => Promise<void>) => void;
}) {
  const [val, setVal] = useState<number | null>(null);
  const [right, setRight] = useState<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCues, setShowCues] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const unit = MEASURE_UNIT[ex.measure];
  const first = s.sets.length === 0;

  function save() {
    const r = recordSet(s, exercises, usable, { value: val, right, left }, Date.now());
    if ('error' in r) {
      setErr(r.error);
      return;
    }
    act(async () => {
      await saveTestSession(r);
      window.scrollTo(0, 0);
    });
  }

  return (
    <div class="card">
      <div class="label">{first ? 'הבדיקה הראשונה' : `בדיקה ${s.sets.length + 1}`} · רמה {levelIn(ex, family)}</div>
      <div class="row" style={{ marginTop: '4px' }}>
        <h2 class="en" style={{ margin: 0, fontSize: '1.3rem', color: 'var(--text)', textAlign: 'right' }}>{ex.name}</h2>
        <StatusDot ex={ex} />
      </div>
      <p class="small" style={{ margin: '8px 0' }}>
        טווח יעד: <b class="num">{ex.targetMin}–{ex.targetMax}</b> {unit}{ex.unilateral ? ' לכל צד' : ''}. סט אחד, מקסימום בטכניקה נקייה.
      </p>
      {first && <p class="small muted" style={{ margin: '0 0 8px' }}>{s.foundation ? 'מתחילים מהרמה הכי קלה שזמינה כאן.' : 'זו ההצעה להתחלה. נראה לך קל או קשה מדי? "החלף תרגיל".'}</p>}

      <div class="actions" style={{ marginTop: 0 }}>
        <button class="btn" onClick={() => setShowCues(!showCues)}>{showCues ? 'הסתר דגשים' : 'דגשי טכניקה'}</button>
        <a class="btn" href={videoUrl(ex)} target="_blank" rel="noopener">▶ סרטון</a>
        <a class="btn" href={`#/workout/exercise/${ex.id}`}>פרטים</a>
      </div>
      {showCues && <ul class="cues small" style={{ marginTop: '10px' }}>{ex.cues.map((c) => <li key={c}>{c}</li>)}{ex.safety && <li>⚠️ {ex.safety}</li>}</ul>}

      <div style={{ marginTop: '12px' }}>
        {ex.unilateral ? (
          <div class="grid2">
            <NumberField label="ימין" value={right} onChange={setRight} suffix={unit} min={0} />
            <NumberField label="שמאל" value={left} onChange={setLeft} suffix={unit} min={0} />
          </div>
        ) : (
          <NumberField label={ex.measure === 'time' ? 'כמה שניות החזקת?' : 'כמה חזרות יצאו?'} value={val} onChange={setVal} suffix={unit} min={0} />
        )}
      </div>
      {err && <div class="alert danger" role="alert">{err}</div>}
      <button class="btn primary block" disabled={busy} onClick={save}>✓ שמור תוצאה</button>

      <div class="actions">
        <button class="btn" onClick={() => setSwapping(!swapping)}>{swapping ? 'סגור' : 'החלף תרגיל'}</button>
        {!first && <button class="btn" disabled={busy} onClick={() => act(() => saveTestSession(undoLastSet(s)))}>מחק סט אחרון</button>}
      </div>
      {swapping && (
        <div style={{ marginTop: '8px' }}>
          {swapOptions(s, exercises).map((e) => {
            const ok = usable(e);
            return (
              <button
                type="button"
                class="rung"
                key={e.id}
                disabled={!ok}
                aria-current={e.id === ex.id ? 'true' : undefined}
                style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--border)', color: 'inherit', font: 'inherit', opacity: ok ? 1 : 0.4 }}
                onClick={() => act(() => saveTestSession(chooseExercise(s, e.id)))}
              >
                <span class="lvl">{levelIn(e, family)}</span>
                <span class="nm">{e.name}{e.id === ex.id ? ' ✓' : ''}</span>
                {isBlocked(e, injuries) ? <span class="tag block">⛔</span> : !ok ? <span class="tag">לא זמין</span> : <StatusDot ex={e} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// R-TST-5: סיכום ואישור (E2)
function FamilyReview({ s, exercises, byId, busy, onConfirm, onCancel }: {
  s: TestSession; exercises: Exercise[]; byId: Map<string, Exercise>; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const changes = sessionChanges(s, exercises);
  const more = s.index + 1 < s.families.length;
  return (
    <>
      {s.nextUnavailable && <div class="alert warn">הרמה הבאה לבדיקה לא זמינה במיקום הזה (ציוד או פציעה). אפשר לבדוק אותה בפעם אחרת.</div>}
      <div class="card">
        <h2>מה נבדק</h2>
        {s.sets.map((d, i) => {
          const e = byId.get(d.exerciseId)!;
          return (
            <div class="rung" key={i}>
              <span class="lvl">{d.level}</span>
              <span class="nm">{e.name}</span>
              <span class="small num">{e.unilateral ? `ימין ${d.right} / שמאל ${d.left}` : d.value} {MEASURE_UNIT[e.measure]}</span>
              <span>{STATUS_EMOJI[d.status]}</span>
            </div>
          );
        })}
      </div>
      <div class="card">
        <h2>מה משתנה</h2>
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
      <button class="btn primary block" disabled={busy} onClick={onConfirm}>{more ? 'אשר והמשך למשפחה הבאה' : 'אשר וסיים'}</button>
      <button class="btn block" style={{ marginTop: '8px' }} disabled={busy} onClick={onCancel}>בטל את המשפחה, בלי לשמור</button>
    </>
  );
}
