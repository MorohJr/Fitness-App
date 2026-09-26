// פרופיל (4.1)
import { useEffect, useState } from 'preact/hooks';
import type { ActivityLevel, Profile, Sex } from '../../../domain/types';
import { getProfile, updateProfile } from '../../../data/repos/profile';
import { clock } from '../../../data/clock';
import { isValidDate } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { ACTIVITY_LABELS, SEX_LABELS } from '../../labels';
import { BackLink, DateField, ErrorList, NumberField, Segmented, SelectField } from '../../components/Fields';
import { showToast } from '../../store';

type Form = Pick<Profile, 'sex' | 'birthDate' | 'heightCm' | 'activityLevel' | 'manualWeightKg'>;

export function ProfileScreen() {
  const profile = useLive(getProfile);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (profile && !form) {
      const { sex, birthDate, heightCm, activityLevel, manualWeightKg } = profile;
      setForm({ sex, birthDate, heightCm, activityLevel, manualWeightKg });
    }
  }, [profile]);
  if (!form || !profile) return null;
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  async function save() {
    const errs: string[] = [];
    if (form!.birthDate && (!isValidDate(form!.birthDate) || form!.birthDate > clock.today())) errs.push('תאריך לידה לא תקין');
    if (form!.heightCm !== null && (form!.heightCm < 100 || form!.heightCm > 250)) errs.push('גובה בין 100 ל-250 ס"מ');
    if (form!.manualWeightKg !== null && (form!.manualWeightKg < 30 || form!.manualWeightKg > 300)) errs.push('משקל בין 30 ל-300 ק"ג');
    setErrors(errs);
    if (errs.length) return;
    const weightChanged = form!.manualWeightKg !== profile!.manualWeightKg;
    await updateProfile({ ...form!, manualWeightDate: weightChanged ? clock.today() : profile!.manualWeightDate });
    showToast('הפרופיל נשמר');
  }

  return (
    <div>
      <BackLink />
      <h1>פרופיל</h1>
      <div class="card">
        <Segmented<Sex>
          label="מין"
          value={form.sex ?? ('' as Sex)}
          options={(Object.keys(SEX_LABELS) as Sex[]).map((v) => ({ value: v, label: SEX_LABELS[v] }))}
          onChange={(sex) => set({ sex })}
        />
        <DateField label="תאריך לידה" value={form.birthDate} onChange={(birthDate) => set({ birthDate })} />
        <NumberField label="גובה" suffix='ס"מ' value={form.heightCm} onChange={(heightCm) => set({ heightCm })} min={100} max={250} />
        <SelectField<ActivityLevel>
          label="רמת פעילות"
          value={form.activityLevel}
          options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((v) => ({ value: v, label: ACTIVITY_LABELS[v] }))}
          onChange={(activityLevel) => set({ activityLevel })}
          hint="למחשבון הקלוריות. כולל עבודה, צעדים ואימונים"
        />
        <NumberField
          label="משקל ידני"
          suffix='ק"ג'
          decimal
          step={0.1}
          value={form.manualWeightKg}
          onChange={(manualWeightKg) => set({ manualWeightKg })}
          hint="משמש רק כשאין עדיין שקילות בוקר או מדידות (R-NUT-2)"
        />
        <ErrorList errors={errors} />
        <button class="btn primary block" onClick={save}>
          שמור
        </button>
      </div>
    </div>
  );
}
