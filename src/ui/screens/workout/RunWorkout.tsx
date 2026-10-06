// מצב ביצוע (פרק 7): תרגיל אחרי תרגיל, סטים, מנוחה, טיימר כולל, מסך דלוק
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Exercise, SetLog, Workout, WorkoutExercise } from '../../../domain/types';
import type { PlannedBlock } from '../../../domain/engine/buildWorkout';
import { activeWorkout, cancelWorkout, deleteSet, finishWorkout, getHistory, listSets, listWorkoutExercises, logSet, restoreSet, restoreWorkout, setBlockMinutes, setRestEnd } from '../../../data/repos/workouts';
import { listExercises } from '../../../data/repos/exercises';
import { setValues } from '../../../domain/engine/history';
import { videoUrl } from '../../../domain/calc/exercises';
import { useLive } from '../../hooks';
import { MEASURE_UNIT } from '../../labels';
import { ScaleField } from '../../components/Fields';
import { navigate } from '../../router';
import { showToast } from '../../store';
import { beep, keepAwake, rearmOnVisible, unlockAudio } from '../../device';
import { listInjuries } from '../../../data/repos/injuries';
import { getProfile } from '../../../data/repos/profile';
import { usableAt } from '../../../data/repos/testWorkout';
import { TestExerciseRun, TestFinish } from './TestRun';

const TOTAL_LIMIT_MIN = 90;
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`;

function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, []);
  return now;
}

function RunBar({ w }: { w: Workout }) {
  const now = useNow();
  const signaled = useRef<number | null>(null);
  const [flash, setFlash] = useState(0);
  const elapsed = (now - new Date(w.startedAt!).getTime()) / 1000;
  // המגבלה נשמרה עם האימון (60 ביסודות, R-BEG-4). אימונים ישנים: 90
  const limitMin = Math.round(((w.plan as { totalLimitSec?: number } | undefined)?.totalLimitSec ?? TOTAL_LIMIT_MIN * 60) / 60);
  const restLeft = w.restEndsAt ? Math.ceil((w.restEndsAt - now) / 1000) : null;
  useEffect(() => {
    // סיום מנוחה: הבהוב על כל המסך וצליל קצר (3.6). מחושב משעת הסיום, גם אחרי נעילת מסך
    if (w.restEndsAt && restLeft !== null && restLeft <= 0 && signaled.current !== w.restEndsAt) {
      signaled.current = w.restEndsAt;
      if (now - w.restEndsAt < 60_000) {
        setFlash(Date.now());
        beep();
      }
      setRestEnd(w.id, null);
    }
  }, [restLeft, w.restEndsAt]);
  return (
    <div class="runbar">
      <div class="row">
        <div>
          <div class="label">זמן אימון</div>
          <div class="timer" style={elapsed > limitMin * 60 ? { color: 'var(--warn)' } : undefined}>{mmss(elapsed)} <span class="small muted">/ {limitMin}:00</span></div>
        </div>
        <span class="badge">{w.templateName ?? 'התאוששות'}{w.isDeload ? ' · הורדת עומס' : ''}</span>
      </div>
      {restLeft !== null && restLeft > 0 && (
        <div class="rest" role="timer" aria-live="polite">
          <span>מנוחה</span>
          <span class="timer">{mmss(restLeft)}</span>
          <span>
            <button onClick={() => setRestEnd(w.id, w.restEndsAt! + 30_000)}>+30</button>{' '}
            <button onClick={() => setRestEnd(w.id, null)}>דלג</button>
          </span>
        </div>
      )}
      {flash ? <div class="flash" key={flash} /> : null}
    </div>
  );
}

function BlockView({ w, b }: { w: Workout; b: PlannedBlock }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const now = useNow(1000);
  const done = w.blockMinutes[b.key] !== undefined;
  return (
    <div class="card">
      <div class="row">
        <h2 style={{ margin: 0 }}>{b.title}</h2>
        <span class="badge">{b.minutes} דק'</span>
      </div>
      {b.key === 'meditation' && <p class="small" style={{ marginTop: '8px' }}>שב בנוחות, עיניים סגורות. שאיפה מהאף 4 שניות, עצירה 4, נשיפה איטית 6. חזור עד שהטיימר מסתיים.</p>}
      <div style={{ marginTop: '8px' }}>
        {b.items.map((it, i) => (
          <label class="check-row" key={i}>
            <input type="checkbox" checked={!!checked[i]} onChange={(e) => setChecked({ ...checked, [i]: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="grow">
              <span class="en" style={{ fontWeight: 600 }}>{it.name}</span>
              <div class="small muted">{it.detail}</div>
            </span>
            {it.exerciseId && <a class="small" href={`#/workout/exercise/${it.exerciseId}`}>פרטים</a>}
          </label>
        ))}
      </div>
      {startedAt && !done && <div class="timer" style={{ fontSize: '2rem', margin: '8px 0' }}>{mmss(Math.max(0, b.minutes * 60 - (now - startedAt) / 1000))}</div>}
      {done ? (
        <p class="small" style={{ marginTop: '8px' }}>✓ הושלם ({w.blockMinutes[b.key]} דק')</p>
      ) : (
        <div class="actions">
          {!startedAt && <button class="btn" onClick={() => setStartedAt(Date.now())}>התחל טיימר</button>}
          <button class="btn primary" onClick={() => setBlockMinutes(w.id, b.key, startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : b.minutes)}>סיימתי את הבלוק</button>
        </div>
      )}
    </div>
  );
}

