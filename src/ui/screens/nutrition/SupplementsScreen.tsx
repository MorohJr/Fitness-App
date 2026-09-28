// ניהול תוספים (4.4)
import { useState } from 'preact/hooks';
import type { Supplement, SupplementTiming } from '../../../domain/types';
import { deleteSupplement, listSupplements, restoreSupplement, saveSupplement, type SupplementInput } from '../../../data/repos/supplements';
import { useLive } from '../../hooks';
import { ErrorList, Field, Segmented } from '../../components/Fields';
import { showToast } from '../../store';
import { NutritionTabs } from './NutritionTabs';
import { TIMING_LABELS } from '../today/TodayScreen';

const EMPTY: SupplementInput = { name: '', dose: '', timing: 'morning', active: true };

export function SupplementsScreen() {
  const list = useLive(listSupplements);
  const [edit, setEdit] = useState<{ id?: string; v: SupplementInput } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  if (!list) return null;

  async function save() {
    try {
      await saveSupplement(edit!.v, edit!.id);
      setEdit(null);
      setErrors([]);
      showToast('התוסף נשמר');
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <div>
      <h1>תזונה</h1>
      <NutritionTabs active="/nutrition/supplements" />
      {edit ? (
        <div class="card">
          <Field label="שם">
            <input class="input" value={edit.v.name} onInput={(e) => setEdit({ ...edit, v: { ...edit.v, name: (e.currentTarget as HTMLInputElement).value } })} />
          </Field>
          <Field label="מינון">
            <input class="input" placeholder={'למשל 5 ג\''} value={edit.v.dose} onInput={(e) => setEdit({ ...edit, v: { ...edit.v, dose: (e.currentTarget as HTMLInputElement).value } })} />
          </Field>
          <Segmented<SupplementTiming>
            label="תזמון"
            value={edit.v.timing}
            options={(Object.keys(TIMING_LABELS) as SupplementTiming[]).map((t) => ({ value: t, label: TIMING_LABELS[t] }))}
            onChange={(timing) => setEdit({ ...edit, v: { ...edit.v, timing } })}
          />
          <label class="check">
            <input type="checkbox" checked={edit.v.active} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, active: (e.currentTarget as HTMLInputElement).checked } })} />
            פעיל (מופיע במסך היום)
          </label>
          <ErrorList errors={errors} />
          <div class="actions">
            <button class="btn" onClick={() => setEdit(null)}>ביטול</button>
            <button class="btn primary" onClick={save}>שמור</button>
          </div>
        </div>
      ) : (
        <button class="btn primary block" style={{ marginBottom: '14px' }} onClick={() => setEdit({ v: { ...EMPTY } })}>+ תוסף</button>
      )}
      <div class="list">
        {list.length === 0 && <div class="item muted">אין תוספים</div>}
        {list.map((s: Supplement) => (
          <div class="item" key={s.id}>
            <span class="grow">
              {s.name} <span class="small muted">{s.dose} · {TIMING_LABELS[s.timing]}{s.active ? '' : ' · לא פעיל'}</span>
            </span>
            <button class="btn" onClick={() => setEdit({ id: s.id, v: { name: s.name, dose: s.dose, timing: s.timing, active: s.active } })}>ערוך</button>
            <button
              class="btn danger"
              aria-label={`מחק ${s.name}`}
              onClick={async () => {
                await deleteSupplement(s.id);
                showToast('התוסף נמחק', () => restoreSupplement(s.id));
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
