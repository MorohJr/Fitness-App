// שלבים (4.1)
import { useState } from 'preact/hooks';
import { PHASE_DEFAULT_RATE } from '../../../domain/rules/R-ONB';
import type { Phase, PhaseInput, PhaseType } from '../../../domain/types';
import { clock } from '../../../data/clock';
import { checkPhase, deletePhase, listPhases, restorePhase, savePhase, setPhaseEnd } from '../../../data/repos/phases';
import { getProfile } from '../../../data/repos/profile';
import { getDayLog } from '../../../data/repos/dayLogs';
import { listTargetVersions } from '../../../data/repos/targets';
import { versionForDate } from '../../../domain/rules/R-VER';
import { phaseEditMode } from '../../../domain/rules/phase';
import { formatDate } from '../../../domain/calc/dates';
import { DEFAULT_TARGET_VALUES } from '../../../data/seed/defaults';
import { useLive } from '../../hooks';
import { PHASE_LABELS, fmtNum, fmtSigned } from '../../labels';
import { BackLink, DateField, ErrorList, NumberField, Segmented } from '../../components/Fields';
import { showToast } from '../../store';
import { Calculator } from './Calculator';

// ברירת המחדל במקום אחד (E3), גם לאשף הפתיחה
const DEFAULT_RATE = PHASE_DEFAULT_RATE;

function status(p: Phase, today: string) {
  if (p.startDate > today) return <span class="badge">עתידי</span>;
  if (p.endDate !== null && p.endDate < today) return <span class="badge">הסתיים</span>;
  return <span class="badge accent">פעיל</span>;
}

function PhaseForm({ initial, editingId, onDone }: { initial: PhaseInput; editingId?: string; onDone: () => void }) {
  const today = clock.today();
  const [f, setF] = useState<PhaseInput>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [calc, setCalc] = useState(false);
  const ctx = useLive(async () => {
    const [profile, log, versions] = await Promise.all([getProfile(), getDayLog(today), listTargetVersions()]);
    return { profile, log, version: versionForDate(versions, today) };
  });
  const set = (p: Partial<PhaseInput>) => {
    setF({ ...f, ...p });
    setConfirmClose(null);
  };

  async function submit(force = false) {
    const v = await checkPhase(f, editingId);
    setErrors(v.errors);
    if (v.errors.length) return;
    if (v.closes && !force) {
      setConfirmClose(`השלב הקודם יסתיים ב-${formatDate(v.closes.endDate)}. להמשיך?`);
      return;
    }
    try {
      await savePhase(f, editingId);
      showToast(editingId ? 'השלב עודכן' : 'השלב נוסף');
      onDone();
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  }

  return (
    <div class="card">
      <h2>{editingId ? 'עריכת שלב' : 'שלב חדש'}</h2>
      <Segmented<PhaseType>
        label="סוג"
        value={f.type}
        options={(Object.keys(PHASE_LABELS) as PhaseType[]).map((v) => ({ value: v, label: PHASE_LABELS[v] }))}
        onChange={(type) => set({ type, weeklyRateKg: DEFAULT_RATE[type] })}
      />
      <div class="grid2">
        <DateField label="התחלה" min={today} value={f.startDate} onChange={(v) => set({ startDate: v ?? today })} />
        <DateField label="סיום (לא חובה)" min={f.startDate} value={f.endDate} onChange={(endDate) => set({ endDate })} />
      </div>
      <NumberField label="יעד קלורי" step={10} value={f.calories || null} onChange={(v) => set({ calories: v ?? 0 })} />
      {ctx?.profile &&
        (calc ? (
          <Calculator
            profile={ctx.profile}
            referenceWeightKg={ctx.log?.targets.referenceWeightKg ?? null}
            defaultPhaseType={f.type}
            proteinPerKg={ctx.version?.proteinPerKg ?? DEFAULT_TARGET_VALUES.proteinPerKg}
            fatPerKgMin={ctx.version?.fatPerKgMin ?? DEFAULT_TARGET_VALUES.fatPerKgMin}
            approveLabel="השתמש ביעד הזה לשלב"
            onApprove={(a) => {
              set({ calories: a.calories });
              setCalc(false);
            }}
          />
        ) : (
          <button class="btn block" style={{ marginBottom: '14px' }} onClick={() => setCalc(true)}>
            הצע יעד לפי המחשבון
          </button>
        ))}
      <NumberField label="קצב שינוי משקל לשבוע" suffix='ק"ג' decimal step={0.05} value={f.weeklyRateKg} onChange={(v) => set({ weeklyRateKg: v ?? 0 })} hint="שלילי = ירידה. משמש להתאמה החכמה (R-NUT-3)" />
      <ErrorList errors={errors} />
      {confirmClose && <div class="alert warn">{confirmClose}</div>}
      <div class="actions">
        <button class="btn" onClick={onDone}>ביטול</button>
        <button class="btn primary" onClick={() => submit(!!confirmClose)}>{confirmClose ? 'כן, שמור' : 'שמור'}</button>
      </div>
    </div>
  );
}

function EndDateEditor({ phase, onDone }: { phase: Phase; onDone: () => void }) {
  const today = clock.today();
  const [end, setEnd] = useState<string | null>(phase.endDate ?? today);
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <div>
      <DateField label="תאריך סיום" min={today} value={end} onChange={setEnd} hint="מהיום והלאה. ריק = בלי סוף" />
      <ErrorList errors={errors} />
      <div class="actions">
        <button class="btn" onClick={onDone}>ביטול</button>
        <button
          class="btn primary"
          onClick={async () => {
            try {
              await setPhaseEnd(phase.id, end);
              showToast('תאריך הסיום נשמר');
              onDone();
            } catch (e) {
              setErrors([(e as Error).message]);
            }
          }}
        >
          שמור
        </button>
      </div>
    </div>
  );
}

