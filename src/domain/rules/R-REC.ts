// R-REC: התאוששות
import type { DayLog } from '../types';

/** ציון שינה (R-REC-1): 7–9 שעות = 10, כל שעה פחות מ-7 מורידה 2 (הדרגתי), מעל 9 = 9, לא פחות מ-1 */
export function sleepScore(hours: number): number {
  if (hours > 9) return 9;
  if (hours >= 7) return 10;
  return Math.max(1, Math.round((10 - 2 * (7 - hours)) * 10) / 10);
}

export interface RecoveryResult {
  score: number | null;
  manual: boolean;
  parts: { label: string; value: number }[];
}

type RecInput = Pick<DayLog, 'sleepHours' | 'sleepQuality' | 'energy' | 'doms' | 'manualRecovery'>;

/** R-REC-1: ממוצע הנתונים שקיימים. ידני דורס. בלי נתונים = אין ציון */
export function recoveryScore(d: RecInput): RecoveryResult {
  const parts: { label: string; value: number }[] = [];
  if (typeof d.sleepHours === 'number') parts.push({ label: 'שינה', value: sleepScore(d.sleepHours) });
  if (typeof d.sleepQuality === 'number') parts.push({ label: 'איכות שינה', value: d.sleepQuality });
  if (typeof d.energy === 'number') parts.push({ label: 'אנרגיה', value: d.energy });
  if (typeof d.doms === 'number') parts.push({ label: '11 פחות DOMS', value: 11 - d.doms });
  if (typeof d.manualRecovery === 'number') return { score: d.manualRecovery, manual: true, parts };
  if (!parts.length) return { score: null, manual: false, parts };
  const avg = parts.reduce((a, p) => a + p.value, 0) / parts.length;
  return { score: Math.round(avg * 10) / 10, manual: false, parts };
}

/** R-REC-2: ציון מתחת ל-4 */
export const LOW_RECOVERY = 4;
export function isLowRecovery(score: number | null): boolean {
  return score !== null && score < LOW_RECOVERY;
}
