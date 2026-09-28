// ארוחות ומתכונים עם ערכים וזמינות (פרק 7)
import { listMeals, listPantry, saveMeal } from '../../../data/repos/nutrition';
import { mealAvailability, mealTotals } from '../../../domain/rules/R-NUT-food';
import { useLive } from '../../hooks';
import { MEAL_TYPE_LABELS, fmtNum } from '../../labels';
import { NutritionTabs } from './NutritionTabs';

export function MealsScreen() {
  const data = useLive(async () => ({ meals: await listMeals(), pantry: await listPantry() }));
  if (!data) return null;
  const pmap = new Map(data.pantry.map((p) => [p.id, p]));
  return (
    <div>
      <div class="row">
        <h1>תזונה</h1>
        <a class="btn" href="#/nutrition/meal/new">+ ארוחה</a>
      </div>
      <NutritionTabs active="/nutrition/meals" />
      {data.meals.length === 0 && <p class="muted">אין ארוחות. ארוחה בנויה ממרכיבים מהמזווה, בגרמים.</p>}
      {data.meals.map((m) => {
        const t = mealTotals(m, pmap);
        const av = mealAvailability(m, pmap);
        return (
          <div class="ex-card" key={m.id}>
            <div class="row">
              <a href={`#/nutrition/meal/${m.id}`} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}>{m.name}</a>
              <span class={`badge${av.available ? ' accent' : ' warn'}`}>{av.available ? 'זמינה' : `חסר: ${av.missing.map((x) => x.name).join(', ') || 'מרכיב'}`}</span>
            </div>
            <div class="meta">
              {MEAL_TYPE_LABELS[m.type]} · {fmtNum(t.kcal)} קק"ל · חלבון {fmtNum(t.protein)} · פחמ' {fmtNum(t.carbs)} · שומן {fmtNum(t.fat)}
            </div>
            <label class="check" style={{ minHeight: '36px' }}>
              <input type="checkbox" checked={m.inWeeklyMenu} onChange={(e) => saveMeal({ ...m, inWeeklyMenu: (e.currentTarget as HTMLInputElement).checked }, m.id)} />
              <span class="small">בתפריט השבוע</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
