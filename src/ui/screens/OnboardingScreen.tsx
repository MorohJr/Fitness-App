// מסך פתיחה (R-ONB): אשף של 7 שלבים. כל שלב נשמר ב"המשך", ואפשר לדלג על שלב (R-ONB-3)
import { useEffect, useState } from 'preact/hooks';
import type { ActivityLevel, LocationSetup, PhaseType, Profile, Sex } from '../../domain/types';
import { ONB_STEPS, nextStep, onboardingSuggestion, prevStep, profileComplete } from '../../domain/rules/R-ONB';
import { ageOn } from '../../domain/calc/dates';
import { clock } from '../../data/clock';
import { getProfile, updateProfile } from '../../data/repos/profile';
import { finishOnboarding, saveOnboardingTargets, setOnboardingGoal, setOnboardingStep } from '../../data/onboarding';
import { startFoundation } from '../../data/foundation';
import { loadDemo } from '../../data/demo/demo';
import { DEFAULT_TARGET_VALUES } from '../../data/seed/defaults';
import { macrosFor } from '../../domain/calc/macros';
import { useLive } from '../hooks';
import { LOCATION_LABELS, fmtNum } from '../labels';
import { DateField, ErrorList, NumberField, Segmented } from '../components/Fields';
import { navigate } from '../router';
import { renderDemoPhoto } from '../demoPhotos';
import { showToast } from '../store';

const ACTIVITY: { v: ActivityLevel; t: string; d: string }[] = [
  { v: 'sedentary', t: 'יושבני', d: 'עבודה מול מחשב, כמעט בלי הליכה' },
  { v: 'light', t: 'קל', d: 'הליכות קצרות, אימון 1–3 פעמים בשבוע' },
  { v: 'moderate', t: 'בינוני', d: 'עבודה בעמידה, או אימון 3–5 פעמים בשבוע' },
  { v: 'high', t: 'גבוה', d: 'עבודה פיזית, או אימון כמעט כל יום' }
];
const GOALS: { v: PhaseType; t: string; d: string }[] = [
  { v: 'cut', t: 'חיטוב', d: 'לרדת בשומן, לשמור על השריר' },
  { v: 'bulk', t: 'מסה', d: 'לעלות בשריר, עם מעט שומן' },
  { v: 'recomp', t: 'ריקומפוזיציה', d: 'גם וגם, לאט: פחות שומן ויותר שריר' },
  { v: 'maintain', t: 'תחזוקה', d: 'לשמור על המשקל ולהתחזק' }
];
const PILLARS = [
  { t: 'אימון שנבנה בשבילך', d: 'כל יום לפי הזמן, המקום, הציוד וההתאוששות שלך. מתקדם איתך לפי מה שעשית בפועל' },
  { t: 'תזונה', d: 'יעדי קלוריות וחלבון, מזווה, מתכונים וסריקת ברקוד' },
  { t: 'התאוששות', d: 'שינה, אנרגיה וכאבי שרירים קובעים כמה קשה להתאמן היום' },
  { t: 'גוף ודרגה', d: 'מדידות, אחוז שומן, שיאים, ודרגה מ-1 עד 5 שעולה איתך' }
];

