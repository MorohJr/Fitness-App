// רשימת קניות עם סימון תוך כדי קנייה (R-NUT-6)
import { useState } from 'preact/hooks';
import type { PantryCategory } from '../../../domain/types';
import { addManualShopping, deleteShopping, finishShopping, listMeals, listPantry, listShopping, setBought } from '../../../data/repos/nutrition';
import { autoShoppingList } from '../../../domain/rules/R-NUT-food';
import { useLive } from '../../hooks';
import { PANTRY_CATEGORY_LABELS } from '../../labels';
import { showToast } from '../../store';
import { NutritionTabs } from './NutritionTabs';

export function ShoppingScreen() {
  const data = useLive(async () => {
    const [pantry, meals, marks] = await Promise.all([listPantry(), listMeals(), listShopping()]);
    return { auto: autoShoppingList(pantry, meals), marks };
  });
  const [name, setName] = useState('');
  if (!data) return null;
  const bought = (key: string) => data.marks.find((m) => m.autoKey === key)?.bought ?? false;
  const manual = data.marks.filter((m) => !m.autoKey);
  const cats = Object.keys(PANTRY_CATEGORY_LABELS) as PantryCategory[];
  const anyBought = data.marks.some((m) => m.bought);

  return (
    <div>
      <h1>תזונה</h1>
      <NutritionTabs active="/nutrition/shopping" />
      {data.auto.length === 0 && manual.length === 0 && <p class="muted">אין מה לקנות. פריטים שאזלו או שבמלאי נמוך יופיעו כאן לבד.</p>}
      {cats.map((c) => {
        const list = data.auto.filter((a) => a.category === c);
        if (!list.length) return null;
        return (
          <div class="card" key={c}>
            <h2>{PANTRY_CATEGORY_LABELS[c]}</h2>
            {list.map((a) => (
              <label class="check-row" key={a.key}>
                <input type="checkbox" checked={bought(a.key)} onChange={(e) => setBought({ autoKey: a.key, name: a.name, category: a.category }, (e.currentTarget as HTMLInputElement).checked)} />
                <span class="grow" style={bought(a.key) ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{a.name}</span>
                <span class="small muted">{a.why}</span>
              </label>
            ))}
          </div>
        );
      })}
      <div class="card">
        <h2>נוסף ידנית</h2>
        {manual.map((m) => (
          <div class="check-row" key={m.id}>
            <input type="checkbox" checked={m.bought} onChange={(e) => setBought({ id: m.id, name: m.name, category: m.category }, (e.currentTarget as HTMLInputElement).checked)} aria-label={m.name} />
            <span class="grow" style={m.bought ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{m.name}</span>
            <button class="icon-btn" aria-label={`מחק ${m.name}`} onClick={() => deleteShopping(m.id)}>✕</button>
          </div>
        ))}
        <div class="input-wrap" style={{ marginTop: '8px' }}>
          <input class="input" placeholder="פריט להוסיף" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} onKeyDown={async (e) => { if (e.key === 'Enter') { await addManualShopping(name); setName(''); } }} />
          <button class="btn" onClick={async () => { await addManualShopping(name); setName(''); }}>הוסף</button>
        </div>
      </div>
      {anyBought && (
        <button
          class="btn primary block"
          onClick={async () => {
            const n = await finishShopping();
            showToast(`סיימתי קנייה: ${n} פריטים חזרו ל"במלאי"`);
          }}
        >
          סיימתי קנייה: עדכן מלאי
        </button>
      )}
    </div>
  );
}
