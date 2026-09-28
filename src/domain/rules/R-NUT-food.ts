// R-NUT-5, R-NUT-6: ערכי ארוחה, זמינות, רישום, רשימת קניות
import type { FoodLog, Meal, Nutrients, PantryCategory, PantryItem } from '../types';

const r1 = (n: number) => Math.round(n * 10) / 10;
export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function scale(n: Nutrients, factor: number): Nutrients {
  return { kcal: Math.round(n.kcal * factor), protein: r1(n.protein * factor), carbs: r1(n.carbs * factor), fat: r1(n.fat * factor) };
}

export function add(a: Nutrients, b: Nutrients): Nutrients {
  return { kcal: a.kcal + b.kcal, protein: r1(a.protein + b.protein), carbs: r1(a.carbs + b.carbs), fat: r1(a.fat + b.fat) };
}

/** R-NUT-5: סכום (גרמים ÷ 100 × ערך ל-100 גרם) */
export function mealTotals(meal: Pick<Meal, 'ingredients'>, pantry: Map<string, PantryItem>): Nutrients {
  let t = { ...ZERO };
  for (const ing of meal.ingredients) {
    const item = pantry.get(ing.pantryItemId);
    if (!item) continue;
    t = add(t, scale(item.per100, ing.grams / 100));
  }
  return t;
}

/** R-NUT-5: זמינה אם כל המרכיבים במלאי או במלאי נמוך */
export function mealAvailability(meal: Pick<Meal, 'ingredients'>, pantry: Map<string, PantryItem>): { available: boolean; missing: PantryItem[] } {
  const missing = meal.ingredients.map((i) => pantry.get(i.pantryItemId)).filter((p): p is PantryItem => !!p && !p.deletedAt && p.stock === 'out');
  const unknown = meal.ingredients.some((i) => !pantry.get(i.pantryItemId));
  return { available: !missing.length && !unknown, missing };
}

export function sumLogs(logs: Pick<FoodLog, 'kcal' | 'protein' | 'carbs' | 'fat'>[]): Nutrients {
  return logs.reduce((t, l) => add(t, { kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat }), { ...ZERO });
}

export interface ShoppingEntry {
  key: string;
  name: string;
  category: PantryCategory;
  why: string;
}

/** R-NUT-6: אזל או מלאי נמוך, ומרכיבים חסרים לארוחות "בתפריט השבוע" */
export function autoShoppingList(pantry: PantryItem[], meals: Meal[]): ShoppingEntry[] {
  const out = new Map<string, ShoppingEntry>();
  const alive = pantry.filter((p) => !p.deletedAt);
  for (const p of alive) {
    if (p.stock === 'out' || p.stock === 'low') out.set(p.id, { key: p.id, name: p.name, category: p.category, why: p.stock === 'out' ? 'אזל' : 'מלאי נמוך' });
  }
  const byId = new Map(alive.map((p) => [p.id, p]));
  for (const m of meals.filter((m) => !m.deletedAt && m.inWeeklyMenu)) {
    for (const miss of mealAvailability(m, byId).missing) {
      const cur = out.get(miss.id);
      out.set(miss.id, { key: miss.id, name: miss.name, category: miss.category, why: cur ? `${cur.why}, ל${m.name}` : `ל${m.name}` });
    }
  }
  return [...out.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
