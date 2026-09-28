// מתכון: מרכיבים מהמזווה בגרמים, תמונה, הוראות
import { useEffect, useState } from 'preact/hooks';
import type { MealType } from '../../../domain/types';
import { deleteMeal, getMeal, listPantry, restoreMeal, saveMeal, type MealInput } from '../../../data/repos/nutrition';
import { deletePhoto, savePhoto } from '../../../data/repos/photos';
import { mealAvailability, mealTotals } from '../../../domain/rules/R-NUT-food';
import { useLive } from '../../hooks';
import { MEAL_TYPE_LABELS, fmtNum } from '../../labels';
import { BackLink, ErrorList, Field, NumberField, SelectField } from '../../components/Fields';
import { PhotoView } from '../../components/PhotoView';
import { resizeImage } from '../../image';
import { navigate } from '../../router';
import { showToast } from '../../store';

const EMPTY: MealInput = { name: '', type: 'lunch', photoId: null, instructions: '', ingredients: [], inWeeklyMenu: false };

export function MealScreen({ id }: { id: string | null }) {
  const data = useLive(async () => ({ meal: id ? await getMeal(id) : undefined, pantry: await listPantry() }), [id]);
  const [f, setF] = useState<MealInput | null>(null);
  const [addId, setAddId] = useState('');
  const [addG, setAddG] = useState<number | null>(100);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (!data || f) return;
    const m = data.meal;
    setF(m ? structuredClone({ name: m.name, type: m.type, photoId: m.photoId, instructions: m.instructions, ingredients: m.ingredients, inWeeklyMenu: m.inWeeklyMenu }) : { ...EMPTY, ingredients: [] });
  }, [data]);
  if (!data || !f) return null;
  const set = (p: Partial<MealInput>) => setF({ ...f, ...p });
  const pmap = new Map(data.pantry.map((p) => [p.id, p]));
  const t = mealTotals(f, pmap);
  const av = mealAvailability(f, pmap);

  async function onPhoto(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const blob = await resizeImage(file);
      const pid = await savePhoto(blob, { photoSetId: null, mealId: id, view: 'meal', date: null });
      if (f!.photoId) await deletePhoto(f!.photoId);
      set({ photoId: pid });
    } catch (err) {
      setErrors([(err as Error).message]);
    }
  }

  async function save() {
    try {
      await saveMeal(f!, id ?? undefined);
      showToast('הארוחה נשמרה. ארוחות שכבר נרשמו לא משתנות');
      navigate('/nutrition/meals');
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <div>
      <BackLink to="/nutrition/meals" label="ארוחות" />
      <h1>{id ? 'ארוחה' : 'ארוחה חדשה'}</h1>
      <div class="card">
        <Field label="שם">
          <input class="input" value={f.name} onInput={(e) => set({ name: (e.currentTarget as HTMLInputElement).value })} />
        </Field>
        <SelectField<MealType> label="סוג" value={f.type} options={(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((m) => ({ value: m, label: MEAL_TYPE_LABELS[m] }))} onChange={(type) => set({ type })} />
        <label class="check">
          <input type="checkbox" checked={f.inWeeklyMenu} onChange={(e) => set({ inWeeklyMenu: (e.currentTarget as HTMLInputElement).checked })} />
          בתפריט השבוע (לרשימת הקניות)
        </label>
      </div>

      <div class="card">
        <h2>מרכיבים</h2>
        {f.ingredients.map((ing, i) => {
          const p = pmap.get(ing.pantryItemId);
          return (
            <div class="log-item" key={ing.pantryItemId + i}>
              <div class="grow">
                <div>{p?.name ?? 'פריט שנמחק'}</div>
                <div class="sub">{p ? `${fmtNum((p.per100.kcal * ing.grams) / 100)} קק"ל` : ''}{p?.stock === 'out' ? ' · אזל' : ''}</div>
              </div>
              <input
                class="input"
                style={{ width: '90px' }}
                type="number"
                inputMode="numeric"
                value={ing.grams}
                aria-label="גרמים"
                onInput={(e) => set({ ingredients: f.ingredients.map((x, j) => (j === i ? { ...x, grams: Number((e.currentTarget as HTMLInputElement).value) } : x)) })}
              />
              <span class="small muted">ג'</span>
              <button class="icon-btn" aria-label="הסר" onClick={() => set({ ingredients: f.ingredients.filter((_, j) => j !== i) })}>✕</button>
            </div>
          );
        })}
        {data.pantry.length === 0 ? (
          <p class="small muted">המזווה ריק. <a href="#/nutrition/pantry/new">הוסף פריטים</a> קודם.</p>
        ) : (
          <div class="grid2" style={{ marginTop: '10px', alignItems: 'end' }}>
            <Field label="הוסף מרכיב">
              <select class="input" value={addId} onChange={(e) => setAddId((e.currentTarget as HTMLSelectElement).value)}>
                <option value="">בחר</option>
                {data.pantry.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <NumberField label="גרם" value={addG} onChange={setAddG} />
          </div>
        )}
        {addId && (
          <button class="btn block" onClick={() => { set({ ingredients: [...f.ingredients, { pantryItemId: addId, grams: addG ?? 100 }] }); setAddId(''); }}>
            + הוסף
          </button>
        )}
        <p class="small" style={{ marginTop: '12px' }}>
          סה"כ: <b class="num">{fmtNum(t.kcal)}</b> קק"ל · חלבון {fmtNum(t.protein)} · פחמ' {fmtNum(t.carbs)} · שומן {fmtNum(t.fat)}
        </p>
        {!av.available && f.ingredients.length > 0 && <p class="small muted">חסר במלאי: {av.missing.map((m) => m.name).join(', ')}</p>}
      </div>

      <div class="card">
        <h2>תמונה והוראות</h2>
        {f.photoId && <div style={{ maxWidth: '240px', marginBottom: '10px' }}><PhotoView id={f.photoId} /></div>}
        <label class="btn block">
          {f.photoId ? 'החלף תמונה' : 'הוסף תמונה (לא חובה)'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onPhoto} />
        </label>
        <Field label="הוראות">
          <textarea class="input" value={f.instructions} onInput={(e) => set({ instructions: (e.currentTarget as HTMLTextAreaElement).value })} />
        </Field>
      </div>

      <ErrorList errors={errors} />
      <button class="btn primary block" onClick={save}>שמור</button>
      {id && (
        <button
          class="btn danger block"
          style={{ marginTop: '10px' }}
          onClick={async () => {
            await deleteMeal(id);
            navigate('/nutrition/meals');
            showToast('הארוחה נמחקה', () => restoreMeal(id));
          }}
        >
          מחק ארוחה
        </button>
      )}
    </div>
  );
}
