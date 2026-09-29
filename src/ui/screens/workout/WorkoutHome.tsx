// לשונית אימון: אימון היום (R-GEN), החלטות, התחלה, נפח שבועי (פרק 7)
import { useEffect, useState } from 'preact/hooks';
import type { LocationId, Workout } from '../../../domain/types';
import { clock } from '../../../data/clock';
import { listExercises } from '../../../data/repos/exercises';
import { activeWorkout, getHistory, planWorkout, startWorkout } from '../../../data/repos/workouts';
import { getProfile } from '../../../data/repos/profile';
import { recordDecision } from '../../../data/repos/suggestions';
import { getDeloadContext, getEffectiveDayPlan } from '../../../data/plan';
import { checkRecoverySwap } from '../../../data/engineChecks';
import { getFoundationState } from '../../../data/foundation';
import { FOUNDATION_WEEKS } from '../../../domain/rules/R-BEG';
import { getDb } from '../../../data/db';
import { STRENGTH_FAMILIES } from '../../../domain/families';
import { familyReady } from '../../../domain/rules/opening-test';
import { canPostpone, isDeloadWeek } from '../../../domain/rules/R-DL';
import { MAJOR_MUSCLES, VOLUME_MAX, VOLUME_MIN, weeklyVolume } from '../../../domain/engine/volume';
import { MUSCLES } from '../../../domain/muscles';
import { dayOfWeek, formatDate, startOfWeek } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { DAY_TYPE_LABELS, LOCATION_LABELS, WEEKDAYS, fmtNum } from '../../labels';
import { Icon } from '../../components/Icon';
import { Segmented } from '../../components/Fields';
import { SuggestionsList } from '../../components/Suggestions';
import { navigate } from '../../router';
import { locationStore, showToast, useStore } from '../../store';
import { unlockAudio } from '../../device';

const mins = (sec: number) => Math.round(sec / 60);

