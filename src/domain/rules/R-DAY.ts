// R-DAY: ימים ותוכנית. בשלב 1: תוכנית ברירת מחדל (R-DAY-1) ותבניות (נספח ב')
import type { DayPlan, DayTemplate, DayType, ISODate, TemplateSlot, WeekPlanVersion } from '../types';
import type { FamilyId } from '../families';
import { dayOfWeek } from '../calc/dates';
import { versionForDate } from './R-VER';

type SeedTemplate = Pick<DayTemplate, 'id' | 'name' | 'kind' | 'slots'>;

// סטים ברירת מחדל לפי עדיפות (R-GEN-3)
const slot = (family: FamilyId, priority: TemplateSlot['priority']): TemplateSlot => ({
  family,
  priority,
  sets: priority === 'accessory' ? 2 : 3
});

/** תבניות ברירת מחדל (נספח ב'), עם מזהים קבועים. משבצות הליבה לפי המיפוי בנספח ב' */
export const DEFAULT_TEMPLATES: SeedTemplate[] = [
  {
    id: 'tpl-push', name: 'דחיקה', kind: 'training',
    slots: [slot('horizontalPush', 'main'), slot('verticalPush', 'main'), slot('dips', 'secondary'), slot('triceps', 'accessory'), slot('plank', 'accessory')]
  },
  {
    id: 'tpl-pull', name: 'משיכה', kind: 'training',
    slots: [slot('verticalPull', 'main'), slot('horizontalPull', 'main'), slot('biceps', 'secondary'), slot('grip', 'accessory'), slot('scapula', 'accessory')]
  },
  {
    id: 'tpl-legs-core', name: 'רגליים וליבה', kind: 'training',
    slots: [slot('squat', 'main'), slot('hipHinge', 'main'), slot('singleLeg', 'secondary'), slot('calves', 'accessory'), slot('coreFront', 'accessory'), slot('coreSide', 'accessory')]
  },
  {
    id: 'tpl-upper', name: 'פלג גוף עליון', kind: 'training',
    slots: [slot('horizontalPush', 'main'), slot('verticalPull', 'main'), slot('verticalPush', 'secondary'), slot('horizontalPull', 'secondary'), slot('coreFront', 'accessory')]
  },
  {
    id: 'tpl-lower-core', name: 'פלג גוף תחתון וליבה', kind: 'training',
    slots: [slot('singleLeg', 'main'), slot('hamstring', 'main'), slot('hipHinge', 'secondary'), slot('calves', 'accessory'), slot('coreSide', 'accessory'), slot('plank', 'accessory')]
  },
  // יום התאוששות פעילה (R-DAY-2): בלי עבודת כוח
  { id: 'tpl-recovery', name: 'מוביליטי ויציבה', kind: 'recovery', slots: [] }
];

/** R-DAY-1: תוכנית ברירת מחדל. אינדקס 0 = ראשון */
export const DEFAULT_WEEK_DAYS: DayPlan[] = [
  { dayType: 'training', templateId: 'tpl-push' },
  { dayType: 'training', templateId: 'tpl-pull' },
  { dayType: 'training', templateId: 'tpl-legs-core' },
  { dayType: 'activeRecovery', templateId: 'tpl-recovery' },
  { dayType: 'training', templateId: 'tpl-upper' },
  { dayType: 'training', templateId: 'tpl-lower-core' },
  { dayType: 'rest', templateId: null }
];

/** תוכנית היום לפי הגרסה שבתוקף (R-VER-1) */
export function dayPlanForDate(versions: WeekPlanVersion[], date: ISODate): DayPlan {
  const v = versionForDate(versions, date);
  const days = v ? v.days : DEFAULT_WEEK_DAYS;
  return days[dayOfWeek(date)];
}

/** בדיקת תוכנית שבועית: 7 ימים, ליום אימון יש תבנית אימון, ליום מנוחה אין תבנית */
export function validateWeekDays(days: DayPlan[], templates: Pick<DayTemplate, 'id' | 'kind'>[]): string[] {
  const errors: string[] = [];
  if (days.length !== 7) return ['התוכנית חייבת לכלול 7 ימים'];
  const kindOf = new Map(templates.map((t) => [t.id, t.kind]));
  const expected: Record<DayType, 'training' | 'recovery' | null> = { training: 'training', activeRecovery: 'recovery', rest: null };
  days.forEach((d, i) => {
    const want = expected[d.dayType];
    if (want === null) {
      if (d.templateId !== null) errors.push(`יום ${i + 1}: ביום מנוחה אין תבנית`);
    } else if (!d.templateId || kindOf.get(d.templateId) !== want) {
      errors.push(`יום ${i + 1}: צריך לבחור תבנית מתאימה`);
    }
  });
  return errors;
}