export function OnboardingScreen({ step, goal: savedGoal }: { step: number; goal: PhaseType | null }) {
  const profile = useLive(getProfile);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  if (!profile) return null;

  const go = async (s: number) => {
    setErrors([]);
    await setOnboardingStep(s);
    window.scrollTo(0, 0);
  };
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  };
  const skip = () => (step === ONB_STEPS ? run(() => end('later')) : go(nextStep(step)));
  async function end(choice: 'foundation' | 'test' | 'later') {
    if (choice === 'foundation') await startFoundation();
    await finishOnboarding();
    navigate(choice === 'foundation' ? '/workout' : choice === 'test' ? '/workout/test' : '/dashboard');
  }

  const props = { profile, busy, run, next: () => go(nextStep(step)), setErrors };
  return (
    <div class="onb">
      <div class="onb-top">
        <div class="progress-line" aria-hidden="true"><i style={{ width: `${(step / ONB_STEPS) * 100}%` }} /></div>
        <div class="small muted">שלב {step} מתוך {ONB_STEPS}</div>
      </div>
      <div class="onb-body">
        {step === 1 && <Welcome {...props} />}
        {step === 2 && <AboutYou {...props} />}
        {step === 3 && <Activity {...props} />}
        {step === 4 && <Goal {...props} saved={savedGoal} />}
        {step === 5 && <Targets {...props} goal={savedGoal ?? 'maintain'} />}
        {step === 6 && <Where {...props} />}
        {step === 7 && <Start busy={busy} onPick={(c) => run(() => end(c))} />}
        <ErrorList errors={errors} />
      </div>
      {step > 1 && (
        <div class="onb-foot">
          <button class="btn" type="button" onClick={() => go(prevStep(step))}>‹ חזרה</button>
          <button class="linkish" type="button" onClick={skip}>דלג על השלב הזה</button>
        </div>
      )}
    </div>
  );
}

interface StepProps {
  profile: Profile;
  busy: boolean;
  run: (fn: () => Promise<void>) => void;
  next: () => Promise<void>;
  setErrors: (e: string[]) => void;
}

function Welcome({ busy, run, next }: StepProps) {
  return (
    <>
      <div class="eyebrow">ברוך הבא</div>
      <h1>הכושר שלך, <em>בכיס.</em></h1>
      <p class="muted">כמה דקות של שאלות, ואחר כך האפליקציה בונה לך אימון, יעדים ותוכנית.</p>
      <div class="onb-pillars">
        {PILLARS.map((p) => (
          <div class="card" key={p.t}>
            <b>{p.t}</b>
            <p class="small muted" style={{ margin: '4px 0 0' }}>{p.d}</p>
          </div>
        ))}
      </div>
      <div class="alert ok">הכול נשמר רק בטלפון שלך ועובד גם בלי אינטרנט. אין חשבון ואין שרת.</div>
      <button class="btn primary block" disabled={busy} onClick={() => run(next)}>בוא נתחיל</button>
      <button class="linkish block" disabled={busy} onClick={() => run(async () => { await loadDemo(renderDemoPhoto); navigate('/dashboard'); showToast('נתוני הדגמה נטענו'); })}>
        רק להסתכל קודם: נתוני הדגמה
      </button>
    </>
  );
}

function AboutYou({ profile, busy, run, next, setErrors }: StepProps) {
  const [sex, setSex] = useState<Sex | null>(profile.sex);
  const [birth, setBirth] = useState<string | null>(profile.birthDate);
  const [height, setHeight] = useState<number | null>(profile.heightCm);
  const [weight, setWeight] = useState<number | null>(profile.manualWeightKg);
  const save = () => run(async () => {
    const e = [
      !sex && 'בחר מין',
      !birth && 'הזן תאריך לידה',
      (height === null || height < 120 || height > 230) && 'גובה בין 120 ל-230 ס"מ',
      (weight === null || weight < 30 || weight > 300) && 'משקל בין 30 ל-300 ק"ג'
    ].filter(Boolean) as string[];
    if (e.length) return setErrors(e);
    await updateProfile({ sex, birthDate: birth, heightCm: height, manualWeightKg: weight, manualWeightDate: clock.today() });
    await next();
  });
  return (
    <>
      <h1>עליך.</h1>
      <p class="muted">מזה מחושבים הקלוריות, אחוז השומן והדרגה שלך.</p>
      <Segmented<Sex> label="מין" value={sex ?? ('' as Sex)} options={[{ value: 'male', label: 'גבר' }, { value: 'female', label: 'אישה' }]} onChange={setSex} />
      <DateField label="תאריך לידה" value={birth} onChange={setBirth} />
      <div class="grid2">
        <NumberField label="גובה" suffix='ס"מ' value={height} onChange={setHeight} />
        <NumberField label="משקל" suffix='ק"ג' decimal step={0.1} value={weight} onChange={setWeight} />
      </div>
      <button class="btn primary block" disabled={busy} onClick={save}>המשך</button>
    </>
  );
}