export function PhasesScreen() {
  const today = clock.today();
  const phases = useLive(listPhases);
  const [mode, setMode] = useState<{ kind: 'new' } | { kind: 'edit'; phase: Phase } | { kind: 'end'; id: string } | null>(null);
  if (!phases) return null;

  const newInitial: PhaseInput = { type: 'cut', startDate: today, endDate: null, calories: 0, weeklyRateKg: DEFAULT_RATE.cut };

  return (
    <div>
      <BackLink />
      <h1>שלבים</h1>
      <p class="muted small">שלב מתחיל מהיום או בעתיד. שלב שהסתיים לא נערך. לשלב פעיל אפשר לקבוע תאריך סיום.</p>

      {mode?.kind === 'new' && <PhaseForm initial={newInitial} onDone={() => setMode(null)} />}
      {mode?.kind === 'edit' && (
        <PhaseForm
          initial={{ type: mode.phase.type, startDate: mode.phase.startDate, endDate: mode.phase.endDate, calories: mode.phase.calories, weeklyRateKg: mode.phase.weeklyRateKg }}
          editingId={mode.phase.id}
          onDone={() => setMode(null)}
        />
      )}
      {!mode && (
        <button class="btn primary block" style={{ marginBottom: '16px' }} onClick={() => setMode({ kind: 'new' })}>
          + שלב חדש
        </button>
      )}

      {phases.length === 0 && <p class="muted">אין שלבים. בלי שלב, הקלוריות נקבעות לפי היעדים שלך.</p>}
      {[...phases].reverse().map((p) => {
        const em = phaseEditMode(p, today);
        return (
          <div class="card" key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>{PHASE_LABELS[p.type]}</strong>
              {status(p, today)}
            </div>
            <p class="small muted" style={{ margin: '6px 0' }}>
              {formatDate(p.startDate)} – {p.endDate ? formatDate(p.endDate) : 'ללא סוף'} · {fmtNum(p.calories)} קלוריות · {fmtSigned(p.weeklyRateKg)} ק"ג לשבוע
            </p>
            {mode?.kind === 'end' && mode.id === p.id ? (
              <EndDateEditor phase={p} onDone={() => setMode(null)} />
            ) : (
              <div class="actions">
                {em === 'full' && (
                  <>
                    <button class="btn" onClick={() => setMode({ kind: 'edit', phase: p })}>ערוך</button>
                    <button
                      class="btn danger"
                      onClick={async () => {
                        await deletePhase(p.id);
                        showToast('השלב נמחק', () => restorePhase(p.id));
                      }}
                    >
                      מחק
                    </button>
                  </>
                )}
                {em === 'endDateOnly' && <button class="btn" onClick={() => setMode({ kind: 'end', id: p.id })}>קבע תאריך סיום</button>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
