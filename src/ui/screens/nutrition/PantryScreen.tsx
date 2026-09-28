// מזווה: שינוי סטטוס בלחיצה, לפי קטגוריה (פרק 7)
import type { PantryCategory, PantryItem, StockStatus } from '../../../domain/types';
import { listPantry, setStock } from '../../../data/repos/nutrition';
import { useLive } from '../../hooks';
import { PANTRY_CATEGORY_LABELS, STOCK_LABELS, fmtNum } from '../../labels';
import { NutritionTabs } from './NutritionTabs';

const NEXT: Record<StockStatus, StockStatus> = { in: 'low', low: 'out', out: 'in' };

export function PantryScreen() {
  const pantry = useLive(listPantry);
  if (!pantry) return null;
  const cats = Object.keys(PANTRY_CATEGORY_LABELS) as PantryCategory[];
  return (
    <div>
      <div class="row">
        <h1>תזונה</h1>
        <a class="btn" href="#/nutrition/pantry/new">+ פריט</a>
      </div>
      <NutritionTabs active="/nutrition/pantry" />
      {pantry.length === 0 && <p class="muted">המזווה ריק. הוסף פריטים בחיפוש, בסריקת ברקוד או ידנית.</p>}
      {cats.map((c) => {
        const list = pantry.filter((p) => p.category === c);
        if (!list.length) return null;
        return (
          <div class="card" key={c}>
            <h2>{PANTRY_CATEGORY_LABELS[c]}</h2>
            {list.map((p: PantryItem) => (
              <div class="log-item" key={p.id}>
                <a class="grow" href={`#/nutrition/pantry/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <div>{p.name}</div>
                  <div class="sub">
                    ל-100 ג': {fmtNum(p.per100.kcal)} קק"ל · חלבון {fmtNum(p.per100.protein, 1)}
                  </div>
                </a>
                <button class={`pill ${p.stock}`} onClick={() => setStock(p.id, NEXT[p.stock])} aria-label={`סטטוס מלאי: ${STOCK_LABELS[p.stock]}. לחץ לשינוי`}>
                  {STOCK_LABELS[p.stock]}
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
