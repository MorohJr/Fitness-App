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
