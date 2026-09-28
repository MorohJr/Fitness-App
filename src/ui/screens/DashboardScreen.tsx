// דשבורד. בשלב 1: סוג היום, יעדי היום, ומה חסר בהגדרה. השאר בשלב 7
import { clock } from '../../data/clock';
import { getDayLog } from '../../data/repos/dayLogs';
import { getProfile } from '../../data/repos/profile';
import { listTargetVersions } from '../../data/repos/targets';
import { listPhases } from '../../data/repos/phases';
import { getDayPlan, listTemplates } from '../../data/repos/weekPlan';
import { getMeta } from '../../data/repos/meta';
import { listExercises } from '../../data/repos/exercises';
import { STRENGTH_FAMILIES } from '../../domain/families';
import { familyReady } from '../../domain/rules/opening-test';
import { activePhase } from '../../domain/rules/phase';
import { dayOfWeek, formatDate } from '../../domain/calc/dates';
import { useLive } from '../hooks';
import { DAY_TYPE_LABELS, PHASE_LABELS, WEEKDAYS } from '../labels';
import { TargetsNotes, TargetsStats } from '../components/TargetsCard';

export function DashboardScreen() {
  const today = clock.today();
  const data = useLive(async () => {
    const [log, profile, versions, phases, plan, templates, lastExport] = await Promise.all([
      getDayLog(today),
      getProfile(),
      listTargetVersions(),
      listPhases(),
      getDayPlan(today),
      listTemplates(),
      getMeta<string>('lastExportAt')
    ]);
    const exs = await listExercises();
    const testReady = STRENGTH_FAMILIES.filter((f) => familyReady(exs, f)).length;
    const template = templates.find((t) => t.id === plan.templateId);
    return { log, profile, hasTargets: versions.length > 0, phase: activePhase(phases, today), plan, template, exported: !!lastExport, testReady };
  }, [today]);
  if (!data) return null;
  const { log, profile, hasTargets, phase, plan, template, exported, testReady } = data;
  const testDone = testReady === STRENGTH_FAMILIES.length;
  const profileDone = !!(profile?.sex && profile.birthDate && profile.heightCm);

  // כותרת: "יום דחיקה." / "יום התאוששות." / "יום מנוחה."
  const word = plan.dayType === 'training' ? template?.name ?? 'אימון' : plan.dayType === 'activeRecovery' ? 'התאוששות' : 'מנוחה';

  return (
    <div>
      <div class="eyebrow">
        {WEEKDAYS[dayOfWeek(today)]} · {formatDate(today)}
      </div>
      <h1>
        יום <em>{word}.</em>
      </h1>
      <div class="chips">
        <span class="badge accent">{DAY_TYPE_LABELS[plan.dayType]}</span>
        {phase && <span class="badge">{PHASE_LABELS[phase.type]}</span>}
      </div>

      {(!profileDone || !hasTargets || !exported || !testDone) && (
        <>
          <h2>להתחיל</h2>
          <div class="list">
            <a href="#/settings/profile"><span class="grow">פרופיל: מין, תאריך לידה, גובה</span>{profileDone && <span class="done">✓</span>}</a>
            <a href="#/settings/targets"><span class="grow">יעדים בעזרת המחשבון</span>{hasTargets && <span class="done">✓</span>}</a>
            <a href="#/workout/test"><span class="grow">מבחן פתיחה ({testReady}/{STRENGTH_FAMILIES.length})</span>{testDone && <span class="done">✓</span>}</a>
            <a href="#/settings/backup"><span class="grow">גיבוי ראשון</span>{exported && <span class="done">✓</span>}</a>
          </div>
        </>
      )}

      {log && (
        <div class="card">
          <TargetsStats t={log.targets} />
          <TargetsNotes t={log.targets} />
        </div>
      )}
      <p class="muted small">מעקב אחרי מה שנאכל, גרפים וסיכום שבועי נבנים בשלבים הבאים.</p>
    </div>
  );
}
