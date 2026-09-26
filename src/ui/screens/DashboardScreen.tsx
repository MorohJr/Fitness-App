// דשבורד. בשלב 1: יעדי היום, סוג היום, ומה חסר בהגדרה. השאר בשלב 7
import { clock } from '../../data/clock';
import { getDayLog } from '../../data/repos/dayLogs';
import { getProfile } from '../../data/repos/profile';
import { listTargetVersions } from '../../data/repos/targets';
import { listPhases } from '../../data/repos/phases';
import { activePhase } from '../../domain/rules/phase';
import { formatDate } from '../../domain/calc/dates';
import { useLive } from '../hooks';
import { DAY_TYPE_LABELS, PHASE_LABELS, WEEKDAYS } from '../labels';
import { TargetsNotes, TargetsStats } from '../components/TargetsCard';
import { dayOfWeek } from '../../domain/calc/dates';

export function DashboardScreen() {
  const today = clock.today();
  const data = useLive(async () => {
    const [log, profile, versions, phases] = await Promise.all([getDayLog(today), getProfile(), listTargetVersions(), listPhases()]);
    return { log, profile, hasTargets: versions.length > 0, phase: activePhase(phases, today) };
  }, [today]);
  if (!data) return null;
  const { log, profile, hasTargets, phase } = data;
  const profileDone = !!(profile?.sex && profile.birthDate && profile.heightCm);

  return (
    <div>
      <h1>שלום 👋</h1>
      <p class="muted">
        יום {WEEKDAYS[dayOfWeek(today)]}, {formatDate(today)}
        {log && <> · <span class="badge accent">{DAY_TYPE_LABELS[log.dayType]}</span></>}
        {phase && <> · <span class="badge">{PHASE_LABELS[phase.type]}</span></>}
      </p>

      {(!profileDone || !hasTargets) && (
        <div class="card">
          <h2>להתחיל</h2>
          <div class="list" style={{ marginBottom: 0 }}>
            <a href="#/settings/profile">{profileDone ? '✓ ' : ''}1. פרופיל: מין, תאריך לידה, גובה</a>
            <a href="#/settings/targets">{hasTargets ? '✓ ' : ''}2. יעדים (בעזרת המחשבון)</a>
            <a href="#/settings/backup">3. ייצוא גיבוי ראשון</a>
          </div>
        </div>
      )}

      {log && (
        <div class="card">
          <h2>יעדי היום</h2>
          <TargetsStats t={log.targets} />
          <TargetsNotes t={log.targets} />
        </div>
      )}
      <p class="muted small">הכרטיסים, הגרפים והסיכום השבועי נבנים בשלב 7.</p>
    </div>
  );
}
