// תוויות בעברית לערכים קבועים
import type { ActivityLevel, DayType, PhaseType, Sex, ThemeMode } from '../domain/types';

export const SEX_LABELS: Record<Sex, string> = { male: 'גבר', female: 'אישה' };
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'יושבני (1.4)',
  light: 'קל (1.5)',
  moderate: 'בינוני (1.6)',
  high: 'גבוה (1.7)'
};
export const PHASE_LABELS: Record<PhaseType, string> = { cut: 'חיטוב', bulk: 'מסה', recomp: 'ריקומפוזיציה', maintain: 'תחזוקה' };
export const DAY_TYPE_LABELS: Record<DayType, string> = { training: 'אימון', activeRecovery: 'התאוששות פעילה', rest: 'מנוחה מלאה' };
export const THEME_LABELS: Record<ThemeMode, string> = { system: 'לפי המכשיר', light: 'בהיר', dark: 'כהה' };
export const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const fmtNum = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? '—' : n.toLocaleString('he-IL', { maximumFractionDigits: digits });

/** מספר עם סימן (+/−), מבודד משמאל לימין כדי שהמינוס לא יקפוץ לצד השני בעברית */
export const fmtSigned = (n: number, suffix = '') => `⁦${n > 0 ? '+' : ''}${n}${suffix}⁩`;

// ===== שלב 2 =====
import type { ExerciseStatus, InjuryStatus, LocationId, MeasureType } from '../domain/types';

export const STATUS_EMOJI: Record<ExerciseStatus, string> = { red: '🔴', yellow: '🟡', green: '🟢' };
export const STATUS_LABELS: Record<ExerciseStatus, string> = { red: 'טכניקה', yellow: 'התקדמות', green: 'שליטה מלאה' };
export const MEASURE_LABELS: Record<MeasureType, string> = { reps: 'חזרות', time: 'זמן', repsLoad: 'חזרות + עומס' };
export const MEASURE_UNIT: Record<MeasureType, string> = { reps: 'חזרות', time: 'שניות', repsLoad: 'חזרות' };
export const INJURY_STATUS_LABELS: Record<InjuryStatus, string> = { active: 'כאב פעיל', recovering: 'בהחלמה', healed: 'החלים' };
export const LOCATION_LABELS: Record<LocationId, string> = { home: 'בית', outdoor: 'חוץ' };

// ===== שלב 4 =====
import type { MealType, PantryCategory, StockStatus } from '../domain/types';
export const PANTRY_CATEGORY_LABELS: Record<PantryCategory, string> = { protein: 'חלבון', carbs: 'פחמימות', fats: 'שומנים', produce: 'ירקות ופירות', other: 'תוספים ותבלינים' };
export const STOCK_LABELS: Record<StockStatus, string> = { in: 'במלאי', low: 'מלאי נמוך', out: 'אזל' };
export const MEAL_TYPE_LABELS: Record<MealType, string> = { breakfast: 'בוקר', lunch: 'צהריים', dinner: 'ערב', snack: 'נשנוש', postWorkout: 'אחרי אימון' };

// ===== שלב 6 =====
import type { Circumference } from '../domain/types';
export const CIRC_LABELS: Record<Circumference, string> = { chest: 'חזה', waist: 'מותניים', neck: 'צוואר', hips: 'אגן', armR: 'זרוע ימין', armL: 'זרוע שמאל', thighR: 'ירך ימין', thighL: 'ירך שמאל' };
/** שינוי עם סימן, מבודד משמאל לימין */
export const fmtDelta = (n: number | null, unit = '') => (n === null ? '—' : fmtSigned(n, unit));
