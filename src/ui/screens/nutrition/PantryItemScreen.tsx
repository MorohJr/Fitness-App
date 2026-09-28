// פריט במזווה: חיפוש ב-Open Food Facts, סריקת ברקוד, או ידני
import { useEffect, useState } from 'preact/hooks';
import type { PantryCategory, StockStatus } from '../../../domain/types';
import { deletePantryItem, findPantryByBarcode, listPantry, restorePantryItem, savePantryItem, type PantryInput } from '../../../data/repos/nutrition';
import { productByBarcode, searchOff, type OffProduct } from '../../../data/external/openFoodFacts';
import { useLive } from '../../hooks';
import { PANTRY_CATEGORY_LABELS, STOCK_LABELS, fmtNum } from '../../labels';
import { BackLink, ErrorList, Field, NumberField, Segmented, SelectField } from '../../components/Fields';
import { BarcodeScanner } from '../../components/BarcodeScanner';
import { navigate } from '../../router';
import { showToast } from '../../store';

const EMPTY: PantryInput = { name: '', category: 'protein', stock: 'in', per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, barcode: null, source: 'manual' };

export function PantryItemScreen({ id }: { id: string | null }) {
  const pantry = useLive(listPantry);
  const [f, setF] = useState<PantryInput | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OffProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [scan, setScan] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (!pantry || f) return;
    const cur = id ? pantry.find((p) => p.id === id) : undefined;
    setF(cur ? structuredClone({ name: cur.name, category: cur.category, stock: cur.stock, per100: cur.per100, barcode: cur.barcode, source: cur.source }) : { ...EMPTY, per100: { ...EMPTY.per100 } });
  }, [pantry]);
  if (!pantry || !f) return null;
  const set = (p: Partial<PantryInput>) => setF({ ...f, ...p });
  const setN = (k: keyof PantryInput['per100'], v: number | null) => set({ per100: { ...f.per100, [k]: v ?? 0 } });

  const fromOff = (p: OffProduct) => {
    set({ name: p.brand ? `${p.name} (${p.brand})` : p.name, per100: p.per100, barcode: p.code || f.barcode, source: 'off' });
    setResults(null);
  };

  async function search() {
    if (!q.trim()) return;
    setBusy(true);
    setErrors([]);
    try {
      setResults(await searchOff(q.trim()));
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  async function onBarcode(code: string) {
    setScan(false);
    const existing = await findPantryByBarcode(code);
    if (existing && existing.id !== id) {
      showToast('הפריט כבר במזווה');
      navigate(`/nutrition/pantry/${existing.id}`);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const p = await productByBarcode(code);
      if (p) fromOff(p);
      else {
        set({ barcode: code });
        setErrors([`הברקוד ${code} לא נמצא ב-Open Food Facts. אפשר למלא ידנית`]);
      }
    } catch (e) {
      set({ barcode: code });
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    try {
      await savePantryItem(f!, id ?? undefined);
      showToast('נשמר');
      navigate('/nutrition/pantry');
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <div>
      <BackLink to="/nutrition/pantry" label="מזווה" />
      <h1>{id ? 'פריט' : 'פריט חדש'}</h1>
      {!id && (
        <div class="card">
          <h2>חיפוש (דורש אינטרנט)</h2>
          <div class="input-wrap">
            <input class="input" placeholder="למשל קוטג'" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
            <button class="btn" disabled={busy} onClick={search}>חפש</button>
          </div>
          <button class="btn block" style={{ marginTop: '10px' }} onClick={() => setScan(true)}>📷 סרוק ברקוד</button>
          {busy && <p class="small muted">מחפש…</p>}
          {results && results.length === 0 && <p class="small muted">לא נמצא. אפשר למלא ידנית.</p>}
          {results?.map((p) => (
            <a class="rung" key={p.code + p.name} href="#" onClick={(e) => { e.preventDefault(); fromOff(p); }}>
              <span class="grow">{p.name}{p.brand ? <span class="small muted"> · {p.brand}</span> : null}</span>
              <span class="small num">{fmtNum(p.per100.kcal)} קק"ל</span>
            </a>
          ))}
        </div>
      )}
      {scan && <BarcodeScanner onResult={onBarcode} onClose={() => setScan(false)} />}
      <ErrorList errors={errors} />
      <div class="card">
        <Field label="שם">
          <input class="input" value={f.name} onInput={(e) => set({ name: (e.currentTarget as HTMLInputElement).value })} />
        </Field>
        <SelectField<PantryCategory> label="קטגוריה" value={f.category} options={(Object.keys(PANTRY_CATEGORY_LABELS) as PantryCategory[]).map((c) => ({ value: c, label: PANTRY_CATEGORY_LABELS[c] }))} onChange={(category) => set({ category })} />
        <Segmented<StockStatus> label="מלאי" value={f.stock} options={(Object.keys(STOCK_LABELS) as StockStatus[]).map((s) => ({ value: s, label: STOCK_LABELS[s] }))} onChange={(stock) => set({ stock })} />
        <div class="label" style={{ margin: '4px 0 8px' }}>ערכים ל-100 גרם</div>
        <div class="grid2">
          <NumberField label="קלוריות" value={f.per100.kcal} onChange={(v) => setN('kcal', v)} />
          <NumberField label="חלבון" suffix="ג'" decimal step={0.1} value={f.per100.protein} onChange={(v) => setN('protein', v)} />
          <NumberField label="פחמימות" suffix="ג'" decimal step={0.1} value={f.per100.carbs} onChange={(v) => setN('carbs', v)} />
          <NumberField label="שומן" suffix="ג'" decimal step={0.1} value={f.per100.fat} onChange={(v) => setN('fat', v)} />
        </div>
        <Field label="ברקוד (לא חובה)">
          <input class="input en" inputMode="numeric" value={f.barcode ?? ''} onInput={(e) => set({ barcode: (e.currentTarget as HTMLInputElement).value || null })} />
        </Field>
        <p class="small muted">מקור: {f.source === 'off' ? 'Open Food Facts' : 'ידני'}. עריכה כאן לא משנה אוכל שכבר נרשם.</p>
        <button class="btn primary block" onClick={save}>שמור</button>
      </div>
      {id && (
        <button
          class="btn danger block"
          onClick={async () => {
            await deletePantryItem(id);
            navigate('/nutrition/pantry');
            showToast('הפריט נמחק', () => restorePantryItem(id));
          }}
        >
          מחק פריט
        </button>
      )}
    </div>
  );
}
