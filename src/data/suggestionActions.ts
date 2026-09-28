// מה קורה כשמאשרים או דוחים הצעה (E2). כל סוג במקום אחד
import type { Suggestion } from '../domain/types';
import { addDays } from '../domain/calc/dates';
import { versionForDate } from '../domain/rules/R-VER';
import { getDb } from './db';
import { clock } from './clock';
import { markDecision } from './repos/suggestions';
import { listTargetVersions, saveTargets } from './repos/targets';
import { addPhaseCalorieChange } from './repos/phases';

type Handler = (s: Suggestion, choice: string | null) => Promise<void>;

const approveHandlers: Partial<Record<Suggestion['type'], Handler>> = {
  // R-NUT-3: היעד החדש חל ממחר. עם שלב פעיל: שינוי בתוך השלב (4.1)
  calories: async (s) => {
    const calories = s.payload.calories as number;
    const from = addDays(clock.today(), 1);
    if (s.payload.phaseId) {
      await addPhaseCalorieChange(s.payload.phaseId as string, from, calories);
      return;
    }
    const cur = versionForDate(await listTargetVersions(), clock.today());
    if (!cur) throw new Error('אין יעדים לעדכן');
    const { proteinPerKg, fatPerKgMin, waterL, steps, adherence } = cur;
    await saveTargets({ calories, proteinPerKg, fatPerKgMin, waterL, steps, adherence }, from);
  }
};

const rejectHandlers: Partial<Record<Suggestion['type'], Handler>> = {};

/** הרחבה משלבים אחרים (מנוע האימונים) */
export function registerSuggestionHandlers(approve: Partial<Record<Suggestion['type'], Handler>>, reject: Partial<Record<Suggestion['type'], Handler>> = {}): void {
  Object.assign(approveHandlers, approve);
  Object.assign(rejectHandlers, reject);
}

export async function approveSuggestion(id: string, choice: string | null = null): Promise<void> {
  const s = (await getDb().data('suggestions').get(id)) as Suggestion;
  if (!s || s.status !== 'pending') return;
  await approveHandlers[s.type]?.(s, choice);
  await markDecision(id, 'approved', choice);
}

export async function rejectSuggestion(id: string): Promise<void> {
  const s = (await getDb().data('suggestions').get(id)) as Suggestion;
  if (!s || s.status !== 'pending') return;
  await rejectHandlers[s.type]?.(s, null);
  await markDecision(id, 'rejected');
}