function Activity({ profile, busy, run, next }: StepProps) {
  const [v, setV] = useState<ActivityLevel>(profile.activityLevel);
  return (
    <>
      <h1>כמה אתה זז ביום?</h1>
      <p class="muted">בלי לספור את האימונים באפליקציה. זה קובע כמה קלוריות הגוף שורף.</p>
      <div class="onb-options">
        {ACTIVITY.map((a) => (
          <button type="button" key={a.v} class="onb-opt" aria-pressed={v === a.v} onClick={() => setV(a.v)}>
            <b>{a.t}</b><span>{a.d}</span>
          </button>
        ))}
      </div>
      <button class="btn primary block" disabled={busy} onClick={() => run(async () => { await updateProfile({ activityLevel: v }); await next(); })}>המשך</button>
    </>
  );
}

function Goal({ busy, run, next, saved }: StepProps & { saved: PhaseType | null }) {
  const [v, setV] = useState<PhaseType>(saved ?? 'cut');
  return (
    <>
      <h1>מה המטרה?</h1>
      <p class="muted">מזה נקבע יעד הקלוריות. אפשר לשנות בכל רגע בהגדרות.</p>
      <div class="onb-options">
        {GOALS.map((g) => (
          <button type="button" key={g.v} class="onb-opt" aria-pressed={v === g.v} onClick={() => setV(g.v)}>
            <b>{g.t}</b><span>{g.d}</span>
          </button>
        ))}
      </div>
      <button class="btn primary block" disabled={busy} onClick={() => run(async () => { await setOnboardingGoal(v); await next(); })}>המשך</button>
    </>
  );
}

function Targets({ profile, busy, run, next, setErrors, goal }: StepProps & { goal: PhaseType }) {
  const base = DEFAULT_TARGET_VALUES;
  const ok = profileComplete(profile) && profile.manualWeightKg !== null;
  const sug = ok
    ? onboardingSuggestion({
        sex: profile.sex!, weightKg: profile.manualWeightKg!, heightCm: profile.heightCm!, age: ageOn(profile.birthDate!, clock.today()),
        activityLevel: profile.activityLevel, goal, proteinPerKg: base.proteinPerKg, fatPerKgMin: base.fatPerKgMin
      })
    : null;
  const [cal, setCal] = useState<number | null>(sug?.result.calories ?? null);
  const [water, setWater] = useState<number | null>(base.waterL);
  const [steps, setSteps] = useState<number | null>(base.steps);
  useEffect(() => setCal(sug?.result.calories ?? null), [sug?.result.calories]);
  if (!sug) {
    return (
      <>
        <h1>היעדים שלך.</h1>
        <div class="alert warn">כדי לחשב יעדים צריך את הפרטים משלב 2 (מין, תאריך לידה, גובה ומשקל). חזור לשלב 2, או דלג ומלא אחר כך בהגדרות ← יעדים.</div>
      </>
    );
  }
  const goalName = GOALS.find((g) => g.v === goal)!.t;
  // המאקרו מתעדכן לפי הקלוריות שבשדה (R-NUT-2)
  const macros = macrosFor(cal ?? sug.result.calories, profile.manualWeightKg!, base.proteinPerKg, base.fatPerKgMin);
  const save = () => run(async () => {
    if (cal === null || cal < 800 || cal > 6000) return setErrors(['קלוריות בין 800 ל-6000']);
    const r = await saveOnboardingTargets({ ...base, adherence: { ...base.adherence }, calories: cal, waterL: water ?? base.waterL, steps: steps ?? base.steps }, goal);
    showToast(r.phaseCreated ? `היעדים נשמרו, ושלב ${goalName} התחיל היום` : 'היעדים נשמרו');
    await next();
  });
  return (
    <>
      <h1>היעדים שלך.</h1>
      <p class="muted">חישוב לפי הפרטים שלך והמטרה ({goalName}). אפשר לשנות לפני האישור, ושום דבר לא נשמר בלי אישור.</p>
      <div class="card">
        <div class="stats">
          <div class="stat"><div class="l">הוצאה יומית</div><div class="v">{fmtNum(sug.result.tdee)}</div></div>
          <div class="stat"><div class="l">יעד</div><div class="v">{fmtNum(cal)}</div></div>
          <div class="stat"><div class="l">חלבון</div><div class="v">{macros.proteinG}ג'</div></div>
        </div>
        <p class="small muted" style={{ margin: '8px 0 0' }}>שומן {macros.fatG} ג' · פחמימות {macros.carbsG} ג' (מה שנשאר)</p>
      </div>
      <NumberField label="קלוריות ליום" step={10} value={cal} onChange={setCal} />
      <div class="grid2">
        <NumberField label="מים" suffix="ליטר" decimal step={0.5} value={water} onChange={setWater} />
        <NumberField label="צעדים" step={500} value={steps} onChange={setSteps} />
      </div>
      <button class="btn primary block" disabled={busy} onClick={save}>אשר יעדים</button>
    </>
  );
}

