// בדיקות בפתיחת האפליקציה שיוצרות הצעות (E2). כל בדיקה בנפרד, כישלון באחת לא עוצר את האחרות
import { clock } from './clock';
import { addDays } from '../domain/calc/dates';
import { smartAdjustment, adjustmentDue } from '../domain/rules/R-NUT-adjust';
import { activePhase, phaseCaloriesOn } from '../domain/rules/phase';
import { versionForDate } from '../domain/rules/R-VER';
import { listAllFoodLogs } from './repos/nutrition';
import { listDayLogs, listWeighIns } from './repos/dayLogs';
import { listPhases } from './repos/phases';
import { listTargetVersions } from './repos/targets';
import { createSuggestion, lastSuggestionOfType } from './repos/suggestions';
import { getMeta, setMeta } from './repos/meta';

type Check = () => Promise<void>;
const checks: Check[] = [];

export function registerCheck(c: Check): void {
  checks.push(c);
}

export async function runStartupChecks(): Promise<void> {
  for (const c of [checkSmartAdjustment, ...checks]) {
    try {
      await c();
    } catch (e) {
      console.error('check failed', e);
    }
  }
}

/** R-NUT-3: כל 14 יום, מההצעה/הבדיקה האחרונה או מהיום הראשון עם רישום */
export async function checkSmartAdjustment(): Promise<void> {
  const today = clock.today();
  const logs = await listAllFoodLogs();
  if (!logs.length) return;
  const firstLog = logs.map((l) => l.date).sort()[0];
  const lastSug = await lastSuggestionOfType('calories');
  const lastCheck = (await getMeta<string>('lastAdjustCheck')) ?? null;
  const anchor = [lastSug?.date, lastCheck, firstLog].filter(Boolean).sort().pop() as string;
  if (!adjustmentDue(today, anchor)) return;
  await setMeta('lastAdjustCheck', today);

  const dayLogs = await listDayLogs();
  const complete = new Set(dayLogs.filter((d) => d.foodComplete).map((d) => d.date));
  const kcalByDate = new Map<string, number>();
  for (const l of logs) kcalByDate.set(l.date, (kcalByDate.get(l.date) ?? 0) + l.kcal);
  const completeDays = [...complete].map((date) => ({ date, kcal: kcalByDate.get(date) ?? 0 }));

  const phase = activePhase(await listPhases(), today);
  const version = versionForDate(await listTargetVersions(), today);
  const current = phase ? phaseCaloriesOn(phase, today) : version?.calories;
  if (current === undefined) return;
  const r = smartAdjustment({ today, completeDays, weighIns: await listWeighIns(), currentCalories: current, weeklyRateKg: phase?.weeklyRateKg ?? 0 });
  if (!r.eligible || !r.worthIt) return;
  await createSuggestion({
    type: 'calories',
    refId: phase?.id ?? null,
    payload: { calories: r.suggested, phaseId: phase?.id ?? null, from: addDays(today, 1) },
    title: `יעד קלורי חדש: ${r.suggested} (במקום ${current})`,
    reason: `ממוצע ${r.avgIntake} קק"ל ביום, משקל המגמה השתנה ב-${r.trendChangeKgPerDay} ק"ג ליום, הוצאה משוערת ${r.tdee}. חל ממחר (R-NUT-3)`
  });
}
