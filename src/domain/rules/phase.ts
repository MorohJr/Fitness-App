// כללי שלבים (SPEC 4.1)
import type { ISODate, Phase, PhaseInput } from '../types';
import { addDays, isValidDate } from '../calc/dates';

const alive = (phases: Phase[]) => phases.filter((p) => !p.deletedAt);

/** השלב הפעיל בתאריך */
export function activePhase(phases: Phase[], date: ISODate): Phase | null {
  const found = alive(phases).filter((p) => p.startDate <= date && (p.endDate === null || p.endDate >= date));
  // לא אמורה להיות חפיפה. אם יש, האחרון שהתחיל קובע
  found.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return found[0] ?? null;
}

export type PhaseEditMode = 'full' | 'endDateOnly' | 'none';

/** מה מותר לערוך: עתידי (או מתחיל היום) = הכול, פעיל = רק תאריך סיום, שהסתיים = כלום */
export function phaseEditMode(phase: Phase, today: ISODate): PhaseEditMode {
  if (phase.startDate >= today) return 'full';
  if (phase.endDate === null || phase.endDate >= today) return 'endDateOnly';
  return 'none';
}

export interface PhaseValidation {
  errors: string[];
  /** שלב קודם שייסגר ביום שלפני תחילת החדש (מוצג לאישור) */
  closes: { id: string; endDate: ISODate } | null;
}

/** בדיקת שלב חדש או עריכה מלאה של שלב עתידי. editingId = השלב שנערך */
export function validatePhase(phases: Phase[], input: PhaseInput, today: ISODate, editingId?: string): PhaseValidation {
  const errors: string[] = [];
  let closes: PhaseValidation['closes'] = null;
  if (!isValidDate(input.startDate)) errors.push('תאריך התחלה לא תקין');
  else if (input.startDate < today) errors.push('תאריך ההתחלה לא יכול להיות בעבר');
  if (input.endDate !== null) {
    if (!isValidDate(input.endDate)) errors.push('תאריך סיום לא תקין');
    else if (input.endDate < input.startDate) errors.push('תאריך הסיום לפני תאריך ההתחלה');
  }
  if (!(input.calories > 0)) errors.push('יעד קלורי חייב להיות גדול מ-0');
  if (errors.length) return { errors, closes };

  const others = alive(phases).filter((p) => p.id !== editingId);
  const newEnd = input.endDate ?? '9999-12-31';
  for (const p of others) {
    const pEnd = p.endDate ?? '9999-12-31';
    const overlaps = p.startDate <= newEnd && pEnd >= input.startDate;
    if (!overlaps) continue;
    if (p.startDate < input.startDate && !closes) {
      // שלב שהתחיל קודם נסגר יום לפני
      closes = { id: p.id, endDate: addDays(input.startDate, -1) };
    } else {
      errors.push('חופף לשלב אחר שמתחיל באותו יום או אחריו');
    }
  }
  return { errors, closes };
}

/** קביעת תאריך סיום לשלב פעיל: מהיום והלאה */
export function validateEndDate(phase: Phase, endDate: ISODate | null, today: ISODate, phases: Phase[]): string[] {
  if (endDate === null) {
    const later = alive(phases).find((p) => p.id !== phase.id && p.startDate > phase.startDate);
    return later ? ['יש שלב מאוחר יותר, אי אפשר להשאיר בלי סוף'] : [];
  }
  if (!isValidDate(endDate)) return ['תאריך לא תקין'];
  if (endDate < today) return ['תאריך הסיום לא יכול להיות בעבר'];
  if (endDate < phase.startDate) return ['תאריך הסיום לפני תאריך ההתחלה'];
  const clash = alive(phases).find((p) => p.id !== phase.id && p.startDate > phase.startDate && p.startDate <= endDate);
  return clash ? ['חופף לשלב הבא'] : [];
}