function ExerciseRun({ w, we, ex, sets, lastText, lastLoad }: { w: Workout; we: WorkoutExercise; ex: Exercise; sets: SetLog[]; lastText: string | null; lastLoad: string | null }) {
  const isTime = ex.measure === 'time';
  const unit = MEASURE_UNIT[ex.measure];
  const byNum = new Map<number, SetLog[]>();
  for (const s of sets) byNum.set(s.setNumber, [...(byNum.get(s.setNumber) ?? []), s]);
  const doneCount = byNum.size;
  const nextNum = Math.max(0, ...byNum.keys()) + 1;
  const [val, setVal] = useState<number | null>(we.targetValue ?? we.targetMin);
  const [left, setLeft] = useState<number | null>(we.targetValue ?? we.targetMin);
  const [load, setLoad] = useState<string>(lastLoad ?? ex.currentLoad ?? '');
  const [rpe, setRpe] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCues, setShowCues] = useState(false);

  async function save() {
    unlockAudio();
    if (we.role === 'work' && rpe === null) {
      setErr('בחר RPE (חובה בכל סט עבודה)');
      return;
    }
    setErr(null);
    const mk = (v: number | null) => (isTime ? { reps: null, seconds: v } : { reps: v, seconds: null });
    try {
      const ids: string[] = [];
      if (ex.unilateral) {
        ids.push((await logSet(we.id, { setNumber: nextNum, side: 'right', ...mk(val), load: load || null, rpe })).id);
        ids.push((await logSet(we.id, { setNumber: nextNum, side: 'left', ...mk(left), load: load || null, rpe })).id);
      } else ids.push((await logSet(we.id, { setNumber: nextNum, side: 'none', ...mk(val), load: load || null, rpe })).id);
      if (nextNum < we.targetSets) await setRestEnd(w.id, Date.now() + (we.restSec ?? ex.restSec) * 1000);
      setRpe(null);
      showToast(`סט ${nextNum} נשמר`, async () => {
        for (const id of ids) await deleteSet(id);
      });
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div class="card">
      <div class="row">
        <h2 class="en" style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)', textAlign: 'right' }}>{ex.name}</h2>
        {we.role === 'technique' ? <span class="tag">טכניקה</span> : <span class="badge accent">{we.targetToday}</span>}
      </div>
      <p class="small muted" style={{ margin: '6px 0' }}>
        טווח {we.targetMin}–{we.targetMax} {unit} · קצב {we.tempo}{we.rpeTarget ? ` · RPE יעד ${we.rpeTarget}` : ''} · מנוחה {we.restSec ?? ex.restSec} שנ'
        {we.note ? ` · ${we.note}` : ''}
      </p>
      {lastText && <p class="small">בפעם הקודמת: <b class="num">{lastText}</b></p>}
      <div class="actions" style={{ marginTop: 0 }}>
        <button class="btn" onClick={() => setShowCues(!showCues)}>{showCues ? 'הסתר דגשים' : 'דגשי טכניקה'}</button>
        <a class="btn" href={videoUrl(ex)} target="_blank" rel="noopener">▶ סרטון</a>
      </div>
      {showCues && <ul class="cues small" style={{ marginTop: '10px' }}>{ex.cues.map((c) => <li key={c}>{c}</li>)}{ex.safety && <li>⚠️ {ex.safety}</li>}</ul>}

      <div style={{ marginTop: '10px' }}>
        {[...byNum.entries()].sort((a, b) => a[0] - b[0]).map(([n, list]) => (
          <div class="setrow done" key={n}>
            <span class="n">{n}</span>
            <span class="num">
              {list.map((s) => `${s.side === 'right' ? 'ימין ' : s.side === 'left' ? 'שמאל ' : ''}${isTime ? s.seconds : s.reps}`).join(' / ')} {unit}
              {list[0].load ? ` · ${list[0].load}` : ''}{list[0].rpe ? ` · RPE ${list[0].rpe}` : ''}
            </span>
            <button class="icon-btn" aria-label={`מחק סט ${n}`} onClick={async () => { for (const s of list) await deleteSet(s.id); showToast('הסט נמחק', async () => { for (const s of list) await restoreSet(s.id); }); }}>✕</button>
          </div>
        ))}
      </div>

      {doneCount < we.targetSets + 3 && (
        <div style={{ marginTop: '10px' }}>
          <div class="label" style={{ marginBottom: '6px' }}>סט {nextNum}{nextNum > we.targetSets ? ' (נוסף)' : ` מתוך ${we.targetSets}`}</div>
          <div class="grid2">
            <label class="field">
              <span class="label">{ex.unilateral ? 'ימין' : isTime ? 'שניות' : 'חזרות'}</span>
              <input class="input" type="number" inputMode="numeric" value={val ?? ''} onInput={(e) => setVal(Number((e.currentTarget as HTMLInputElement).value) || null)} />
            </label>
            {ex.unilateral ? (
              <label class="field">
                <span class="label">שמאל</span>
                <input class="input" type="number" inputMode="numeric" value={left ?? ''} onInput={(e) => setLeft(Number((e.currentTarget as HTMLInputElement).value) || null)} />
              </label>
            ) : (
              <label class="field">
                <span class="label">עומס (לא חובה)</span>
                <input class="input" value={load} placeholder={'10 ק"ג / גומייה'} onInput={(e) => setLoad((e.currentTarget as HTMLInputElement).value)} />
              </label>
            )}
          </div>
          {ex.unilateral && (
            <label class="field">
              <span class="label">עומס (לא חובה)</span>
              <input class="input" value={load} onInput={(e) => setLoad((e.currentTarget as HTMLInputElement).value)} />
            </label>
          )}
          <div class="field">
            <span class="label">RPE{we.role === 'work' ? ' (חובה)' : ''}</span>
            <div class="rpe" role="group" aria-label="RPE">
              {[5, 6, 7, 8, 9, 10].map((r) => (
                <button type="button" key={r} aria-pressed={rpe === r} onClick={() => setRpe(r)}>{r}</button>
              ))}
            </div>
          </div>
          {err && <div class="alert danger">{err}</div>}
          <button class="btn primary block" onClick={save}>✓ שמור סט</button>
        </div>
      )}
    </div>
  );
}

