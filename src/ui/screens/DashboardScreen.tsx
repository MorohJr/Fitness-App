// דשבורד (פרק 7): שלב, עמידה ביעדים, התאוששות, רצף, אימון היום, פס יומי, גרפים, הצעות, סיכום שבועי
import { clock } from '../../data/clock';
import { addWater, getDayLog, listDayLogs, updateDayLog } from '../../data/repos/dayLogs';
import { getProfile } from '../../data/repos/profile';
import { listTargetVersions } from '../../data/repos/targets';
import { listPhases } from '../../data/repos/phases';
import { listTemplates } from '../../data/repos/weekPlan';
import { getMeta } from '../../data/repos/meta';
import { listExercises } from '../../data/repos/exercises';
import { listFoodLogs } from '../../data/repos/nutrition';
import { listSupplementLogs, listSupplements } from '../../data/repos/supplements';
import { listMeasurements } from '../../data/repos/body';
import { activeWorkout, workoutsOn } from '../../data/repos/workouts';
import { getDayChecks, summaryWeek, weeklySummary } from '../../data/adherence';
import { getDeloadContext, getEffectiveDayPlan, getFoundationInfo } from '../../data/plan';
import { FOUNDATION_WEEKS } from '../../domain/rules/R-BEG';
import { getRank } from '../../data/rank';
import { RankCard } from '../components/RankCard';
import { STRENGTH_FAMILIES } from '../../domain/families';
import { familyReady } from '../../domain/rules/opening-test';
import { activePhase, phaseCaloriesOn } from '../../domain/rules/phase';
import { adherencePct, streak } from '../../domain/rules/R-ADH';
import { recoveryScore } from '../../domain/rules/R-REC';
import { isDeloadWeek } from '../../domain/rules/R-DL';
import { sumLogs } from '../../domain/rules/R-NUT-food';
import { composition } from '../../domain/calc/bodyfat';
import { trendWeight } from '../../domain/calc/weight';
import { addDays, dayOfWeek, formatDate } from '../../domain/calc/dates';
import { VOLUME_MAX, VOLUME_MIN } from '../../domain/engine/volume';
import { MUSCLES, type MuscleId } from '../../domain/muscles';
import { useLive } from '../hooks';
import { DAY_TYPE_LABELS, PHASE_LABELS, WEEKDAYS, fmtDelta, fmtNum } from '../labels';
import { SuggestionsList } from '../components/Suggestions';
import { LineChart } from '../components/LineChart';
import { locationStore, showToast, useStore } from '../store';
import { planWorkout } from '../../data/repos/workouts';
import { Segmented } from '../components/Fields';
import { LOCATION_LABELS } from '../labels';
import type { LocationId } from '../../domain/types';

