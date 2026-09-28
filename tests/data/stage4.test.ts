import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp, setNow, TARGETS } from './helpers';
import { finishShopping, listFoodLogs, listPantry, listShopping, logMeal, logPantryItem, logQuick, saveMeal, savePantryItem, setBought } from '../../src/data/repos/nutrition';
import { saveTargets } from '../../src/data/repos/targets';
import { savePhase, listPhases } from '../../src/data/repos/phases';
import { updateDayLog, getTargetsForDay } from '../../src/data/repos/dayLogs';
import { checkSmartAdjustment } from '../../src/data/checks';
import { listPendingSuggestions } from '../../src/data/repos/suggestions';
import { approveSuggestion } from '../../src/data/suggestionActions';
import { addDays } from '../../src/domain/calc/dates';
import { autoShoppingList } from '../../src/domain/rules/R-NUT-food';
import { listMeals } from '../../src/data/repos/nutrition';

const n = (kcal: number, protein: number, carbs: number, fat: number) => ({ kcal, protein, carbs, fat });

beforeEach(async () => {
  await freshApp('2026-09-28');
});

describe('✅ בדיקת קבלה: עריכת מתכון לא משנה ארוחות שכבר נרשמו', () => {
  it('הערכים והשם נשמרים ברגע הרישום', async () => {
    const chicken = await savePantryItem({ name: 'חזה עוף', category: 'protein', stock: 'in', per100: n(165, 31, 0, 3.6), barcode: null, source: 'manual' });
    const rice = await savePantryItem({ name: 'אורז', category: 'carbs', stock: 'in', per100: n(130, 2.7, 28, 0.3), barcode: null, source: 'manual' });
    const meal = await saveMeal({ name: 'עוף ואורז', type: 'lunch', photoId: null, instructions: '', ingredients: [{ pantryItemId: chicken.id, grams: 200 }, { pantryItemId: rice.id, grams: 150 }], inWeeklyMenu: false });
    await logMeal('2026-09-28', meal.id, 1);
    const before = (await listFoodLogs('2026-09-28'))[0];
    expect(before).toMatchObject({ name: 'עוף ואורז', kcal: 525, protein: 66.1 });

    // עריכת המתכון ושל הפריט במזווה
    await saveMeal({ name: 'עוף ואורז גדול', type: 'lunch', photoId: null, instructions: '', ingredients: [{ pantryItemId: chicken.id, grams: 400 }], inWeeklyMenu: false }, meal.id);
    await savePantryItem({ name: 'חזה עוף', category: 'protein', stock: 'in', per100: n(200, 20, 0, 10), barcode: null, source: 'manual' }, chicken.id);
    const after = (await listFoodLogs('2026-09-28'))[0];
    expect(after).toEqual(before);
  });
});

describe('רישום אוכל', () => {
  it('פריט בגרמים וקלוריות מהירות', async () => {
    const egg = await savePantryItem({ name: 'ביצה', category: 'protein', stock: 'in', per100: n(155, 13, 1.1, 11), barcode: '123', source: 'off' });
    await logPantryItem('2026-09-28', egg.id, 120);
    await logQuick('2026-09-28', 300, 20, 'חטיף');
    const logs = await listFoodLogs('2026-09-28');
    expect(logs.map((l) => l.kcal).sort()).toEqual([186, 300]);
    expect(logs.find((l) => l.kind === 'quick')).toMatchObject({ protein: 20, name: 'חטיף' });
  });
  it('ערכים לא סבירים נדחים', async () => {
    await expect(savePantryItem({ name: 'x', category: 'other', stock: 'in', per100: n(2000, 0, 0, 0), barcode: null, source: 'manual' })).rejects.toThrow();
    await expect(logQuick('2026-09-28', 0, null, '')).rejects.toThrow();
  });
});

describe('רשימת קניות (R-NUT-6)', () => {
  it('סימון נקנה וסיום קנייה מחזיר למלאי', async () => {
    const p = await savePantryItem({ name: 'חלב', category: 'protein', stock: 'out', per100: n(60, 3.3, 5, 3), barcode: null, source: 'manual' });
    const auto = autoShoppingList(await listPantry(), await listMeals());
    expect(auto.map((a) => a.key)).toEqual([p.id]);
    await setBought({ autoKey: p.id, name: p.name, category: p.category }, true);
    expect((await listShopping())[0].bought).toBe(true);
    expect(await finishShopping()).toBe(1);
    expect((await listPantry())[0].stock).toBe('in');
    expect(await listShopping()).toEqual([]);
  });
});

describe('R-NUT-3 מקצה לקצה', () => {
  async function fill14Days(startDate: string, kcal: number, weight: number) {
    for (let i = 0; i < 14; i++) {
      const d = addDays(startDate, i);
      setNow(d);
      await logQuick(d, kcal, 150, 'יום');
      await updateDayLog(d, { foodComplete: true, morningWeightKg: weight });
    }
  }
  it('בלי שלב: יעד חדש בגרסה ממחר', async () => {
    await saveTargets({ ...TARGETS, calories: 2000 });
    await fill14Days('2026-09-28', 2600, 80);
    setNow('2026-10-12');
    await checkSmartAdjustment();
    const [s] = await listPendingSuggestions();
    expect(s).toMatchObject({ type: 'calories' });
    expect(s.payload.calories).toBe(2600);
    await approveSuggestion(s.id);
    expect((await getTargetsForDay('2026-10-12')).calories).toBe(2000);
    expect((await getTargetsForDay('2026-10-13')).calories).toBe(2600);
  });
  it('עם שלב פעיל: שינוי בתוך השלב, ימים קודמים לא משתנים', async () => {
    await saveTargets(TARGETS);
    await savePhase({ type: 'cut', startDate: '2026-09-28', endDate: null, calories: 2100, weeklyRateKg: -0.5 });
    await fill14Days('2026-09-28', 2800, 80);
    setNow('2026-10-12');
    await checkSmartAdjustment();
    const [s] = await listPendingSuggestions();
    expect(s.payload.calories).toBe(2250); // 2800 - 0.5×7700/7
    await approveSuggestion(s.id);
    const [phase] = await listPhases();
    expect(phase.calorieChanges).toEqual([{ from: '2026-10-13', calories: 2250 }]);
    expect((await getTargetsForDay('2026-10-01')).calories).toBe(2100);
    expect((await getTargetsForDay('2026-10-13')).calories).toBe(2250);
  });
  it('לא בודקים לפני 14 יום', async () => {
    await saveTargets(TARGETS);
    await fill14Days('2026-09-28', 2600, 80);
    setNow('2026-10-05');
    await checkSmartAdjustment();
    expect(await listPendingSuggestions()).toEqual([]);
  });
});
