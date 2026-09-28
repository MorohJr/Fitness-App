// מזווה, ארוחות, רישום אוכל ורשימת קניות (4.3, 4.4)
import type { FoodLog, ISODate, Meal, Nutrients, PantryItem, ShoppingItem, StockStatus } from '../../domain/types';
import { mealTotals, scale } from '../../domain/rules/R-NUT-food';
import { getDb } from '../db';
import { clock } from '../clock';
import { alive, newBase, touched } from './base';

// ===== מזווה =====
export type PantryInput = Pick<PantryItem, 'name' | 'category' | 'stock' | 'per100' | 'barcode' | 'source'>;

export async function listPantry(): Promise<PantryItem[]> {
  return alive((await getDb().data('pantryItems').toArray()) as PantryItem[]).sort((a, b) => a.name.localeCompare(b.name));
}

export async function findPantryByBarcode(code: string): Promise<PantryItem | undefined> {
  const rows = (await getDb().data('pantryItems').where('barcode').equals(code).toArray()) as PantryItem[];
  return alive(rows)[0];
}

function validNutrients(n: Nutrients): boolean {
  return [n.kcal, n.protein, n.carbs, n.fat].every((v) => Number.isFinite(v) && v >= 0) && n.kcal <= 950;
}

export async function savePantryItem(input: PantryInput, id?: string): Promise<PantryItem> {
  if (!input.name.trim()) throw new Error('חסר שם');
  if (!validNutrients(input.per100)) throw new Error('ערכים תזונתיים לא תקינים (ל-100 גרם)');
  const db = getDb();
  const clean = { ...input, name: input.name.trim(), barcode: input.barcode?.trim() || null };
  if (id) {
    const cur = (await db.data('pantryItems').get(id)) as PantryItem;
    const next = touched(cur, clean);
    await db.data('pantryItems').put(next);
    return next;
  }
  const rec: PantryItem = { ...newBase(), ...clean };
  await db.data('pantryItems').add(rec);
  return rec;
}

export async function setStock(id: string, stock: StockStatus): Promise<void> {
  const cur = (await getDb().data('pantryItems').get(id)) as PantryItem | undefined;
  if (cur) await getDb().data('pantryItems').put(touched(cur, { stock }));
}

