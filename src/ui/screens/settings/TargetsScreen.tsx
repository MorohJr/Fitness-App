// יעדים ומחשבון (4.1, R-NUT-1, R-NUT-2, R-NUT-4, R-VER)
import { useEffect, useState } from 'preact/hooks';
import type { TargetValues } from '../../../domain/types';
import { clock } from '../../../data/clock';
import { getDayLog } from '../../../data/repos/dayLogs';
import { getProfile, updateProfile } from '../../../data/repos/profile';
import { listTargetVersions, saveTargets } from '../../../data/repos/targets';
import { listPhases } from '../../../data/repos/phases';
import { activePhase } from '../../../domain/rules/phase';
import { versionForDate } from '../../../domain/rules/R-VER';
import { formatDate } from '../../../domain/calc/dates';
import { DEFAULT_TARGET_VALUES } from '../../../data/seed/defaults';
import { useLive } from '../../hooks';
import { fmtNum } from '../../labels';
import { BackLink, ErrorList, NumberField } from '../../components/Fields';
import { TargetsNotes, TargetsStats } from '../../components/TargetsCard';
import { showToast } from '../../store';
import { Calculator, type CalcApproval } from './Calculator';

function validate(v: TargetValues): string[] {
  const e: string[] = [];
  if (!(v.calories >= 800 && v.calories <= 6000)) e.push('קלוריות בין 800 ל-6000');
  if (!(v.proteinPerKg >= 1.6 && v.proteinPerKg <= 2.2)) e.push('חלבון בין 1.6 ל-2.2 ג\' לק"ג');
  if (!(v.fatPerKgMin >= 0.8)) e.push('שומן לפחות 0.8 ג\' לק"ג');
  if (!(v.waterL > 0 && v.waterL <= 10)) e.push('מים בין 0 ל-10 ליטר');
  if (!(v.steps >= 0 && v.steps <= 50000)) e.push('צעדים בין 0 ל-50,000');
  if (!(v.adherence.caloriesPct > 0 && v.adherence.caloriesPct <= 50)) e.push('טווח קלוריות בין 1% ל-50%');
  if (!(v.adherence.proteinMinPct > 0 && v.adherence.proteinMinPct <= 100)) e.push('סף חלבון בין 1% ל-100%');
  return e;
}

export function TargetsScreen() {
  const today = clock.today();
  const data = useLive(async () => {
    const [log, profile, versions, phases] = await Promise.all([getDayLog(today), getProfile(), listTargetVersions(), listPhases()]);
    return { log, profile, versions, phase: activePhase(phases, today) };
  }, [today]);
  const [form, setForm] = useState<TargetValues | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    if (data && !form) {
      const cur = versionForDate(data.versions, today);
      const { calories, proteinPerKg, fatPerKgMin, waterL, steps, adherence } = cur ?? DEFAULT_TARGET_VALUES;
      setForm({ calories, proteinPerKg, fatPerKgMin, waterL, steps, adherence: { ...adherence } });
      if (!cur) setShowCalc(true);
    }
  }, [data]);
  if (!data || !form || !data.profile) return null;
  const { log, profile, versions, phase } = data;
  const set = (patch: Partial<TargetValues>) => setForm({ ...form, ...patch });

  async function save(values: TargetValues, msg = 'היעדים נשמרו') {
    const errs = validate(values);
    setErrors(errs);
    if (errs.length) return false;
    await saveTargets(values);
    showToast(`${msg}. חל מהיום, ימים קודמים לא משתנים`);
    return true;
  }

  async function approveCalc(a: CalcApproval) {
    const next = { ...form!, calories: a.calories };
    if (a.weightEntered || a.activityLevel !== profile!.activityLevel) {
      await updateProfile({
        activityLevel: a.activityLevel,
        ...(a.weightEntered ? { manualWeightKg: a.weightKg, manualWeightDate: today } : {})
      });
    }
    if (await save(next, 'היעד הקלורי נשמר')) {
      setForm(next);
      setShowCalc(false);
    }
  }

  return (
    <div>
      <BackLink />
      <h1>יעדים</h1>

      {log && (
        <div class="card">
          <h2>יעדי היום</h2>
          <TargetsStats t={log.targets} />
          <TargetsNotes t={log.targets} />
        </div>
      )}

      <div class="card">
        <h2>מחשבון קלוריות</h2>
        {showCalc ? (
          <Calculator
            profile={profile}
            referenceWeightKg={log?.targets.referenceWeightKg ?? null}
            defaultPhaseType={phase?.type ?? 'maintain'}
            proteinPerKg={form.proteinPerKg}
            fatPerKgMin={form.fatPerKgMin}
            approveLabel="אשר ושמור כיעד הקלורי"
            onApprove={approveCalc}
          />
        ) : (
          <button class="btn block" onClick={() => setShowCalc(true)}>
            חשב יעד מחדש
          </button>
        )}
      </div>

      <div class="card">
        <h2>היעדים שלי</h2>
        {phase && <div class="alert warn">יש שלב פעיל ({fmtNum(phase.calories)} קלוריות). היעד הקלורי של היום נקבע לפי השלב (R-NUT-4).</div>}
        <NumberField label="קלוריות" value={form.calories} onChange={(v) => set({ calories: v ?? 0 })} step={10} />
        <div class="grid2">
          <NumberField label='חלבון (ג׳ לק"ג)' decimal step={0.1} value={form.proteinPerKg} onChange={(v) => set({ proteinPerKg: v ?? 0 })} />
          <NumberField label='שומן מינימום (ג׳ לק"ג)' decimal step={0.1} value={form.fatPerKgMin} onChange={(v) => set({ fatPerKgMin: v ?? 0 })} />
          <NumberField label="מים" suffix="ליטר" decimal step={0.1} value={form.waterL} onChange={(v) => set({ waterL: v ?? 0 })} />
          <NumberField label="צעדים" step={500} value={form.steps} onChange={(v) => set({ steps: v ?? 0 })} />
        </div>
        <h3 class="small muted">עמידה ביעד תזונה (R-ADH-1)</h3>
        <div class="grid2">
          <NumberField label="קלוריות בטווח ±" suffix="%" value={form.adherence.caloriesPct} onChange={(v) => set({ adherence: { ...form.adherence, caloriesPct: v ?? 0 } })} />
          <NumberField label="חלבון לפחות" suffix="%" value={form.adherence.proteinMinPct} onChange={(v) => set({ adherence: { ...form.adherence, proteinMinPct: v ?? 0 } })} />
        </div>
        <p class="small muted">פחמימות: מה שנשאר מהקלוריות. שמירה חלה מהיום ({formatDate(today)}), וימים קודמים לא משתנים (E1).</p>
        <ErrorList errors={errors} />
        <button class="btn primary block" onClick={() => save(form)}>
          שמור יעדים
        </button>
      </div>

      {versions.length > 0 && (
        <div class="card">
          <h2>היסטוריית יעדים</h2>
          <table class="plain">
            <thead>
              <tr><th>בתוקף מ-</th><th>קלוריות</th><th>חלבון</th><th>מים</th><th>צעדים</th></tr>
            </thead>
            <tbody>
              {[...versions].reverse().map((v) => (
                <tr key={v.id}>
                  <td>{formatDate(v.effectiveFrom)}</td>
                  <td>{fmtNum(v.calories)}</td>
                  <td>{v.proteinPerKg}</td>
                  <td>{v.waterL}</td>
                  <td>{fmtNum(v.steps)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
