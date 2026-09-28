// R-PRG: התקדמות (R-GEN-6 יעד היום)
import type { Exercise } from '../types';
import { setValues, type PastExercise } from '../engine/history';

export type Outcome = 'achieved' | 'missed' | 'inRange';

/** R-PRG-1: הושג = כל הסטים בקצה העליון עם RPE עד 8. לא הושג = סט אחד מתחת לתחתון */
export function evaluate(ex: Pick<Exercise, 'measure' | 'unilateral'>, pe: Pick<PastExercise, 'sets' | 'targetMin' | 'targetMax'>): Outcome {
  const vals = setValues(pe.sets, ex.measure, ex.unilateral);
  if (!vals.length) return 'missed';
  if (vals.some((s) => s.value < pe.targetMin)) return 'missed';
  if (vals.every((s) => s.value >= pe.targetMax && (s.rpe ?? 8) <= 8)) return 'achieved';
  return 'inRange';
}

export interface TodayTarget {
  value: number;
  text: string;
}

const unit = (ex: Pick<Exercise, 'measure'>) => (ex.measure === 'time' ? 'שנ\'' : '');

/**
 * R-GEN-6 + R-PRG-2: יעד היום לפי האימון האחרון עם אותו תרגיל.
 * אין היסטוריה, אחרי מבחן פתיחה, או אחרי איפוס: מהקצה התחתון.
 * כל הסטים בטווח: +1 חזרה או +5 שניות לסט (מהסט החלש), עד הקצה העליון.
 */
export function targetToday(ex: Exercise, last: PastExercise | null, sets: number): TodayTarget {
  const fmt = (v: number) => ({ value: v, text: `${sets}×${v}${unit(ex)}${ex.unilateral ? ' לכל צד' : ''}` });
  if (ex.restartAtMin || !last || last.kind === 'test') return fmt(ex.targetMin);
  const vals = setValues(last.sets, ex.measure, ex.unilateral);
  if (!vals.length) return fmt(ex.targetMin);
  const weakest = Math.min(...vals.map((v) => v.value));
  if (weakest < ex.targetMin) return fmt(ex.targetMin);
  const step = ex.measure === 'time' ? 5 : 1;
  return fmt(Math.min(ex.targetMax, weakest + step));
}

export interface ProgressionSuggestion {
  type: 'advance' | 'regress' | 'tempo' | 'load' | 'stayOrEasier' | 'promote';
  title: string;
  reason: string;
  payload: Record<string, unknown>;
}

export interface LadderInfo {
  /** תרגילי הרמה הבאה במשפחה, ואם אחד מהם זמין במיקום */
  next: { ex: Exercise; availableSomewhere: boolean }[];
  previous: Exercise | null;
}

/**
 * הצעות אחרי אימון (E2). sessions = כל האימונים הרגילים עם התרגיל, לפי תאריך, בלי שבועות הורדת עומס (R-PRG-9)
 */
export function progressionSuggestions(ex: Exercise, family: string, sessionsAll: PastExercise[], ladder: LadderInfo): ProgressionSuggestion[] {
  const sessions = sessionsAll.filter((s) => s.kind === 'regular' && !s.isDeload && s.role === 'work').sort((a, b) => a.date.localeCompare(b.date));
  if (!sessions.length || ex.status === null) return [];
  const out: ProgressionSuggestion[] = [];
  const outcomes = sessions.map((s) => evaluate(ex, s));
  const last2 = outcomes.slice(-2);
  const last3 = outcomes.slice(-3);
  const n = (k: number) => `${k} אימונים ברציפות`;

  // R-PRG-3 (סוף): באימון הראשון ברמה חדשה, הסט הראשון מתחת לקצה התחתון → חוזרים לרמה הקודמת
  if (sessions.length === 1 && ladder.previous && ladder.previous.status === 'green') {
    const first = setValues(sessions[0].sets, ex.measure, ex.unilateral)[0];
    if (first && first.value < ex.targetMin) {
      out.push({
        type: 'regress',
        title: `לחזור ל-${ladder.previous.name}`,
        reason: `בסט הראשון ב-${ex.name} בוצעו ${first.value}, מתחת לקצה התחתון (${ex.targetMin}). ${ex.name} חוזר לעבודת טכניקה (R-PRG-3)`,
        payload: { exerciseId: ex.id, previousId: ladder.previous.id }
      });
      return out;
    }
  }

  if (last2.length === 2 && last2.every((o) => o === 'achieved')) {
    const usable = ladder.next.filter((x) => x.availableSomewhere);
    if (usable.length) {
      const nx = usable[0].ex;
      out.push({
        type: 'advance',
        title: `לעבור ל-${nx.name}`,
        reason: `היעד הושג ב-${ex.name} ${n(2)} (קצה עליון ${ex.targetMax}, RPE עד 8). ${nx.name} ייכנס מהקצה התחתון (R-PRG-3)`,
        payload: { exerciseId: ex.id, nextId: nx.id, family }
      });
    } else if (ladder.next.length) {
      if (ex.tempo !== '4-1-1-0' && ex.measure !== 'time') {
        out.push({
          type: 'tempo',
          title: `להאט את השלב השלילי ב-${ex.name}`,
          reason: `היעד הושג ${n(2)}, והרמה הבאה לא זמינה עם הציוד שלך. קצב 4-1-1-0 ומתחילים שוב מ-${ex.targetMin} (R-PRG-4)`,
          payload: { exerciseId: ex.id, tempo: '4-1-1-0' }
        });
      }
    } else if (ex.measure !== 'time') {
      out.push({
        type: 'load',
        title: `להוסיף עומס ב-${ex.name}`,
        reason: `היעד הושג ${n(2)}, ואין רמה הבאה. מוסיפים משקולת או גומייה ומתחילים מ-${ex.targetMin} (R-PRG-5)`,
        payload: { exerciseId: ex.id }
      });
    }
  }

  if (last2.length === 2 && last2.every((o) => o === 'missed')) {
    out.push({
      type: 'stayOrEasier',
      title: `${ex.name}: להישאר או לחזור לרמה קלה`,
      reason: `היעד לא הושג ${n(2)} (סט מתחת ל-${ex.targetMin}). אפשר להישאר ולהתחיל מהקצה התחתון${ladder.previous ? `, או לחזור ל-${ladder.previous.name}` : ''} (R-PRG-7)`,
      payload: { exerciseId: ex.id, previousId: ladder.previous?.id ?? null }
    });
  }

  if (ex.status === 'yellow' && last3.length === 3 && last3.every((o) => o === 'achieved')) {
    out.push({
      type: 'promote',
      title: `${ex.name} ל-🟢`,
      reason: `היעד הושג ${n(3)} (R-PRG-8)`,
      payload: { exerciseId: ex.id }
    });
  }
  return out;
}
