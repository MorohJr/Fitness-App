// R-BODY-1, R-BODY-2: אחוז שומן בשיטת הצי האמריקאי (ס"מ), מסה רזה ומסת שומן
import type { BodyMeasurement, Sex } from '../types';

export const BF_NOTE = 'סטייה אפשרית של כ-3–4%, מדויק למגמה';

export function navyBodyFat(sex: Sex, heightCm: number, waistCm: number, neckCm: number, hipsCm?: number | null): number | null {
  const r1 = (x: number) => Math.round(x * 10) / 10;
  if (sex === 'male') {
    const d = waistCm - neckCm;
    if (d <= 0) return null;
    return r1(495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(heightCm)) - 450);
  }
  if (!hipsCm) return null;
  const d = waistCm + hipsCm - neckCm;
  if (d <= 0) return null;
  return r1(495 / (1.29579 - 0.35004 * Math.log10(d) + 0.221 * Math.log10(heightCm)) - 450);
}

export interface Composition {
  bodyFat: number | null;
  leanKg: number | null;
  fatKg: number | null;
}

/** לפי הגובה והמין שנשמרו במדידה (📸) */
export function composition(m: Pick<BodyMeasurement, 'weightKg' | 'circ' | 'heightCm' | 'sex'>): Composition {
  const { waist, neck, hips } = m.circ;
  const bf = m.sex && m.heightCm && waist && neck ? navyBodyFat(m.sex, m.heightCm, waist, neck, hips) : null;
  if (bf === null || m.weightKg === null) return { bodyFat: bf, leanKg: null, fatKg: null };
  const lean = Math.round(m.weightKg * (1 - bf / 100) * 10) / 10;
  return { bodyFat: bf, leanKg: lean, fatKg: Math.round((m.weightKg - lean) * 10) / 10 };
}

/** שינוי מהמדידה הקודמת ומהבסיס (פרק 7) */
export function deltas(values: (number | null)[], index: number): { fromPrev: number | null; fromBase: number | null } {
  const cur = values[index];
  if (cur === null || cur === undefined) return { fromPrev: null, fromBase: null };
  const prev = values.slice(0, index).reverse().find((v) => v !== null && v !== undefined) ?? null;
  const base = values.slice(0, index).find((v) => v !== null && v !== undefined) ?? null;
  const r = (x: number) => Math.round(x * 10) / 10;
  return { fromPrev: prev === null ? null : r(cur - prev), fromBase: base === null ? null : r(cur - base) };
}
