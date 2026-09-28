// טופס תרגיל: עריכה, או תרגיל חדש שלי
import { useState } from 'preact/hooks';
import type { Exercise, FamilyLevel, LocationId, MeasureType } from '../../../domain/types';
import { FAMILY_IDS, FAMILY_META, REST_BY_ROLE, type FamilyId } from '../../../domain/families';
import { MUSCLES, MUSCLE_IDS } from '../../../domain/muscles';
import type { EquipmentItem } from '../../../domain/types';
import { LOCATION_LABELS, MEASURE_LABELS } from '../../labels';
import { ErrorList, Field, NumberField, Segmented } from '../../components/Fields';
import { ChipsSelect } from '../../components/ExerciseBits';

export interface ExerciseFormValue {
  name: string;
  families: FamilyLevel[];
  measure: MeasureType;
  unilateral: boolean;
  equipment: string[];
  locations: LocationId[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  targetMin: number;
  targetMax: number;
  secondsPerSet: number;
  restSec: number;
  tempo: string;
  cues: string[];
  safety: string;
}

export function formFromExercise(e: Exercise): ExerciseFormValue {
  const { name, families, measure, unilateral, equipment, locations, primaryMuscles, secondaryMuscles, targetMin, targetMax, secondsPerSet, restSec, tempo, cues, safety } = e;
  return structuredClone({ name, families, measure, unilateral, equipment, locations, primaryMuscles, secondaryMuscles, targetMin, targetMax, secondsPerSet, restSec, tempo, cues, safety });
}

export function emptyForm(): ExerciseFormValue {
  return {
    name: '', families: [{ family: 'horizontalPush', level: 1 }], measure: 'reps', unilateral: false, equipment: [], locations: ['home', 'outdoor'],
    primaryMuscles: [], secondaryMuscles: [], targetMin: 6, targetMax: 12, secondsPerSet: 45, restSec: 120, tempo: '3-1-1-0', cues: [], safety: ''
  };
}

interface Props {
  initial: ExerciseFormValue;
  /** בתרגיל מהמאגר: שם ומשפחות לא נערכים */
  editIdentity: boolean;
  equipmentList: EquipmentItem[];
  submitLabel: string;
  onSubmit: (v: ExerciseFormValue) => Promise<void>;
  onCancel: () => void;
}

export function ExerciseForm({ initial, editIdentity, equipmentList, submitLabel, onSubmit, onCancel }: Props) {
  const [f, setF] = useState<ExerciseFormValue>(initial);
  const [cuesText, setCuesText] = useState(initial.cues.join('\n'));
  const [errors, setErrors] = useState<string[]>([]);
  const set = (p: Partial<ExerciseFormValue>) => setF({ ...f, ...p });
  const fam0 = f.families[0];

  async function submit() {
    const e: string[] = [];
    if (editIdentity && !f.name.trim()) e.push('חסר שם');
    if (!(f.targetMin > 0 && f.targetMax > f.targetMin)) e.push('טווח יעד לא תקין');
    if (!(f.restSec >= 0)) e.push('מנוחה לא תקינה');
    if (!f.locations.length) e.push('בחר לפחות מיקום אחד');
    setErrors(e);
    if (e.length) return;
    try {
      await onSubmit({ ...f, cues: cuesText.split('\n').map((s) => s.trim()).filter(Boolean) });
    } catch (err) {
      setErrors([(err as Error).message]);
    }
  }

  return (
    <div class="card">
      {editIdentity && (
        <>
          <Field label="שם (באנגלית)">
            <input class="input en" value={f.name} onInput={(e) => set({ name: (e.currentTarget as HTMLInputElement).value })} />
          </Field>
          <div class="grid2">
            <Field label="משפחה">
              <select
                class="input"
                value={fam0.family}
                onChange={(e) => {
                  const family = (e.currentTarget as HTMLSelectElement).value as FamilyId;
                  set({ families: [{ family, level: fam0.level }], restSec: REST_BY_ROLE[FAMILY_META[family].role] });
                }}
              >
                {FAMILY_IDS.map((x) => <option key={x} value={x}>{FAMILY_META[x].name}</option>)}
              </select>
            </Field>
            <NumberField label="רמה בסולם" min={1} value={fam0.level} onChange={(v) => set({ families: [{ family: fam0.family, level: v ?? 1 }] })} />
          </div>
          <Segmented<MeasureType>
            label="סוג מדידה"
            value={f.measure}
            options={(Object.keys(MEASURE_LABELS) as MeasureType[]).map((m) => ({ value: m, label: MEASURE_LABELS[m] }))}
            onChange={(measure) => set({ measure })}
          />
          <label class="check">
            <input type="checkbox" checked={f.unilateral} onChange={(e) => set({ unilateral: (e.currentTarget as HTMLInputElement).checked })} />
            חד-צדדי (כל צד בנפרד)
          </label>
        </>
      )}
      <div class="grid2">
        <NumberField label={`טווח: מ-`} value={f.targetMin} onChange={(v) => set({ targetMin: v ?? 0 })} suffix={f.measure === 'time' ? 'שנ\'' : ''} />
        <NumberField label="עד" value={f.targetMax} onChange={(v) => set({ targetMax: v ?? 0 })} suffix={f.measure === 'time' ? 'שנ\'' : ''} />
        <NumberField label="מנוחה" suffix="שנ'" step={15} value={f.restSec} onChange={(v) => set({ restSec: v ?? 0 })} />
        <NumberField label="זמן לסט" suffix="שנ'" step={5} value={f.secondsPerSet} onChange={(v) => set({ secondsPerSet: v ?? 0 })} />
      </div>
      <Field label="קצב (ירידה-עצירה-עלייה-עצירה)">
        <input class="input en" value={f.tempo} onInput={(e) => set({ tempo: (e.currentTarget as HTMLInputElement).value })} />
      </Field>
      <div class="field">
        <span class="label">ציוד נדרש</span>
        <ChipsSelect options={equipmentList.map((q) => ({ value: q.id, label: q.name }))} value={f.equipment} onChange={(equipment) => set({ equipment })} />
      </div>
      <div class="field">
        <span class="label">מיקומים אפשריים</span>
        <ChipsSelect<LocationId> options={(['home', 'outdoor'] as LocationId[]).map((l) => ({ value: l, label: LOCATION_LABELS[l] }))} value={f.locations} onChange={(locations) => set({ locations })} />
      </div>
      <div class="field">
        <span class="label">שרירים ראשיים</span>
        <ChipsSelect options={MUSCLE_IDS.map((m) => ({ value: m, label: MUSCLES[m].name }))} value={f.primaryMuscles} onChange={(primaryMuscles) => set({ primaryMuscles })} />
      </div>
      <div class="field">
        <span class="label">שרירים משניים</span>
        <ChipsSelect options={MUSCLE_IDS.map((m) => ({ value: m, label: MUSCLES[m].name }))} value={f.secondaryMuscles} onChange={(secondaryMuscles) => set({ secondaryMuscles })} />
      </div>
      <Field label="דגשי טכניקה (שורה לכל דגש)">
        <textarea class="input" value={cuesText} onInput={(e) => setCuesText((e.currentTarget as HTMLTextAreaElement).value)} />
      </Field>
      <Field label="בטיחות">
        <input class="input" value={f.safety} onInput={(e) => set({ safety: (e.currentTarget as HTMLInputElement).value })} />
      </Field>
      <ErrorList errors={errors} />
      <div class="actions">
        <button class="btn" onClick={onCancel}>ביטול</button>
        <button class="btn primary" onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  );
}