export async function deletePantryItem(id: string): Promise<void> {
  const cur = (await getDb().data('pantryItems').get(id)) as PantryItem | undefined;
  if (cur) await getDb().data('pantryItems').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restorePantryItem(id: string): Promise<void> {
  const cur = (await getDb().data('pantryItems').get(id)) as PantryItem | undefined;
  if (cur) await getDb().data('pantryItems').put(touched(cur, { deletedAt: null }));
}

// ===== ארוחות =====
export type MealInput = Pick<Meal, 'name' | 'type' | 'photoId' | 'instructions' | 'ingredients' | 'inWeeklyMenu'>;

export async function listMeals(): Promise<Meal[]> {
  return alive((await getDb().data('meals').toArray()) as Meal[]).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMeal(id: string): Promise<Meal | undefined> {
  const m = (await getDb().data('meals').get(id)) as Meal | undefined;
  return m && !m.deletedAt ? m : undefined;
}

/** עריכת מתכון לא משנה ארוחות שכבר נרשמו (E1, 4.3) */
export async function saveMeal(input: MealInput, id?: string): Promise<Meal> {
  if (!input.name.trim()) throw new Error('חסר שם');
  if (input.ingredients.some((i) => !(i.grams > 0))) throw new Error('כמות בגרמים חייבת להיות גדולה מ-0');
  const db = getDb();
  const clean = { ...input, name: input.name.trim(), ingredients: input.ingredients.map((i) => ({ ...i })) };
  if (id) {
    const cur = (await db.data('meals').get(id)) as Meal;
    const next = touched(cur, clean);
    await db.data('meals').put(next);
    return next;
  }
  const rec: Meal = { ...newBase(), ...clean };
  await db.data('meals').add(rec);
  return rec;
}

export async function deleteMeal(id: string): Promise<void> {
  const cur = (await getDb().data('meals').get(id)) as Meal | undefined;
  if (cur) await getDb().data('meals').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restoreMeal(id: string): Promise<void> {
  const cur = (await getDb().data('meals').get(id)) as Meal | undefined;
  if (cur) await getDb().data('meals').put(touched(cur, { deletedAt: null }));
}

// ===== רישום אוכל =====
export async function listFoodLogs(date: ISODate): Promise<FoodLog[]> {
  const rows = (await getDb().data('foodLogs').where('date').equals(date).toArray()) as FoodLog[];
  return alive(rows).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listAllFoodLogs(): Promise<FoodLog[]> {
  return alive((await getDb().data('foodLogs').toArray()) as FoodLog[]);
}

async function addFoodLog(date: ISODate, rec: Omit<FoodLog, keyof import('../../domain/types').BaseRecord | 'date'>): Promise<FoodLog> {
  const log: FoodLog = { ...newBase(), date, ...rec };
  await getDb().data('foodLogs').add(log);
  return log;
}

/** ארוחה מהתפריט × מכפיל מנה. הערכים מחושבים עכשיו ונשמרים */
export async function logMeal(date: ISODate, mealId: string, servings: number): Promise<FoodLog> {
  if (!(servings > 0)) throw new Error('מכפיל מנה חייב להיות גדול מ-0');
  const meal = await getMeal(mealId);
  if (!meal) throw new Error('הארוחה לא נמצאה');
  const pantry = new Map((await getDb().data('pantryItems').toArray() as PantryItem[]).map((p) => [p.id, p]));
  const n = scale(mealTotals(meal, pantry), servings);
  return addFoodLog(date, { kind: 'meal', refId: meal.id, name: meal.name, amount: servings, ...n });
}

/** פריט מהמזווה בגרמים */
export async function logPantryItem(date: ISODate, itemId: string, grams: number): Promise<FoodLog> {
  if (!(grams > 0)) throw new Error('כמות חייבת להיות גדולה מ-0');
  const item = (await getDb().data('pantryItems').get(itemId)) as PantryItem | undefined;
  if (!item) throw new Error('הפריט לא נמצא');
  const n = scale(item.per100, grams / 100);
  return addFoodLog(date, { kind: 'pantry', refId: item.id, name: item.name, amount: grams, ...n });
}

/** קלוריות מהירות, עם חלבון אם ידוע */
export async function logQuick(date: ISODate, kcal: number, protein: number | null, name: string): Promise<FoodLog> {
  if (!(kcal > 0)) throw new Error('קלוריות חייבות להיות גדולות מ-0');
  return addFoodLog(date, { kind: 'quick', refId: null, name: name.trim() || 'קלוריות מהירות', amount: 1, kcal: Math.round(kcal), protein: protein ?? 0, carbs: 0, fat: 0 });
}

export async function deleteFoodLog(id: string): Promise<void> {
  const cur = (await getDb().data('foodLogs').get(id)) as FoodLog | undefined;
  if (cur) await getDb().data('foodLogs').put(touched(cur, { deletedAt: clock.iso() }));
}

export async function restoreFoodLog(id: string): Promise<void> {
  const cur = (await getDb().data('foodLogs').get(id)) as FoodLog | undefined;
  if (cur) await getDb().data('foodLogs').put(touched(cur, { deletedAt: null }));
}

/** תיקון רישום בעבר (E1, החריג): משנה רק את הרשומה הזו */
export async function updateFoodLog(id: string, patch: Partial<Pick<FoodLog, 'kcal' | 'protein' | 'carbs' | 'fat' | 'name'>>): Promise<void> {
  const cur = (await getDb().data('foodLogs').get(id)) as FoodLog | undefined;
  if (cur) await getDb().data('foodLogs').put(touched<FoodLog>(cur, patch as Partial<FoodLog>));
}

// ===== קניות =====
export async function listShopping(): Promise<ShoppingItem[]> {
  return alive((await getDb().data('shoppingItems').toArray()) as ShoppingItem[]);
}

export async function addManualShopping(name: string): Promise<void> {
  if (!name.trim()) return;
  const rec: ShoppingItem = { ...newBase(), name: name.trim(), category: 'other', bought: false, autoKey: null };
  await getDb().data('shoppingItems').add(rec);
}

/** סימון "נקנה". לפריט אוטומטי נשמר רק הסימון (R-NUT-6) */
export async function setBought(key: { id?: string; autoKey?: string; name: string; category: ShoppingItem['category'] }, bought: boolean): Promise<void> {
  const db = getDb();
  const list = await listShopping();
  const cur = key.id ? list.find((s) => s.id === key.id) : list.find((s) => s.autoKey === key.autoKey);
  if (cur) {
    await db.data('shoppingItems').put(touched(cur, { bought }));
    return;
  }
  const rec: ShoppingItem = { ...newBase(), name: key.name, category: key.category, bought, autoKey: key.autoKey ?? null };
  await db.data('shoppingItems').add(rec);
}

export async function deleteShopping(id: string): Promise<void> {
  const cur = (await getDb().data('shoppingItems').get(id)) as ShoppingItem | undefined;
  if (cur) await getDb().data('shoppingItems').put(touched(cur, { deletedAt: clock.iso() }));
}

/** אחרי קנייה: פריטים אוטומטיים שסומנו חוזרים ל"במלאי", וכל הסימונים מתנקים */
export async function finishShopping(): Promise<number> {
  const db = getDb();
  const bought = (await listShopping()).filter((s) => s.bought);
  let n = 0;
  await db.transaction('rw', db.data('shoppingItems'), db.data('pantryItems'), async () => {
    for (const s of bought) {
      if (s.autoKey) {
        const p = (await db.data('pantryItems').get(s.autoKey)) as PantryItem | undefined;
        if (p) {
          await db.data('pantryItems').put(touched(p, { stock: 'in' }));
          n++;
        }
      }
      await db.data('shoppingItems').put(touched(s, { deletedAt: clock.iso() }));
    }
  });
  return n;
}
