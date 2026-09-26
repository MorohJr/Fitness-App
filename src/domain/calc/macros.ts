// מאקרו (R-NUT-2)
export interface Macros {
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** true אם החלבון והשומן לבד עוברים את הקלוריות, והפחמימות נחתכו ל-0 */
  carbsClamped: boolean;
}

export function macrosFor(calories: number, weightKg: number, proteinPerKg: number, fatPerKgMin: number): Macros {
  const proteinG = Math.round(proteinPerKg * weightKg);
  const fatG = Math.round(fatPerKgMin * weightKg);
  const rest = calories - proteinG * 4 - fatG * 9;
  return { proteinG, fatG, carbsG: Math.max(0, Math.round(rest / 4)), carbsClamped: rest < 0 };
}
