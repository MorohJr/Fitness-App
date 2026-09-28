// רישום אוכל ליום (פרק 7): ארוחה / פריט בגרמים / קלוריות מהירות
import { useState } from 'preact/hooks';
import type { ISODate } from '../../../domain/types';
import { clock } from '../../../data/clock';
import { deleteFoodLog, listFoodLogs, listMeals, listPantry, logMeal, logPantryItem, logQuick, restoreFoodLog } from '../../../data/repos/nutrition';
import { getTargetsForDay } from '../../../data/repos/dayLogs';
import { mealAvailability, mealTotals, sumLogs } from '../../../domain/rules/R-NUT-food';
import { addDays, formatDate } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { fmtNum } from '../../labels';
import { ErrorList, Field, NumberField, Segmented } from '../../components/Fields';
import { MacroBars } from '../../components/Macros';
import { showToast } from '../../store';
import { NutritionTabs } from './NutritionTabs';

type Kind = 'meal' | 'pantry' | 'quick';

export function LogScreen({ date: dateParam }: { date?: string }) {
  const today = clock.today();
  const date: ISODate = dateParam && dateParam <= today ? dateParam : today;
  const data = useLive(async () => {
    const [logs, meals, pantry, targets] = await Promise.all([listFoodLogs(date), listMeals(), listPantry(), getTargetsForDay(date)]);
    return { logs, meals, pantry, targets };
  }, [date]);
  const [kind, setKind] = useState<Kind>('meal');
  const [mealId, setMealId] = useState('');
  const [servings, setServings] = useState<number | null>(1);
  const [itemQ, setItemQ] = useState('');
  const [itemId, setItemId] = useState('');
  const [grams, setGrams] = useState<number | null>(100);
  const [qKcal, setQKcal] = useState<number | null>(null);
  const [qProt, setQProt] = useState<number | null>(null);
  const [qName, setQName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  if (!data) return null;
  const { logs, meals, pantry, targets } = data;
  const pmap = new Map(pantry.map((p) => [p.id, p]));
  const eaten = sumLogs(logs);

  async function add() {
    try {
      const log = kind === 'meal' ? await logMeal(date, mealId, servings ?? 0) : kind === 'pantry' ? await logPantryItem(date, itemId, grams ?? 0) : await logQuick(date, qKcal ?? 0, qProt, qName);
      setErrors([]);
      setQKcal(null);
      setQProt(null);
      setQName('');
      showToast(`נרשם: ${log.name} (${fmtNum(log.kcal)} קק"ל)`, () => deleteFoodLog(log.id));
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  const items = pantry.filter((p) => !itemQ || p.name.includes(itemQ)).slice(0, 8);

  return (
    <div>
      <h1>תזונה</h1>
      <NutritionTabs active="/nutrition" />
      <div class="daynav">
        <a href={`#/nutrition/log/${addDays(date, -1)}`} aria-label="יום קודם">›</a>
        <strong>{date === today ? 'היום' : formatDate(date)}</strong>
        {date < today ? <a href={`#/nutrition/log/${addDays(date, 1)}`} aria-label="יום הבא">‹</a> : <span style={{ width: '44px' }} />}
      </div>

      <div class="card">
        <MacroBars eaten={eaten} t={targets} />
      </div>

      <div class="card">
        <h2>רישום</h2>
        <Segmented<Kind> value={kind} options={[{ value: 'meal', label: 'ארוחה' }, { value: 'pantry', label: 'פריט' }, { value: 'quick', label: 'מהיר' }]} onChange={setKind} />
        {kind === 'meal' &&
          (meals.length === 0 ? (
            <p class="small muted">אין עדיין ארוחות. <a href="#/nutrition/meal/new">צור ארוחה</a></p>
          ) : (
            <>
              <Field label="ארוחה">
                <select class="input" value={mealId} onChange={(e) => setMealId((e.currentTarget as HTMLSelectElement).value)}>
                  <option value="">בחר</option>
                  {meals.map((m) => {
                    const t = mealTotals(m, pmap);
                    const av = mealAvailability(m, pmap).available;
                    return <option key={m.id} value={m.id}>{m.name} · {fmtNum(t.kcal)} קק"ל{av ? '' : ' · חסר מרכיב'}</option>;
                  })}
                </select>
              </Field>
              <NumberField label="מנות" decimal step={0.25} value={servings} onChange={setServings} />
            </>
          ))}
        {kind === 'pantry' &&
          (pantry.length === 0 ? (
            <p class="small muted">המזווה ריק. <a href="#/nutrition/pantry/new">הוסף פריט</a></p>
          ) : (
            <>
              <Field label="חיפוש במזווה">
                <input class="input" value={itemQ} onInput={(e) => setItemQ((e.currentTarget as HTMLInputElement).value)} />
              </Field>
              <div class="chips-sel" style={{ marginBottom: '12px' }}>
                {items.map((p) => (
                  <button type="button" key={p.id} aria-pressed={p.id === itemId} onClick={() => setItemId(p.id)}>{p.name}</button>
                ))}
              </div>
              <NumberField label="כמות" suffix="גרם" step={10} value={grams} onChange={setGrams} />
              {itemId && grams ? <p class="small muted">≈ {fmtNum(((pmap.get(itemId)?.per100.kcal ?? 0) * grams) / 100)} קק"ל</p> : null}
            </>
          ))}
        {kind === 'quick' && (
          <>
            <div class="grid2">
              <NumberField label="קלוריות" value={qKcal} onChange={setQKcal} />
              <NumberField label="חלבון (לא חובה)" suffix="ג'" value={qProt} onChange={setQProt} />
            </div>
            <Field label="שם (לא חובה)">
              <input class="input" value={qName} onInput={(e) => setQName((e.currentTarget as HTMLInputElement).value)} />
            </Field>
          </>
        )}
        <ErrorList errors={errors} />
        <button class="btn primary block" onClick={add}>הוסף</button>
      </div>

      <div class="card">
        <h2>נאכל {date === today ? 'היום' : 'ביום הזה'}</h2>
        {logs.length === 0 && <p class="small muted">עוד לא נרשם כלום.</p>}
        {logs.map((l) => (
          <div class="log-item" key={l.id}>
            <div class="grow">
              <div>{l.name}</div>
              <div class="sub">
                {l.kind === 'meal' ? `${l.amount} מנות` : l.kind === 'pantry' ? `${l.amount} גרם` : 'מהיר'} · חלבון {fmtNum(l.protein)} · פחמ' {fmtNum(l.carbs)} · שומן {fmtNum(l.fat)}
              </div>
            </div>
            <span class="num">{fmtNum(l.kcal)}</span>
            <button
              class="icon-btn"
              aria-label={`מחק ${l.name}`}
              onClick={async () => {
                await deleteFoodLog(l.id);
                showToast('נמחק', () => restoreFoodLog(l.id));
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
