// מה קורה כשמאשרים או דוחים הצעה (E2). כל סוג במקום אחד
import type { Suggestion } from '../domain/types';
import { addDays } from '../domain/calc/dates';
import { versionForDate } from '../domain/rules/R-VER';
import { getDb } from './db';
import { clock } from './clock';
import { markDecision } from './repos/suggestions';
import { listTargetVersions, saveTargets } from './repos/targets';
import { addPhaseCalorieChange } from './repos/phases';
import type { DayTemplate, Exercise, Workout } from '../domain/types';
import { newBase, touched } from './repos/base';
import { refreshToday } from './repos/dayLogs';
import { switchToRegular } from './foundation';

async function patchExercise(id: string, patch: Partial<Exercise>): Promise<void> {
  const ex = (await getDb().data('exercises').get(id)) as Exercise | undefined;
  if (ex) await getDb().data('exercises').put(touched(ex, patch));
}

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

// ===== התקדמות (R-PRG) =====
Object.assign(approveHandlers, {
  // R-PRG-3: הרמה הבאה ל-🟡 (אם הייתה 🔴), הקודמת נשארת 🟢 ויוצאת מבלוק הכוח (R-GEN-1)
  advance: async (s: Suggestion) => {
    const next = (await getDb().data('exercises').get(s.payload.nextId as string)) as Exercise | undefined;
    if (next && next.status === 'red') await patchExercise(next.id, { status: 'yellow', restartAtMin: false });
    await patchExercise(s.payload.exerciseId as string, { status: 'green' });
  },
  // R-PRG-3 (סוף): הרמה החדשה חוזרת ל-🔴, עבודת טכניקה
  regress: async (s: Suggestion) => patchExercise(s.payload.exerciseId as string, { status: 'red' }),
  // R-PRG-4: קצב איטי ומתחילים מהקצה התחתון
  tempo: async (s: Suggestion) => patchExercise(s.payload.exerciseId as string, { tempo: s.payload.tempo as string, restartAtMin: true }),
  // R-PRG-5: עומס חיצוני (הבחירה = העומס), מהקצה התחתון
  load: async (s: Suggestion, choice: string | null) => patchExercise(s.payload.exerciseId as string, { currentLoad: choice?.trim() || '10 ק"ג', restartAtMin: true }),
  // R-PRG-7: להישאר (מהקצה התחתון) או לחזור לרמה הקלה
  stayOrEasier: async (s: Suggestion, choice: string | null) => {
    if (choice === 'easier' && s.payload.previousId) {
      await patchExercise(s.payload.exerciseId as string, { status: 'red' });
      await patchExercise(s.payload.previousId as string, { status: 'yellow', restartAtMin: true });
    } else {
      await patchExercise(s.payload.exerciseId as string, { restartAtMin: true });
    }
  },
  // R-DAY-5 / R-REC-2: התוכנית של היום משתנה, תמונת המצב של היום מתעדכנת
  missedWorkout: async () => {
    await refreshToday();
  },
  recoverySwap: async () => {
    await refreshToday();
  },
  // R-BEG-6: התוכנית הרגילה מיום ראשון הבא
  foundationDone: async () => {
    await switchToRegular();
  },
  // R-PRG-8
  promote: async (s: Suggestion) => patchExercise(s.payload.exerciseId as string, { status: 'green' }),
  // R-GEN-3: הוספה/הורדה של סט במשבצת
  volume: async (s: Suggestion) => {
    const t = (await getDb().data('dayTemplates').get(s.payload.templateId as string)) as DayTemplate | undefined;
    if (!t) return;
    const i = s.payload.slotIndex as number;
    const slots = t.slots.map((sl, j) => (j === i ? { ...sl, sets: Math.max(1, Math.min(4, sl.sets + (s.payload.delta as number))) } : sl));
    await getDb().data('dayTemplates').put(touched(t, { slots }));
  }
} as Partial<Record<Suggestion['type'], Handler>>);

const rejectHandlers: Partial<Record<Suggestion['type'], Handler>> = {
  // R-DAY-5 "דלג": האימון שהוחמץ מסומן "דולג"
  missedWorkout: async (s) => {
    const now = clock.iso();
    const w: Workout = {
      ...newBase(), date: s.payload.missedDate as string, kind: 'regular', dayType: 'training', templateName: (s.payload.templateName as string) ?? null,
      location: 'home', isDeload: false, recoveryScore: null, status: 'skipped', startedAt: null, endedAt: now, blockMinutes: {}, feeling: null, notes: 'דולג (R-DAY-5)'
    };
    await getDb().data('workouts').add(w);
  }
};

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
  if (s.type === 'missedWorkout' || s.type === 'recoverySwap') await refreshToday();
}

export async function rejectSuggestion(id: string): Promise<void> {
  const s = (await getDb().data('suggestions').get(id)) as Suggestion;
  if (!s || s.status !== 'pending') return;
  await rejectHandlers[s.type]?.(s, null);
  await markDecision(id, 'rejected');
}