export function WorkoutHome() {
  const today = clock.today();
  useEffect(() => {
    checkRecoverySwap();
  }, []);
  const data = useLive(async () => {
    const [exs, active, profile, plan, dctx, history, found] = await Promise.all([listExercises(), activeWorkout(), getProfile(), getEffectiveDayPlan(today), getDeloadContext(), getHistory(), getFoundationState(today)]);
    const workouts = ((await getDb().data('workouts').toArray()) as Workout[]).filter((w) => !w.deletedAt);
    const lastLoc = workouts.filter((w) => w.kind === 'regular' && w.status === 'completed').sort((a, b) => b.date.localeCompare(a.date))[0]?.location;
    const doneToday = workouts.find((w) => w.kind === 'regular' && w.status === 'completed' && w.date === today);
    const recent = workouts.filter((w) => w.kind === 'regular' && w.status !== 'inProgress').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const vol = weeklyVolume(history, new Map(exs.map((e) => [e.id, e])), startOfWeek(today));
    return { ready: STRENGTH_FAMILIES.filter((f) => familyReady(exs, f)).length, active, profile, plan, dctx, lastLoc, doneToday, recent, vol, count: exs.length, found };
  }, [today]);
  const loc = useStore(locationStore);
  const setLoc = (l: LocationId) => locationStore.set(l);
  const [likeLast, setLikeLast] = useState(false);
  const [again, setAgain] = useState(false);
  const location: LocationId | null = loc ?? (data ? ((data.lastLoc as LocationId) ?? data.profile?.locations.find((l) => l.enabled)?.id ?? null) : null);
  const planned = useLive(async () => (location ? planWorkout(today, location, likeLast) : null), [today, location, likeLast, data?.plan.templateId, data?.plan.dayType]);
  if (!data?.profile) return null;
  const { ready, active, profile, plan, dctx, doneToday, recent, vol, count, found } = data;
  const inFoundation = !!(found.active || found.pending);
  const total = STRENGTH_FAMILIES.length;
  const deload = isDeloadWeek(today, dctx);

  async function start() {
    if (!planned || !location) return;
    unlockAudio();
    await startWorkout(today, location, planned);
    navigate('/workout/run');
  }

  return (
    <div>
      <div class="eyebrow">{WEEKDAYS[dayOfWeek(today)]} · {formatDate(today)}</div>
      <h1>אימון</h1>

      <SuggestionsList filter={(s) => (s.type === 'missedWorkout' || s.type === 'recoverySwap') && s.date === today} />

      {ready === 0 && !inFoundation && (
        <div class="card">
          <h2>איך מתחילים?</h2>
          <p class="small">בלי בדיקה ראשונה אי אפשר לבנות אימון. בחר את הדרך שמתאימה לך:</p>
          <a class="btn primary block" href="#/workout/foundation">אני מתחיל מאפס: תוכנית יסודות</a>
          <p class="small muted" style={{ margin: '6px 0 12px' }}>{FOUNDATION_WEEKS} שבועות, 4 אימונים קלים בשבוע, מהתרגילים הכי קלים (R-BEG)</p>
          <a class="btn block" href="#/workout/test">מבחן פתיחה מלא</a>
          <p class="small muted" style={{ margin: '6px 0 0' }}>למי שכבר מתאמן: סט מקסימלי בכל אחת מ-{total} המשפחות (פרק 6)</p>
        </div>
      )}

      {inFoundation && (
        <a class="card" href="#/workout/foundation" style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
          <div class="row">
            <div class="label">תוכנית יסודות</div>
            <span class="small muted">פרטים ›</span>
          </div>
          {found.active ? (
            <>
              <div class="big" style={{ margin: '6px 0' }}>
                <span class="v" style={{ fontSize: '2.4rem' }}>{Math.min(found.active.week, FOUNDATION_WEEKS)}</span>
                <span class="of">מתוך {FOUNDATION_WEEKS} שבועות</span>
              </div>
              <div class="progress-line"><i style={{ width: `${(Math.min(found.active.week, FOUNDATION_WEEKS) / FOUNDATION_WEEKS) * 100}%` }} /></div>
            </>
          ) : (
            <p class="small" style={{ margin: '6px 0 0' }}>מתחילה ביום ראשון {formatDate(found.pending!.effectiveFrom)}</p>
          )}
        </a>
      )}

      {ready > 0 && ready < total && !inFoundation && (
        <div class="card">
          <div class="label">מבחן פתיחה</div>
          <div class="big" style={{ margin: '6px 0' }}>
            <span class="v" style={{ fontSize: '2.4rem' }}>{ready}</span>
            <span class="of">מתוך {total} משפחות</span>
          </div>
          <div class="progress-line"><i style={{ width: `${(ready / total) * 100}%` }} /></div>
          <p class="small muted">בלי מבחן פתיחה אי אפשר לבנות אימון מלא. אפשר לבדוק כל משפחה בנפרד, בכל יום.</p>
          <a class="btn primary block" href="#/workout/test">{ready ? 'המשך מבחן פתיחה' : 'התחל מבחן פתיחה'}</a>
        </div>
      )}

      {active ? (
        <div class="card">
          <h2>אימון בביצוע</h2>
          <p>{active.templateName ?? DAY_TYPE_LABELS[active.dayType ?? 'training']} · התחיל {new Date(active.startedAt!).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
          <a class="btn primary block" href="#/workout/run">המשך אימון</a>
        </div>
      ) : (
        <div class="card">
          <div class="row">
            <h2 style={{ margin: 0 }}>היום: {plan.dayType === 'training' ? planned?.templateName ?? 'אימון' : DAY_TYPE_LABELS[plan.dayType]}</h2>
            {deload && <span class="badge warn">הורדת עומס</span>}
          </div>
          {deload && canPostpone(today, dctx) && (
            <button
              class="btn block"
              style={{ marginTop: '10px' }}
              onClick={async () => {
                await recordDecision({ type: 'deloadPostpone', refId: startOfWeek(today), payload: { weekStart: startOfWeek(today) }, title: 'דחיית שבוע הורדת עומס', reason: 'R-DL-3' }, 'approved');
                showToast('שבוע הורדת העומס נדחה בשבוע (פעם אחת)');
              }}
            >
              דחה את הורדת העומס בשבוע (R-DL-3)
            </button>
          )}
          {doneToday && <div class="alert ok" style={{ marginTop: '10px' }}>✓ האימון של היום הושלם. <a href={`#/workout/summary/${doneToday.id}`}>לסיכום</a></div>}
          {doneToday && !again ? (
            <button class="btn block" style={{ marginTop: '10px' }} onClick={() => setAgain(true)}>אימון נוסף היום</button>
          ) : plan.dayType === 'rest' ? (
            <p class="muted" style={{ marginTop: '10px' }}>שבת, מנוחה מלאה. אין אימון מכל סוג (R-DAY-3).</p>
          ) : (
            <>
              <div style={{ height: '10px' }} />
              <Segmented<LocationId>
                label="מיקום"
                value={location ?? 'home'}
                options={profile.locations.filter((l) => l.enabled).map((l) => ({ value: l.id, label: LOCATION_LABELS[l.id] }))}
                onChange={setLoc}
              />
              {plan.dayType === 'training' && (
                <label class="check">
                  <input type="checkbox" checked={likeLast} onChange={(e) => setLikeLast((e.currentTarget as HTMLInputElement).checked)} />
                  כמו בפעם הקודמת (R-GEN-7)
                </label>
              )}
              {planned && <PlanPreview p={planned} />}
              <button class="btn primary block" style={{ marginTop: '12px' }} disabled={!planned || (plan.dayType === 'training' && !planned.strength.length)} onClick={start}>
                {plan.dayType === 'activeRecovery' ? 'התחל התאוששות' : 'התחל אימון'}
              </button>
            </>
          )}
        </div>
      )}

      <div class="card">
        <h2>נפח השבוע (סטי עבודה)</h2>
        {MAJOR_MUSCLES.map((m) => {
          const v = vol[m];
          const max = 20;
          return (
            <div class="volrow" key={m}>
              <span>{MUSCLES[m].name}</span>
              <div class="volbar">
                {!found.active && <span class="zone" style={{ insetInlineStart: `${(VOLUME_MIN / max) * 100}%`, width: `${((VOLUME_MAX - VOLUME_MIN) / max) * 100}%` }} />}
                <i style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
              </div>
              <span class="num small">{fmtNum(v, 1)}</span>
            </div>
          );
        })}
        <p class="small muted" style={{ margin: 0 }}>{found.active ? 'תוכנית יסודות: הנפח נמוך בכוונה, בלי יעד שבועי (R-BEG-5).' : 'יעד 10–16 לשבוע.'} שריר ראשי 1, משני 0.5 (R-GEN-3)</p>
      </div>

      {recent.length > 0 && (
        <>
          <h2>אימונים אחרונים</h2>
          <div class="list">
            {recent.map((w) => (
              <a key={w.id} href={`#/workout/summary/${w.id}`}>
                <span class="grow">{formatDate(w.date)} · {w.templateName ?? DAY_TYPE_LABELS[w.dayType ?? 'training']}{w.status === 'skipped' ? ' · דולג' : ''}</span>
              </a>
            ))}
          </div>
        </>
      )}

      <div class="list">
        <a href="#/workout/library"><Icon name="workout" /><span class="grow">מאגר תרגילים ({count})</span></a>
        <a href="#/workout/test"><Icon name="target" /><span class="grow">מבחן פתיחה ({ready}/{total})</span></a>
        <a href="#/settings/week"><Icon name="calendar" /><span class="grow">תוכנית שבועית ותבניות</span></a>
      </div>
    </div>
  );
}

export function PlanPreview({ p }: { p: import('../../../domain/engine/buildWorkout').PlannedWorkout }) {
  return (
    <div>
      <p class="small muted" style={{ margin: '4px 0 8px' }}>
        {p.strength.length ? `כוח ${mins(p.strengthSec)} מתוך ${mins(p.strengthLimitSec)} דק' · ` : ''}סה"כ {mins(p.totalSec)} דק' מתוך {mins(p.totalLimitSec)}
      </p>
      {p.strength.map((it, i) => (
        <div class="plan-row" key={it.exercise.id + i}>
          <div class="grow">
            <div class="nm">{it.exercise.name}</div>
            <div class="sub">
              {it.targetText}{it.rpeTarget ? ` · RPE ${it.rpeTarget}` : ''} · קצב {it.tempo}{it.note ? ` · ${it.note}` : ''}
            </div>
          </div>
          {it.role === 'technique' && <span class="tag">טכניקה</span>}
        </div>
      ))}
      {p.skipped.map((s) => <div class="alert warn" key={s.family}>{s.family}: {s.reason}</div>)}
      {p.notes.map((n) => <p class="small muted" key={n}>{n}</p>)}
      <div class="chips" style={{ marginTop: '10px' }}>
        {p.blocks.map((b) => <span class="badge" key={b.key}>{b.title} · {b.minutes}′</span>)}
      </div>
    </div>
  );
}