export function DashboardScreen() {
  const today = clock.today();
  const data = useLive(async () => {
    const [log, profile, versions, phases, templates, lastExport, exs, food, sups, supLogs, ms, logs, plan, dctx, active, todays] = await Promise.all([
      getDayLog(today), getProfile(), listTargetVersions(), listPhases(), listTemplates(), getMeta<string>('lastExportAt'), listExercises(),
      listFoodLogs(today), listSupplements(), listSupplementLogs(today), listMeasurements(), listDayLogs(), getEffectiveDayPlan(today), getDeloadContext(),
      activeWorkout(), workoutsOn(today)
    ]);
    const checks = await getDayChecks(addDays(today, -40), today);
    const foundation = await getFoundationInfo(today);
    const rank = await getRank(today);
    const sw = summaryWeek(today, clock.now());
    const summary = sw ? await weeklySummary(sw) : null;
    const summaryChecks = sw ? adherencePct(await getDayChecks(sw, addDays(sw, 6)), addDays(sw, 7), 7) : null;
    return {
      log, profile, hasTargets: versions.length > 0, phase: activePhase(phases, today), template: templates.find((t) => t.id === plan.templateId), plan,
      exported: !!lastExport, testReady: STRENGTH_FAMILIES.filter((f) => familyReady(exs, f)).length, eaten: sumLogs(food),
      sups: sups.filter((s) => s.active), supTaken: supLogs.filter((l) => l.taken).length, ms, logs, checks, deload: isDeloadWeek(today, dctx),
      active, doneToday: todays.find((w) => w.kind === 'regular' && w.status === 'completed'), summary, summaryChecks, foundation, rank
    };
  }, [today]);
  const locSel = useStore(locationStore);
  const loc: LocationId | null = locSel ?? (data?.profile?.locations.find((l) => l.enabled)?.id ?? null);
  const preview = useLive(async () => (loc ? planWorkout(today, loc) : null), [today, loc]);
  if (!data) return null;
  const { log, profile, hasTargets, phase, plan, template, exported, testReady, eaten, sups, supTaken, ms, logs, checks, deload, active, doneToday, summary, summaryChecks, foundation, rank } = data;
  const profileDone = !!(profile?.sex && profile.birthDate && profile.heightCm);
  const testDone = testReady === STRENGTH_FAMILIES.length || !!foundation;
  const word = plan.dayType === 'training' ? template?.name ?? 'אימון' : plan.dayType === 'activeRecovery' ? 'התאוששות' : 'מנוחה';
  const rec = log ? recoveryScore(log) : null;
  const st = streak(checks, today);
  const since = logs[0]?.date;
  const a7 = adherencePct(checks, today, 7, since);
  const a30 = adherencePct(checks, today, 30, since);
  const t = log?.targets;

  // גרפים: משקל מגמה ואחוז שומן (שני גרפים, ציר אחד לכל אחד)
  const weighIns = [
    ...logs.filter((l) => typeof l.morningWeightKg === 'number').map((l) => ({ date: l.date, weightKg: l.morningWeightKg as number })),
    ...ms.filter((m) => m.weightKg !== null).map((m) => ({ date: m.date, weightKg: m.weightKg as number }))
  ];
  const wDates = [...new Set(weighIns.map((w) => w.date))].sort().filter((d) => d >= addDays(today, -90));
  const trend = wDates.map((d) => ({ x: d, y: trendWeight(weighIns, d) }));
  const bf = ms.map((m) => ({ x: m.date, y: composition(m).bodyFat })).filter((p) => p.y !== null);

  const tile = (label: string, value: string, sub?: string) => (
    <div class="stat">
      <div class="l">{label}</div>
      <div class="v">{value}</div>
      {sub && <div class="l">{sub}</div>}
    </div>
  );

  return (
    <div>
      <div class="eyebrow">{WEEKDAYS[dayOfWeek(today)]} · {formatDate(today)}</div>
      <h1>יום <em>{word}.</em></h1>
      <div class="chips">
        <span class="badge accent">{DAY_TYPE_LABELS[plan.dayType]}</span>
        {phase && <span class="badge">{PHASE_LABELS[phase.type]}</span>}
        {deload && <span class="badge warn">שבוע הורדת עומס</span>}
        {foundation && <a class="badge" href="#/workout/foundation">יסודות · שבוע {Math.min(foundation.week, FOUNDATION_WEEKS)} מתוך {FOUNDATION_WEEKS}</a>}
        {st > 0 && <span class="badge">🔥 {st}</span>}
      </div>

      <RankCard rank={rank} />

      <div class="stats" style={{ marginBottom: '10px' }}>
        {tile('עמידה 7 ימים', a7.pct === null ? '—' : `${a7.pct}%`, `30 ימים: ${a30.pct === null ? '—' : `${a30.pct}%`}`)}
        {tile('התאוששות', rec?.score == null ? '—' : fmtNum(rec.score, 1), rec?.manual ? 'ידני' : 'מתוך 10')}
        {tile('רצף', `🔥 ${st}`, 'ימים')}
      </div>

      <div class="card">
        <div class="row">
          <h2 style={{ margin: 0 }}>האימון של היום</h2>
          <a class="small" href="#/workout">לאימון</a>
        </div>
        <p style={{ margin: '8px 0' }}>
          {doneToday ? '✓ הושלם' : active ? 'בביצוע' : plan.dayType === 'rest' ? 'מנוחה מלאה' : `${word}${deload ? ' · הורדת עומס' : ''}`}
        </p>
        {!doneToday && !active && plan.dayType !== 'rest' && profile && (
          <>
            <Segmented<LocationId>
              value={loc ?? 'home'}
              options={profile.locations.filter((l) => l.enabled).map((l) => ({ value: l.id, label: LOCATION_LABELS[l.id] }))}
              onChange={(l) => locationStore.set(l)}
            />
            {preview && (
              <p class="small muted" style={{ margin: 0 }}>
                {preview.strength.filter((i) => i.role === 'work').map((i) => i.exercise.name).join(' · ') || 'בלי עבודת כוח'}
                {' '}· כ-{Math.round(preview.totalSec / 60)} דק'
              </p>
            )}
          </>
        )}
      </div>

      {t && (
        <div class="card">
          <h2>היום</h2>
          <div class="stats">
            {tile('קלוריות', fmtNum(eaten.kcal), `מתוך ${fmtNum(t.calories)}`)}
            {tile('חלבון', fmtNum(eaten.protein), `מתוך ${fmtNum(t.proteinG)} ג'`)}
            {tile('מים', fmtNum((log?.waterMl ?? 0) / 1000, 1), `מתוך ${fmtNum(t.waterL, 1)} ל'`)}
            {tile('צעדים', fmtNum(log?.steps ?? null), `מתוך ${fmtNum(t.steps)}`)}
            {tile('תוספים', `${supTaken}/${sups.length}`)}
          </div>
        </div>
      )}

      <div class="actions" style={{ marginBottom: '12px' }}>
        <a class="btn" href="#/today">רשום את היום</a>
        <a class="btn" href="#/workout">{active ? 'המשך אימון' : 'התחל אימון'}</a>
        <a class="btn" href="#/nutrition">רשום ארוחה</a>
        <button class="btn" onClick={async () => { const prev = await addWater(today, 250); showToast('+250 מ"ל', () => updateDayLog(today, { waterMl: prev }).then(() => undefined)); }}>+ מים</button>
      </div>

      {(!profileDone || !hasTargets || !exported || !testDone) && (
        <>
          <h2>להתחיל</h2>
          <div class="list">
            <a href="#/settings/profile"><span class="grow">פרופיל: מין, תאריך לידה, גובה</span>{profileDone && <span class="done">✓</span>}</a>
            <a href="#/settings/targets"><span class="grow">יעדים בעזרת המחשבון</span>{hasTargets && <span class="done">✓</span>}</a>
            {testReady === 0 ? (
              <a href="#/workout"><span class="grow">בדיקה ראשונה: תוכנית יסודות או מבחן פתיחה</span></a>
            ) : (
              <a href="#/workout/test"><span class="grow">מבחן פתיחה ({testReady}/{STRENGTH_FAMILIES.length})</span>{testDone && <span class="done">✓</span>}</a>
            )}
            <a href="#/settings/backup"><span class="grow">גיבוי ראשון</span>{exported && <span class="done">✓</span>}</a>
          </div>
        </>
      )}

      <SuggestionsList />

      {summary && (
        <div class="card sugg">
          <h2>סיכום שבועי · {formatDate(summary.weekStart)}</h2>
          <div class="stats two" style={{ marginBottom: '10px' }}>
            {tile('אימונים', String(summary.workoutsDone))}
            {tile('משקל מגמה', summary.trendChange === null ? '—' : fmtDelta(summary.trendChange), 'ק"ג בשבוע')}
            {tile('עמידה ביעדים', summaryChecks?.pct === null || !summaryChecks ? '—' : `${summaryChecks.pct}%`)}
            {tile('שיאים חדשים', String(summary.newPRs.length))}
          </div>
          {summary.volume.map((v) => (
            <div class="row small" key={v.muscle}>
              <span>{MUSCLES[v.muscle as MuscleId].name}</span>
              <span class="num">{fmtNum(v.sets, 1)} {summary.foundation ? '' : v.sets < VOLUME_MIN ? '↓ מתחת ליעד' : v.sets > VOLUME_MAX ? '↑ מעל היעד' : '✓'}</span>
            </div>
          ))}
          {summary.foundation && <p class="small muted" style={{ margin: '6px 0 0' }}>תוכנית יסודות: הנפח נמוך בכוונה, בלי השוואה ליעד 10–16 (R-BEG-5)</p>}
          {summary.newPRs.length > 0 && <p class="small" style={{ marginTop: '8px' }}>🏅 {summary.newPRs.map((p) => `${p.name} ${p.value}`).join(' · ')}</p>}
        </div>
      )}

      {phase && (
        <div class="card">
          <div class="row">
            <h2 style={{ margin: 0 }}>שלב נוכחי: {PHASE_LABELS[phase.type]}</h2>
            <span class="small muted">מ-{formatDate(phase.startDate)}</span>
          </div>
          <p class="small" style={{ margin: '6px 0 0' }}>{fmtNum(phaseCaloriesOn(phase, today))} קק"ל · יעד {fmtDelta(phase.weeklyRateKg)} ק"ג לשבוע</p>
        </div>
      )}

      {trend.filter((p) => p.y !== null).length >= 2 && (
        <div class="card">
          <h2>משקל מגמה (90 יום)</h2>
          <LineChart series={trend} label="משקל מגמה" unit='ק"ג' height={180} />
        </div>
      )}
      {bf.length >= 2 && (
        <div class="card">
          <h2>אחוז שומן</h2>
          <LineChart series={bf} label="אחוז שומן" unit="%" height={180} />
        </div>
      )}
    </div>
  );
}
