// מחשבון קלוריות (R-NUT-1). מציע בלבד, נשמר רק באישור (E2)
import { useEffect, useState } from 'preact/hooks';
import type { ActivityLevel, PhaseType, Profile } from '../../../domain/types';
import { PHASE_ADJUST, suggestCalories } from '../../../domain/calc/energy';
import { macrosFor } from '../../../domain/calc/macros';
import { ageOn } from '../../../domain/calc/dates';
import { clock } from '../../../data/clock';
import { ACTIVITY_LABELS, PHASE_LABELS, fmtNum, fmtSigned } from '../../labels';
import { NumberField, Segmented, SelectField } from '../../components/Fields';

export interface CalcApproval {
  calories: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  /** true אם המשקל הוזן כאן (נשמר כמשקל ידני) */
  weightEntered: boolean;
}

interface Props {
  profile: Profile;
  referenceWeightKg: number | null;
  defaultPhaseType: PhaseType;
  proteinPerKg: number;
  fatPerKgMin: number;
  approveLabel: string;
  onApprove: (a: CalcApproval) => void;
}

export function Calculator({ profile, referenceWeightKg, defaultPhaseType, proteinPerKg, fatPerKgMin, approveLabel, onApprove }: Props) {
  const [phaseType, setPhaseType] = useState<PhaseType>(defaultPhaseType);
  const [adjust, setAdjust] = useState<number>(PHASE_ADJUST[defaultPhaseType].default);
  const [activity, setActivity] = useState<ActivityLevel>(profile.activityLevel);
  const [weight, setWeight] = useState<number | null>(referenceWeightKg);
  useEffect(() => setAdjust(PHASE_ADJUST[phaseType].default), [phaseType]);

  const missing = [!profile.sex && 'מין', !profile.birthDate && 'תאריך לידה', !profile.heightCm && 'גובה'].filter(Boolean);
  if (missing.length) {
    return (
      <div class="alert warn">
        כדי להשתמש במחשבון צריך למלא בפרופיל: {missing.join(', ')}. <a href="#/settings/profile">לפרופיל</a>
      </div>
    );
  }

  const range = PHASE_ADJUST[phaseType];
  const valid = weight !== null && weight >= 30 && weight <= 300 && adjust >= range.min && adjust <= range.max;
  const result = valid
    ? suggestCalories({ sex: profile.sex!, weightKg: weight!, heightCm: profile.heightCm!, age: ageOn(profile.birthDate!, clock.today()), activityLevel: activity, phaseType, adjustPct: adjust })
    : null;
  const macros = result ? macrosFor(result.calories, weight!, proteinPerKg, fatPerKgMin) : null;

  return (
    <div>
      {referenceWeightKg === null ? (
        <NumberField label="משקל נוכחי" suffix='ק"ג' decimal step={0.1} value={weight} onChange={setWeight} hint="יישמר כמשקל הידני בפרופיל" />
      ) : (
        <p class="small muted">משקל: {fmtNum(referenceWeightKg, 1)} ק"ג (משקל הייחוס של היום)</p>
      )}
      <SelectField<ActivityLevel>
        label="רמת פעילות"
        value={activity}
        options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((v) => ({ value: v, label: ACTIVITY_LABELS[v] }))}
        onChange={setActivity}
      />
      <Segmented<PhaseType>
        label="מטרה"
        value={phaseType}
        options={(Object.keys(PHASE_LABELS) as PhaseType[]).map((v) => ({ value: v, label: PHASE_LABELS[v] }))}
        onChange={setPhaseType}
      />
      {range.min !== range.max && (
        <NumberField label={`התאמה (${range.min}% עד ${range.max}%)`} suffix="%" value={adjust} onChange={(v) => setAdjust(v ?? range.default)} min={range.min} max={range.max} />
      )}
      {result && macros ? (
        <div class="card" style={{ background: 'var(--surface-2)' }}>
          <table class="plain">
            <tbody>
              <tr><td>BMR</td><td>{fmtNum(result.bmr)}</td></tr>
              <tr><td>הוצאה יומית (TDEE)</td><td>{fmtNum(result.tdee)}</td></tr>
              <tr><td>התאמה</td><td>{fmtSigned(result.adjustPct, '%')}</td></tr>
              <tr><th>יעד מוצע</th><th>{fmtNum(result.calories)} קלוריות</th></tr>
              <tr><td>חלבון / שומן / פחמימות</td><td>{macros.proteinG} / {macros.fatG} / {macros.carbsG} ג'</td></tr>
            </tbody>
          </table>
          <button
            class="btn primary block"
            style={{ marginTop: '12px' }}
            onClick={() => onApprove({ calories: result.calories, weightKg: weight!, activityLevel: activity, weightEntered: referenceWeightKg === null })}
          >
            {approveLabel}
          </button>
        </div>
      ) : (
        <div class="alert warn">{weight === null ? 'הזן משקל כדי לחשב' : 'בדוק את הערכים'}</div>
      )}
    </div>
  );
}