function Where({ profile, busy, run, next }: StepProps) {
  const [locs, setLocs] = useState<LocationSetup[]>(structuredClone(profile.locations));
  const set = (id: string, patch: Partial<LocationSetup>) => setLocs(locs.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <>
      <h1>איפה מתאמנים?</h1>
      <p class="muted">האימון ייבנה רק מתרגילים שאפשר לעשות עם מה שיש לך.</p>
      {locs.map((l) => (
        <div class="card" key={l.id}>
          <label class="check"><input type="checkbox" checked={l.enabled} onChange={(e) => set(l.id, { enabled: (e.currentTarget as HTMLInputElement).checked })} /><b>{LOCATION_LABELS[l.id]}</b></label>
          {l.enabled && profile.equipment.map((eq) => (
            <label class="check small" key={eq.id}>
              <input type="checkbox" checked={l.equipmentIds.includes(eq.id)} onChange={(e) => {
                const on = (e.currentTarget as HTMLInputElement).checked;
                set(l.id, { equipmentIds: on ? [...l.equipmentIds, eq.id] : l.equipmentIds.filter((x) => x !== eq.id) });
              }} />
              {eq.name}
            </label>
          ))}
        </div>
      ))}
      <button class="btn primary block" disabled={busy || !locs.some((l) => l.enabled)} onClick={() => run(async () => { await updateProfile({ locations: locs }); await next(); })}>המשך</button>
    </>
  );
}

function Start({ busy, onPick }: { busy: boolean; onPick: (c: 'foundation' | 'test' | 'later') => void }) {
  return (
    <>
      <h1>איך מתחילים?</h1>
      <div class="onb-options">
        <button type="button" class="onb-opt" disabled={busy} onClick={() => onPick('foundation')}>
          <b>תוכנית יסודות (מומלץ למתחילים)</b><span>6 שבועות מהתרגילים הכי קלים. מתחילים היום, בלי מבחן</span>
        </button>
        <button type="button" class="onb-opt" disabled={busy} onClick={() => onPick('test')}>
          <b>מבחן פתיחה</b><span>למי שכבר מתאמן: סט מקסימלי בכל משפחה, ומשם התוכנית הרגילה</span>
        </button>
        <button type="button" class="onb-opt" disabled={busy} onClick={() => onPick('later')}>
          <b>אחליט אחר כך</b><span>לדשבורד. הבחירה מחכה במסך האימון</span>
        </button>
      </div>
      <div class="alert warn">חשוב: הנתונים נשמרים רק בטלפון. ייצא גיבוי מדי פעם מהגדרות ← גיבוי (האפליקציה תזכיר כל 3 ימים).</div>
    </>
  );
}
