// מדידה חדשה או עריכה, עם הנחיות המדידה (נספח ד') ותמונות
import { useEffect, useState } from 'preact/hooks';
import { CIRCUMFERENCES, type Circumference } from '../../../domain/types';
import { createPhotoSet, deleteMeasurement, listMeasurements, restoreMeasurement, saveMeasurement, type MeasurementInput } from '../../../data/repos/body';
import { getProfile } from '../../../data/repos/profile';
import { clock } from '../../../data/clock';
import { composition, BF_NOTE } from '../../../domain/calc/bodyfat';
import { useLive } from '../../hooks';
import { CIRC_LABELS } from '../../labels';
import { BackLink, DateField, ErrorList, Field, NumberField } from '../../components/Fields';
import { resizeImage } from '../../image';
import { navigate } from '../../router';
import { showToast } from '../../store';

const GUIDE = [
  'באותה שעה: בבוקר, אחרי שירותים, לפני אוכל ושתייה',
  'אותו סרט מדידה, צמוד לעור בלי ללחוץ, מקביל לרצפה',
  'מותניים: בגובה הטבור, בסוף נשיפה רגילה, בלי לכווץ בטן',
  'צוואר: מתחת לגרוגרת, הסרט מוטה מעט למטה בחזית',
  'זרוע: באמצע, שריר רפוי. ירך: בנקודה הרחבה ביותר',
  'חזה: בגובה הפטמות, בסוף נשיפה',
  'תמונות: אותו מקום, אותה תאורה, אותו מרחק, עמידה רפויה'
];
const VIEWS = [['front', 'חזית'], ['back', 'גב'], ['side', 'צד']] as const;

export function MeasureScreen({ id }: { id: string | null }) {
  const data = useLive(async () => ({ ms: await listMeasurements(), profile: await getProfile() }), [id]);
  const [f, setF] = useState<MeasurementInput | null>(null);
  const [files, setFiles] = useState<Partial<Record<'front' | 'back' | 'side', File>>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data || f) return;
    const m = id ? data.ms.find((x) => x.id === id) : undefined;
    setF(m ? { date: m.date, weightKg: m.weightKg, circ: { ...m.circ }, notes: m.notes } : { date: clock.today(), weightKg: null, circ: {}, notes: '' });
  }, [data]);
  if (!data || !f) return null;
  const existing = id ? data.ms.find((x) => x.id === id) : undefined;
  const setC = (c: Circumference, v: number | null) => setF({ ...f, circ: { ...f.circ, [c]: v } });
  const preview = composition({ weightKg: f.weightKg, circ: f.circ, heightCm: existing?.heightCm ?? data.profile?.heightCm ?? null, sex: existing?.sex ?? data.profile?.sex ?? null });

  async function save() {
    setBusy(true);
    try {
      const m = await saveMeasurement(f!, id ?? undefined);
      const blobs: Partial<Record<'front' | 'back' | 'side', Blob>> = {};
      for (const [v, file] of Object.entries(files)) if (file) blobs[v as 'front'] = await resizeImage(file);
      if (Object.keys(blobs).length) await createPhotoSet(m.date, m.id, blobs);
      showToast('המדידה נשמרה');
      navigate('/body');
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <BackLink to="/body" label="מדידות" />
      <h1>{id ? 'מדידה' : 'מדידה חדשה'}</h1>
      <details class="card" open={!id}>
        <summary>איך מודדים (נספח ד')</summary>
        <ul class="cues small" style={{ marginTop: '8px' }}>{GUIDE.map((g) => <li key={g}>{g}</li>)}</ul>
      </details>
      <div class="card">
        <DateField label="תאריך" value={f.date} onChange={(v) => setF({ ...f, date: v ?? clock.today() })} />
        <NumberField label="משקל" suffix='ק"ג' decimal step={0.1} value={f.weightKg} onChange={(weightKg) => setF({ ...f, weightKg })} />
        <div class="grid2">
          {CIRCUMFERENCES.map((c) => (
            <NumberField key={c} label={CIRC_LABELS[c]} suffix='ס"מ' decimal step={0.5} value={f.circ[c] ?? null} onChange={(v) => setC(c, v)} />
          ))}
        </div>
        {preview.bodyFat !== null && (
          <p class="small">אחוז שומן: <b>{preview.bodyFat}%</b>{preview.leanKg !== null ? ` · מסה רזה ${preview.leanKg} ק"ג · שומן ${preview.fatKg} ק"ג` : ''}. <span class="muted">{BF_NOTE}</span></p>
        )}
        {!data.profile?.heightCm || !data.profile?.sex ? <p class="small muted">לחישוב אחוז שומן צריך גובה ומין בפרופיל.</p> : null}
        <Field label="הערות">
          <textarea class="input" value={f.notes} onInput={(e) => setF({ ...f, notes: (e.currentTarget as HTMLTextAreaElement).value })} />
        </Field>
      </div>
      {!id && (
        <div class="card">
          <h2>תמונות (לא חובה)</h2>
          <p class="small muted">נשמרות מוקטנות. הסט הראשון הוא סט הבסיס, והוא לא נמחק לעולם.</p>
          {VIEWS.map(([v, l]) => (
            <label class="btn block" key={v} style={{ marginBottom: '8px' }}>
              {files[v] ? `✓ ${l}` : `צלם ${l}`}
              <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => setFiles({ ...files, [v]: (e.currentTarget as HTMLInputElement).files?.[0] })} />
            </label>
          ))}
        </div>
      )}
      <ErrorList errors={errors} />
      <button class="btn primary block" disabled={busy} onClick={save}>שמור</button>
      {id && (
        <button class="btn danger block" style={{ marginTop: '10px' }} onClick={async () => { await deleteMeasurement(id); navigate('/body'); showToast('המדידה נמחקה', () => restoreMeasurement(id)); }}>
          מחק מדידה
        </button>
      )}
    </div>
  );
}
