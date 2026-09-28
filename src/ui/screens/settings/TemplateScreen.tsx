// עריכת תבנית אימון (4.2). שינוי לא משנה אימונים שעברו (E1)
import { useEffect, useState } from 'preact/hooks';
import type { DayTemplate, SlotPriority, TemplateSlot } from '../../../domain/types';
import { getDb } from '../../../data/db';
import { touched } from '../../../data/repos/base';
import { FAMILY_IDS, FAMILY_META, type FamilyId } from '../../../domain/families';
import { useLive } from '../../hooks';
import { BackLink, ErrorList, Field } from '../../components/Fields';
import { showToast } from '../../store';

const PRIO: Record<SlotPriority, string> = { main: 'ראשי', secondary: 'משני', accessory: 'אביזר' };

export function TemplateScreen({ id }: { id: string }) {
  const t = useLive(async () => (await getDb().data('dayTemplates').get(id)) as DayTemplate | undefined, [id]);
  const [name, setName] = useState('');
  const [slots, setSlots] = useState<TemplateSlot[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (t && !slots) {
      setName(t.name);
      setSlots(structuredClone(t.slots));
    }
  }, [t]);
  if (!t || !slots) return null;
  const setSlot = (i: number, p: Partial<TemplateSlot>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const strength = FAMILY_IDS.filter((f) => FAMILY_META[f].kind === 'strength');

  async function save() {
    if (!name.trim()) return setErrors(['חסר שם']);
    if (t!.kind === 'training' && !slots!.length) return setErrors(['צריך לפחות משבצת אחת']);
    await getDb().data('dayTemplates').put(touched(t!, { name: name.trim(), slots: slots! }));
    setErrors([]);
    showToast('התבנית נשמרה. אימונים שעברו לא משתנים');
  }

  return (
    <div>
      <BackLink to="/settings/week" label="תוכנית שבועית" />
      <h1>תבנית</h1>
      <div class="card">
        <Field label="שם">
          <input class="input" value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      </div>
      {t.kind === 'recovery' ? (
        <p class="muted">יום התאוששות פעילה: אין עבודת כוח (R-DAY-2).</p>
      ) : (
        <div class="card">
          <h2>משבצות</h2>
          {slots.map((s, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '8px 0' }}>
              <div class="grid2">
                <select class="input" value={s.family} onChange={(e) => setSlot(i, { family: (e.currentTarget as HTMLSelectElement).value })} aria-label="משפחה">
                  {strength.map((f) => <option key={f} value={f}>{FAMILY_META[f as FamilyId].name}</option>)}
                </select>
                <select class="input" value={s.priority} onChange={(e) => setSlot(i, { priority: (e.currentTarget as HTMLSelectElement).value as SlotPriority })} aria-label="עדיפות">
                  {(Object.keys(PRIO) as SlotPriority[]).map((p) => <option key={p} value={p}>{PRIO[p]}</option>)}
                </select>
              </div>
              <div class="row" style={{ marginTop: '6px' }}>
                <span class="small">סטים: <b>{s.sets}</b></span>
                <span>
                  <button class="btn" disabled={s.sets <= 1} onClick={() => setSlot(i, { sets: s.sets - 1 })}>−</button>{' '}
                  <button class="btn" disabled={s.sets >= 4} onClick={() => setSlot(i, { sets: s.sets + 1 })}>+</button>{' '}
                  <button class="btn danger" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>הסר</button>
                </span>
              </div>
            </div>
          ))}
          <button class="btn block" style={{ marginTop: '10px' }} onClick={() => setSlots([...slots, { family: 'coreFront', priority: 'accessory', sets: 2 }])}>+ משבצת</button>
        </div>
      )}
      <ErrorList errors={errors} />
      <button class="btn primary block" onClick={save}>שמור</button>
    </div>
  );
}