// מיקום במסך (לשונית ותרגיל) לכל אימון. נוחות בלבד, ואם האחסון חסום פשוט לא נזכר
const POS_KEY = 'runPos';
function readPos(workoutId: string): { tab: string; cur: number } | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(POS_KEY) ?? 'null');
    return p?.id === workoutId ? p : null;
  } catch {
    return null;
  }
}
function writePos(workoutId: string, pos: { tab: string; cur: number }): void {
  try {
    sessionStorage.setItem(POS_KEY, JSON.stringify({ id: workoutId, ...pos }));
  } catch {
    /* בלי זיכרון */
  }
}

export function RunWorkout() {
  const data = useLive(async () => {
    const w = await activeWorkout();
    if (!w) return { w: null };
    const [wes, exs, history, injuries, profile] = await Promise.all([listWorkoutExercises(w.id), listExercises(), getHistory(), listInjuries(), getProfile()]);
    const sets = await listSets(wes.map((x) => x.id));
    return { w, wes, exList: exs, exs: new Map(exs.map((e) => [e.id, e])), sets, history, usable: usableAt(profile, w.location, injuries) };
  });
  // null = עוד לא נבחר: נלקח מהזיכרון של המסך, או מהתרגיל הראשון שלא הושלם
  const [tabSel, setTabSel] = useState<string | null>(null);
  const [curSel, setCurSel] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  useEffect(() => {
    keepAwake(true);
    const off = rearmOnVisible();
    return () => {
      off();
      keepAwake(false);
    };
  }, []);
  if (!data) return null;
  if (!data.w) {
    return (
      <div>
        <h1>אין אימון בביצוע</h1>
        <a class="btn primary block" href="#/workout">לאימון של היום</a>
      </div>
    );
  }
  const { w, wes, exList, exs, sets, history, usable } = data;
  // מבחן פתיחה רץ באותו מסך (R-TST-4)
  const isTest = w.kind === 'test';
  const blocks = ((w.plan as { blocks?: PlannedBlock[] })?.blocks ?? []) as PlannedBlock[];
  const tabs = [
    ...blocks.filter((b) => b.key === 'warmup' || b.key === 'mobility').map((b) => ({ key: b.key, title: b.key === 'warmup' ? 'חימום' : 'מוביליטי' })),
    ...(wes!.length ? [{ key: 'strength', title: isTest ? 'מבחן' : 'כוח' }] : []),
    ...blocks.filter((b) => !['warmup', 'mobility'].includes(b.key)).map((b) => ({ key: b.key, title: b.title.split(' ')[0] })),
    { key: 'finish', title: 'סיום' }
  ];
  const setsOfAny = (weId: string) => sets!.some((s) => s.workoutExerciseId === weId);
  // חזרה מפרטים או מסרטון: ממשיכים מאותה לשונית ותרגיל (R-TST-7)
  const saved = readPos(w.id);
  const started = sets!.length > 0 || Object.keys(w.blockMinutes).length > 0;
  const tab = tabSel ?? saved?.tab ?? (started && wes!.length ? 'strength' : tabs[0].key);
  const cur = curSel ?? saved?.cur ?? Math.max(0, wes!.findIndex((x) => !setsOfAny(x.id)));
  const setTab = (t: string) => {
    setTabSel(t);
    writePos(w.id, { tab: t, cur });
  };
  const setCur = (c: number) => {
    setCurSel(c);
    writePos(w.id, { tab, cur: c });
  };
  const active = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;
  const setsOf = (weId: string) => sets!.filter((s) => s.workoutExerciseId === weId);
  const exDone = (we: WorkoutExercise) => new Set(setsOf(we.id).map((s) => s.setNumber)).size >= we.targetSets;
  const blockDone = (k: string) => (k === 'strength' ? wes!.every(exDone) : w.blockMinutes[k] !== undefined);
  const we = wes![Math.min(cur, wes!.length - 1)];

  const lastFor = (exId: string) => {
    const prev = history!.filter((h) => h.exerciseId === exId && h.workoutId !== w.id && h.role === 'work').pop();
    const ex = exs!.get(exId);
    if (!prev || !ex) return { text: null, load: null };
    const vals = setValues(prev.sets, ex.measure, ex.unilateral);
    return { text: vals.map((v) => v.value).join(', ') + (vals[vals.length - 1]?.rpe ? ` · RPE ${vals[vals.length - 1].rpe}` : ''), load: vals[0]?.load ?? null };
  };

  return (
    <div>
      <RunBar w={w} />
      <div class="blocks" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-pressed={active === t.key} class={t.key !== 'finish' && blockDone(t.key) ? 'done' : ''} onClick={() => setTab(t.key)}>
            {t.title}
          </button>
        ))}
      </div>

      {active === 'strength' && we && (
        <>
          <div class="ex-tab">
            {wes!.map((x, i) => (
              <button key={x.id} aria-pressed={i === cur} class={exDone(x) ? 'done' : ''} onClick={() => setCur(i)}>
                {x.exerciseName}{exDone(x) ? ' ✓' : ''}
              </button>
            ))}
          </div>
          {exs!.get(we.exerciseId) && isTest && (
            <TestExerciseRun
              key={we.id}
              we={we}
              ex={exs!.get(we.exerciseId)!}
              sets={setsOf(we.id)}
              exercises={exList!}
              usable={usable!}
              onDone={(added) => {
                if (!added && cur >= wes!.length - 1) setTab('finish');
                else setCur(cur + 1);
                window.scrollTo(0, 0);
              }}
            />
          )}
          {exs!.get(we.exerciseId) && !isTest && (
            <ExerciseRun key={we.id} w={w} we={we} ex={exs!.get(we.exerciseId)!} sets={setsOf(we.id)} lastText={lastFor(we.exerciseId).text} lastLoad={lastFor(we.exerciseId).load} />
          )}
          <div class="actions">
            <button class="btn" disabled={cur === 0} onClick={() => setCur(cur - 1)}>הקודם</button>
            <button class="btn" disabled={cur >= wes!.length - 1} onClick={() => setCur(cur + 1)}>הבא</button>
          </div>
        </>
      )}

      {blocks.filter((b) => b.key === active).map((b) => <BlockView key={b.key} w={w} b={b} />)}

      {active === 'finish' && isTest && <TestFinish w={w} exs={exs!} />}

      {active === 'finish' && !isTest && (
        <div class="card">
          <h2>סיום אימון</h2>
          <p class="small muted">
            כוח: {wes!.filter(exDone).length}/{wes!.length} תרגילים · בלוקים: {blocks.filter((b) => w.blockMinutes[b.key] !== undefined).length}/{blocks.length}
          </p>
          {!finishing ? (
            <button class="btn primary block" onClick={() => setFinishing(true)}>סיים אימון</button>
          ) : (
            <>
              <ScaleField label="תחושה כללית" value={feeling} onChange={setFeeling} />
              <label class="field">
                <span class="label">הערות</span>
                <textarea class="input" value={notes} onInput={(e) => setNotes((e.currentTarget as HTMLTextAreaElement).value)} />
              </label>
              <button
                class="btn primary block"
                onClick={async () => {
                  const created = await finishWorkout(w.id, { feeling, notes });
                  navigate(`/workout/summary/${w.id}`);
                  showToast(created.length ? `האימון נשמר. יש ${created.length} הצעות חדשות` : 'האימון נשמר');
                }}
              >
                שמור וסיים
              </button>
            </>
          )}
          <button
            class="btn danger block"
            style={{ marginTop: '10px' }}
            onClick={async () => {
              await cancelWorkout(w.id);
              navigate('/workout');
              showToast('האימון בוטל', () => restoreWorkout(w.id));
            }}
          >
            בטל אימון (בלי לשמור)
          </button>
        </div>
      )}
      <p class="small muted">המסך נשאר דלוק בזמן אימון. הטיימר ממשיך גם אם המסך ננעל.</p>
    </div>
  );
}
