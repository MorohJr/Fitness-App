// מחולל נתוני ההדגמה (R-DEMO-2, R-DEMO-3). בונה כ-6 חודשים דרך הכללים האמיתיים:
// תוכנית שבועית (R-VER), בניית אימון (R-GEN, R-BEG), התקדמות (R-PRG), הורדת עומס (R-DL), יעדי יום (R-NUT-4).
// מספר אקראי קבוע, כך שכל טעינה נותנת אותה הדגמה (התאריכים זזים לפי היום)
import type {
  BodyMeasurement, DayLog, DayTemplate, Exercise, FoodLog, Injury, ISODate, Meal, Milestone, PantryItem, Phase, Profile, ProgressPhotoSet,
  SetLog, ShoppingItem, Suggestion, Supplement, SupplementLog, TargetVersion, WeekPlanVersion, Workout, WorkoutExercise, WeighIn
} from '../../domain/types';
import type { DataTableName } from '../db';
import type { PastExercise, PastSet } from '../../domain/engine/history';
import { addDays, daysBetween, formatDate, nextSunday, startOfWeek } from '../../domain/calc/dates';
import { DEFAULT_TEMPLATES, DEFAULT_WEEK_DAYS, FOUNDATION_WEEK_DAYS, dayPlanForDate } from '../../domain/rules/R-DAY';
import { FOUNDATION_FAMILIES, deloadProgramStart, foundationOn } from '../../domain/rules/R-BEG';
import { buildWorkout, type PlannedWorkout } from '../../domain/engine/buildWorkout';
import { progressionSuggestions } from '../../domain/rules/R-PRG';
import { isDeloadWeek } from '../../domain/rules/R-DL';
import { isBlocked } from '../../domain/rules/R-INJ';
import { computeDayTargets } from '../../domain/rules/R-NUT';
import { recoveryScore } from '../../domain/rules/R-REC';
import { computeRank, levelsReached, maxLevels } from '../../domain/rules/R-RANK';
import { SUGGESTED_MILESTONES } from '../../domain/rules/R-BODY';
import { availableAt, ladder, levelIn } from '../../domain/calc/exercises';
import { buildSeedExercises } from '../seed/exercises';
import { DEFAULT_EQUIPMENT, DEFAULT_LOCATIONS, DEFAULT_SETTINGS, DEFAULT_TARGET_VALUES } from '../seed/defaults';
import { DEMO_MEALS, DEMO_PANTRY, DEMO_SHOPPING, DEMO_SUPPLEMENTS } from './content';

type Row = Record<string, unknown>;

/** 180 יום: המדידה האחרונה לפני 12 ימים, כך שאין תזכורת מדידה (R-BODY-4) */
export const DEMO_DAYS = 180;
const SEED = 20260929;

/** תמונה שצריך לצייר (בדפדפן) לסט תמונות התקדמות */
export interface DemoPhotoSpec {
  id: string;
  photoSetId: string;
  view: 'front' | 'back' | 'side';
  date: ISODate;
  body: number | null;
  strength: number;
}

export interface DemoData {
  tables: Record<DataTableName, Row[]>;
  photos: DemoPhotoSpec[];
  start: ISODate;
  foundationStart: ISODate;
  regularStart: ISODate;
}

/** מספר אקראי קבוע (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (p: number) => next() < p,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** סטייה סביב 0, בערך נורמלית */
    noise: (sd: number) => (next() + next() + next() - 1.5) * sd * 1.4,
    pick: <T>(list: T[]) => list[Math.floor(next() * list.length)]
  };
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r05 = (x: number) => Math.round(x * 2) / 2;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export function generateDemo(today: ISODate): DemoData {
  const R = rng(SEED);
  let n = 0;
  const id = (k: string) => `demo-${k}-${++n}`;
  const iso = (date: ISODate, hour = 9, min = 0) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d, hour, min).toISOString();
  };
  const base = (k: string, date: ISODate, hour = 9) => ({ id: id(k), createdAt: iso(date, hour), updatedAt: iso(date, hour), deletedAt: null });

  const S = addDays(today, -DEMO_DAYS);
  const Y = addDays(today, -1);
  const F = nextSunday(addDays(S, 2)); // תחילת היסודות
  const RS = addDays(F, 42); // התוכנית הרגילה
  const prog = (d: ISODate) => clamp(daysBetween(S, d) / DEMO_DAYS, 0, 1);
  const ease = (d: ISODate) => 1 - Math.pow(1 - prog(d), 1.4);

  // ===== גוף: משקל ואחוז שומן "אמיתיים" לאורך הזמן =====
  const HEIGHT = 178;
  const trueWeight = (d: ISODate) => 104 - 11.5 * ease(d);
  const trueFat = (d: ISODate) => 33.5 - 9.5 * ease(d);
  const neckAt = (d: ISODate) => 42 - 1.5 * ease(d);
  /** היפוך נוסחת הצי (R-BODY-1) כדי שהמותניים יתאימו לאחוז השומן */
  const waistFor = (bf: number, neck: number) => {
    const lg = (1.0324 + 0.15456 * Math.log10(HEIGHT) - 495 / (bf + 450)) / 0.19077;
    return Math.pow(10, lg) + neck;
  };

  // ===== פרופיל, יעדים, שלב, תוכנית =====
  const home = { ...DEFAULT_LOCATIONS[0], equipmentIds: [...DEFAULT_LOCATIONS[0].equipmentIds, 'elevated', 'sliders'] };
  const locations = [home, { ...DEFAULT_LOCATIONS[1], equipmentIds: [...DEFAULT_LOCATIONS[1].equipmentIds] }];
  const profile: Profile = {
    ...base('profile', S), sex: 'male', birthDate: '1993-03-14', heightCm: HEIGHT, activityLevel: 'light', manualWeightKg: 104, manualWeightDate: S,
    equipment: structuredClone(DEFAULT_EQUIPMENT), locations, settings: { ...DEFAULT_SETTINGS }
  };
  const targetVersions: TargetVersion[] = [
    { ...base('targets', S), effectiveFrom: S, ...structuredClone(DEFAULT_TARGET_VALUES), calories: 2400, steps: 7000 },
    { ...base('targets', RS), effectiveFrom: RS, ...structuredClone(DEFAULT_TARGET_VALUES), calories: 2400, waterL: 3.5, steps: 9000 }
  ];
  const calChange = addDays(S, 85);
  const phase: Phase = {
    ...base('phase', S), type: 'cut', startDate: S, endDate: null, calories: 2300, weeklyRateKg: -0.6, calorieChanges: [{ from: calChange, calories: 2150 }]
  };
  const weekPlans: WeekPlanVersion[] = [
    { ...base('week', S), effectiveFrom: S, days: structuredClone(DEFAULT_WEEK_DAYS), program: 'regular' },
    { ...base('week', addDays(S, 2)), effectiveFrom: F, days: structuredClone(FOUNDATION_WEEK_DAYS), program: 'foundation' },
    { ...base('week', addDays(F, 35)), effectiveFrom: RS, days: structuredClone(DEFAULT_WEEK_DAYS), program: 'regular' }
  ];
  const templates: DayTemplate[] = DEFAULT_TEMPLATES.map((t) => ({ ...base('tpl', S), ...structuredClone(t) }));

  // ===== תרגילים: מצב מתעדכן לאורך הסימולציה =====
  let exs: Exercise[] = buildSeedExercises().map((e) => ({ ...e, createdAt: iso(S), updatedAt: iso(S), deletedAt: null }));
  const exById = () => new Map(exs.map((e) => [e.id, e]));
  const patchEx = (exId: string, patch: Partial<Exercise>, date: ISODate) => {
    exs = exs.map((e) => (e.id === exId ? { ...e, ...patch, updatedAt: iso(date, 20) } : e));
  };

  const workouts: Workout[] = [];
  const wes: WorkoutExercise[] = [];
  const setLogs: SetLog[] = [];
  const suggestions: Suggestion[] = [];
  const history: PastExercise[] = [];
  const dayLogs: DayLog[] = [];
  const foodLogs: FoodLog[] = [];
  const supLogs: SupplementLog[] = [];
  const weighIns: WeighIn[] = [];
  const measurements: BodyMeasurement[] = [];
  const photoSets: ProgressPhotoSet[] = [];
  const photos: DemoPhotoSpec[] = [];

  const suggest = (s: Omit<Suggestion, keyof ReturnType<typeof base> | 'decidedAt' | 'choice'> & { decidedAt?: string | null; choice?: string | null }, date: ISODate) => {
    const rec: Suggestion = { ...base('sugg', date, 20), decidedAt: null, choice: null, ...s };
    suggestions.push(rec);
    return rec;
  };

  // ===== בדיקת רמה (R-BEG-2), יום אחרי ההתקנה =====
  const testDate = addDays(S, 1);
  const testW: Workout = {
    ...base('workout', testDate, 19), date: testDate, kind: 'test', dayType: null, templateName: 'מבחן פתיחה', location: 'home', isDeload: false, recoveryScore: null,
    status: 'completed', startedAt: iso(testDate, 19), endedAt: iso(testDate, 19, 40), blockMinutes: {}, feeling: 7, notes: 'בדיקת רמה לתוכנית היסודות'
  };
  workouts.push(testW);
  const newTest = (date: ISODate, location: 'home' | 'outdoor', notes: string): Workout => {
    const w: Workout = {
      ...base('workout', date, 19), date, kind: 'test', dayType: null, templateName: 'מבחן פתיחה', location, isDeload: false, recoveryScore: null,
      status: 'completed', startedAt: iso(date, 19), endedAt: iso(date, 19, 40), blockMinutes: {}, feeling: 7, notes
    };
    workouts.push(w);
    return w;
  };
  let curTest = testW;
  const testSet = (ex: Exercise, family: string, value: number, status: 'green' | 'yellow') => {
    const testDate = curTest.date;
    const testW = curTest;
    const we: WorkoutExercise = {
      ...base('we', testDate, 19), workoutId: testW.id, exerciseId: ex.id, exerciseName: ex.name, family, level: levelIn(ex, family) ?? 0, statusAtTime: status,
      role: 'work', targetSets: 1, targetMin: ex.targetMin, targetMax: ex.targetMax, tempo: ex.tempo, targetToday: 'סט מקסימלי', order: wes.length
    };
    wes.push(we);
    const val = ex.measure === 'time' ? { reps: null, seconds: value } : { reps: value, seconds: null };
    const sides = ex.unilateral ? (['right', 'left'] as const) : (['none'] as const);
    const sets: PastSet[] = [];
    for (const side of sides) {
      const s: SetLog = { ...base('set', testDate, 19), workoutExerciseId: we.id, setNumber: 1, side, ...val, load: null, rpe: null };
      setLogs.push(s);
      sets.push({ setNumber: 1, side, reps: s.reps, seconds: s.seconds, load: null, rpe: null });
    }
    history.push({ workoutId: testW.id, date: testDate, kind: 'test', isDeload: false, location: testW.location, exerciseId: ex.id, family, level: we.level, role: 'work', statusAtTime: status, targetMin: ex.targetMin, targetMax: ex.targetMax, sets });
    patchEx(ex.id, { status }, testDate);
  };
  for (const f of FOUNDATION_FAMILIES) {
    const lad = ladder(exs, f).filter((e) => availableAt(e, home));
    const low = lad[0];
    if (f === 'horizontalPush') {
      // Wall Push-up מעל הטווח ← 🟢, ובודקים את הרמה הבאה (פרק 6)
      testSet(low, f, low.targetMax + 5, 'green');
      const next = lad.find((e) => (levelIn(e, f) ?? 0) > (levelIn(low, f) ?? 0))!;
      testSet(next, f, next.targetMin + 1, 'yellow');
    } else {
      testSet(low, f, low.targetMin + R.int(0, 2) * (low.measure === 'time' ? 5 : 1), 'yellow');
    }
  }

  // ===== פציעה בכתף אחרי שלושה שבועות בתוכנית הרגילה (R-INJ) =====
  const I0 = addDays(RS, 17);
  const injury: Injury = {
    ...base('injury', I0, 21), area: 'shoulder', pain: 4, status: 'healed', startDate: I0, healedDate: addDays(I0, 17),
    notes: 'כאב בקדמת הכתף אחרי Pike Push-up. חסמתי רק את המשפחות, בלי קבוצת השרירים.', blockedExercises: [], blockedFamilies: ['verticalPush', 'dips'], blockedMuscles: []
  };
  const injuryOn = (d: ISODate): Injury[] => {
    if (d < I0) return [];
    const status = d < addDays(I0, 7) ? 'active' : d < addDays(I0, 17) ? 'recovering' : 'healed';
    return [{ ...injury, status, healedDate: status === 'healed' ? injury.healedDate : null }];
  };
  const healedReturns = (d: ISODate, inj: Injury[]) =>
    inj
      .filter((i) => i.status === 'healed' && i.healedDate && i.healedDate <= d)
      .map((i) => {
        const asActive = { ...i, status: 'active' as const };
        const byId = exById();
        const ws = new Set(history.filter((h) => h.kind === 'regular' && h.date >= i.healedDate! && byId.get(h.exerciseId) && isBlocked(byId.get(h.exerciseId)!, [asActive])).map((h) => h.workoutId));
        return { injury: i, workoutNumber: ws.size + 1 };
      })
      .filter((x) => x.workoutNumber <= 2);

  // ===== מזווה, מתכונים, תוספים =====
  const pantryAt = addDays(S, 3);
  const pantry: PantryItem[] = DEMO_PANTRY.map((p) => ({
    ...base('pantry', pantryAt, 12), name: p.name, category: p.category, stock: p.stock,
    per100: { kcal: p.per100[0], protein: p.per100[1], carbs: p.per100[2], fat: p.per100[3] }, barcode: p.barcode ?? null, source: p.barcode ? 'off' : 'manual'
  }));
  const pantryId = new Map(DEMO_PANTRY.map((p, i) => [p.key, pantry[i]]));
  const meals: Meal[] = DEMO_MEALS.map((m) => ({
    ...base('meal', pantryAt, 13), name: m.name, type: m.type, photoId: null, instructions: m.instructions, inWeeklyMenu: m.inWeeklyMenu,
    ingredients: m.ingredients.map(([k, grams]) => ({ pantryItemId: pantryId.get(k)!.id, grams }))
  }));
  const mealByKey = new Map(DEMO_MEALS.map((m, i) => [m.key, meals[i]]));
  const mealValues = (m: Meal) =>
    m.ingredients.reduce(
      (a, ing) => {
        const p = pantry.find((x) => x.id === ing.pantryItemId)!.per100;
        const k = ing.grams / 100;
        return { kcal: a.kcal + p.kcal * k, protein: a.protein + p.protein * k, carbs: a.carbs + p.carbs * k, fat: a.fat + p.fat * k };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 }
    );
  const supplements: Supplement[] = DEMO_SUPPLEMENTS.map((s) => ({ ...base('supp', addDays(S, 2), 10), name: s.name, dose: s.dose, timing: s.timing, active: s.key !== 'omega' }));
  const shopping: ShoppingItem[] = DEMO_SHOPPING.map((s) => ({ ...base('shop', addDays(Y, -2), 18), name: s.name, category: s.category, bought: s.bought, autoKey: null }));

  // ===== לולאת הימים =====
  const planFor = (d: ISODate) => dayPlanForDate(weekPlans, d);
  const deloadCtx = () => ({
    programStart: deloadProgramStart(workouts.filter((w) => w.kind === 'regular' && w.status === 'completed').map((w) => w.date), weekPlans),
    every: DEFAULT_SETTINGS.deloadEveryWeeks, earlyWeeks: [], postponedWeeks: []
  });

  for (let d = S; d <= Y; d = addDays(d, 1)) {
    const p = prog(d);
    const plan = planFor(d);
    const foundation = foundationOn(weekPlans, d);

    // שקילת בוקר ויומן היום
    const hasLog = d === S || R.chance(0.95);
    const weight = r1(trueWeight(d) + R.noise(0.35));
    if (hasLog && R.chance(0.7 + 0.2 * p)) weighIns.push({ date: d, weightKg: weight });
    const trainedYesterday = workouts.some((w) => w.date === addDays(d, -1) && w.kind === 'regular' && w.dayType === 'training' && w.status === 'completed');
    const log: DayLog | null = hasLog
      ? {
          ...base('day', d, 8), date: d, dayType: plan.dayType,
          targets: computeDayTargets({ date: d, targetVersions, phases: [phase], weighIns, manualWeightKg: 104 }),
          morningWeightKg: weighIns.at(-1)?.date === d ? weight : null,
          steps: Math.round(clamp(4200 + 5200 * ease(d) + R.noise(1500) + (plan.dayType === 'activeRecovery' ? 2500 : 0), 1500, 18000)),
          sleepHours: r05(clamp(7 + R.noise(0.7), 5, 9.5)),
          sleepQuality: R.int(5, 9), energy: clamp(R.int(4, 8) + Math.round(p * 2), 1, 10), focus: R.int(5, 9),
          doms: clamp((trainedYesterday ? R.int(3, 6) : R.int(1, 3)) - Math.round(p * 1.5), 1, 10),
          manualRecovery: R.chance(0.03) ? R.int(4, 7) : null,
          waterMl: Math.round(clamp(2000 + 1200 * p + R.noise(500), 1000, 4500) / 250) * 250,
          foodComplete: d >= pantryAt && R.chance(0.88)
        }
      : null;
    if (log) dayLogs.push(log);

    // תוספים
    if (log && d >= addDays(S, 2)) {
      for (const s of supplements.filter((x) => x.active)) {
        supLogs.push({ ...base('suplog', d, s.timing === 'night' ? 22 : 8), date: d, supplementId: s.id, name: s.name, dose: s.dose, taken: R.chance(s.timing === 'night' ? 0.75 : 0.9) });
      }
    }

    // אימון
    let didTrain = false;
    if (plan.dayType === 'training' && d >= F) {
      // אימון שהוחמץ נרשם כ"דולג" למחרת, ולכן לא ביום האחרון
      const missed = d > addDays(F, 6) && d < Y && R.chance(0.08);
      if (missed) {
        const tplName = templates.find((t) => t.id === plan.templateId)?.name ?? null;
        workouts.push({
          ...base('workout', addDays(d, 1), 8), date: d, kind: 'regular', dayType: 'training', templateName: tplName, location: 'home', isDeload: false, recoveryScore: null,
          status: 'skipped', startedAt: null, endedAt: iso(addDays(d, 1), 8), blockMinutes: {}, feeling: null, notes: 'דולג (R-DAY-5)'
        });
        suggest({
          type: 'missedWorkout', date: addDays(d, 1), refId: d, payload: { missedDate: d, templateId: plan.templateId, templateName: tplName },
          title: `האימון של ${formatDate(d)} (${tplName}) הוחמץ`, reason: 'אישור = לבצע אותו היום. דחייה = לדלג (R-DAY-5)',
          status: 'rejected', decidedAt: iso(addDays(d, 1), 8)
        }, addDays(d, 1));
      } else {
        didTrain = true;
        runWorkout(d, plan, foundation?.week ?? null, log);
      }
    } else if (plan.dayType === 'activeRecovery' && d >= F && R.chance(0.82)) {
      runWorkout(d, plan, foundation?.week ?? null, log);
    }

    // אוכל
    if (log && d >= pantryAt) logFood(d, log, didTrain);
    else if (log) {
      foodLogs.push({ ...base('food', d, 13), date: d, kind: 'quick', refId: null, name: 'ארוחת צהריים בחוץ', amount: 1, kcal: 1100, protein: 45, carbs: 110, fat: 45 });
      foodLogs.push({ ...base('food', d, 20), date: d, kind: 'quick', refId: null, name: 'ערב', amount: 1, kcal: 900, protein: 40, carbs: 80, fat: 40 });
    }

    // מדידה כל 14 יום (R-BODY-4), ותמונות כל 8 שבועות
    const k = daysBetween(S, d);
    if (k % 14 === 0) {
      const bf = trueFat(d) + R.noise(0.3);
      const neck = r05(neckAt(d));
      const m: BodyMeasurement = {
        ...base('measure', d, 7), date: d, weightKg: r1(trueWeight(d) + R.noise(0.2)),
        circ: {
          chest: r05(118 - 9 * ease(d)), waist: r05(waistFor(bf, neck)), neck, hips: r05(114 - 9 * ease(d)),
          armR: r05(36 - 0.5 * ease(d) + 0.8 * p), armL: r05(35.5 - 0.5 * ease(d) + 0.8 * p), thighR: r05(64 - 5 * ease(d)), thighL: r05(63.5 - 5 * ease(d))
        },
        heightCm: HEIGHT, sex: 'male', notes: k === 0 ? 'מדידה ראשונה, בבוקר אחרי שירותים' : ''
      };
      measurements.push(m);
      if (k % 56 === 0) {
        const set: ProgressPhotoSet = { ...base('photoset', d, 7), measurementId: m.id, date: d, isBaseline: k === 0 };
        photoSets.push(set);
        const rank = computeRank(r1(bf), 'male', levelsReached(history, d), maxLevels(exs));
        for (const view of ['front', 'side', 'back'] as const) photos.push({ id: id('photo'), photoSetId: set.id, view, date: d, body: rank.body, strength: rank.strength });
      }
    }

    // R-BEG-6: מבחן פתיחה ל-6 המשפחות שנשארו, בסוף תוכנית היסודות
    if (d === addDays(F, 37)) {
      curTest = newTest(d, 'outdoor', 'מבחן פתיחה למשפחות שנשארו (R-BEG-6)');
      for (const f of ['dips', 'hamstring', 'triceps', 'biceps', 'grip', 'scapula']) {
        const low = ladder(exs, f).filter((e) => e.status === 'red')[0];
        if (low) testSet(low, f, low.targetMin + R.int(0, 2) * (low.measure === 'time' ? 5 : 1), 'yellow');
      }
    }

    // החלטות שקרו בתאריך מסוים
    if (d === calChange) {
      suggest({
        type: 'calories', date: addDays(d, -1), refId: null, payload: { calories: 2150, phaseId: phase.id },
        title: 'יעד קלורי חדש: 2,150', reason: 'בשבועיים האחרונים: ממוצע 2,290 קק"ל, משקל המגמה ירד 0.25 ק"ג בשבוע, לאט מהיעד (0.6). הוצאה משוערת 2,560 (R-NUT-3)',
        status: 'approved', decidedAt: iso(addDays(d, -1), 9)
      }, addDays(d, -1));
    }
    if (d === addDays(F, 35)) {
      suggest({
        type: 'foundationDone', date: d, refId: d, payload: { weekStart: d },
        title: 'שבוע 6 מתוך 6 בתוכנית היסודות. לעבור לתוכנית הרגילה?', reason: 'אישור = התוכנית הרגילה מיום ראשון הבא (R-BEG-6)',
        status: 'approved', decidedAt: iso(d, 9)
      }, d);
    }
    if (d === addDays(RS, 15)) {
      suggest({
        type: 'volume', date: d, refId: `${startOfWeek(d)}:chest`, payload: { templateId: 'tpl-push', slotIndex: 3, delta: 1, muscle: 'chest' },
        title: 'להוסיף סט לחזה (תבנית דחיקה)', reason: 'בשבועיים האחרונים: 8.5 ו-9 סטים, מחוץ ליעד 10–16 (R-GEN-3)',
        status: 'rejected', decidedAt: iso(d, 10)
      }, d);
    }
  }

  // ===== פונקציות עזר ללולאה =====
  function runWorkout(d: ISODate, plan: ReturnType<typeof planFor>, foundationWeek: number | null, log: DayLog | null) {
    const template = templates.find((t) => t.id === plan.templateId) ?? null;
    const location = foundationWeek || R.chance(0.25) ? home : locations[1];
    const injuries = injuryOn(d);
    const isDeload = !foundationWeek && isDeloadWeek(d, deloadCtx());
    const planned: PlannedWorkout = buildWorkout({
      date: d, plan, template, exercises: exs, injuries, location, history, isDeload, lowRecoveryDeclined: false,
      healedReturns: healedReturns(d, injuries), foundationWeek
    });
    const startH = R.chance(0.7) ? 18 : 7;
    const startMin = R.int(0, 45);
    const durMin = Math.round((planned.totalSec / 60) * (0.95 + R.next() * 0.2));
    const end = new Date(new Date(iso(d, startH, startMin)).getTime() + durMin * 60000).toISOString();
    const w: Workout = {
      ...base('workout', d, startH), date: d, kind: 'regular', dayType: plan.dayType, templateName: planned.templateName, location: location.id, isDeload,
      recoveryScore: log ? recoveryScore(log).score : null, status: 'completed', startedAt: iso(d, startH, startMin), endedAt: end,
      blockMinutes: Object.fromEntries(planned.blocks.map((b) => [b.key, Math.max(1, b.minutes + R.int(-1, 2))])),
      feeling: clamp(R.int(6, 9) + (isDeload ? 1 : 0), 1, 10), notes: R.chance(0.08) ? R.pick(['הרגשתי חזק היום', 'עייף אחרי יום עבודה ארוך', 'חם מאוד בחוץ', 'טכניקה הרבה יותר טובה']) : '',
      restEndsAt: null,
      plan: { blocks: planned.blocks, strengthSec: planned.strengthSec, totalSec: planned.totalSec, totalLimitSec: planned.totalLimitSec, skipped: planned.skipped, notes: planned.notes }
    };
    workouts.push(w);
    let order = 0;
    const done: { ex: Exercise; family: string }[] = [];
    for (const it of planned.strength) {
      const ex = it.exercise;
      const we: WorkoutExercise = {
        ...base('we', d, startH), workoutId: w.id, exerciseId: ex.id, exerciseName: ex.name, family: it.family, level: levelIn(ex, it.family) ?? 0,
        statusAtTime: ex.status, role: it.role, targetSets: it.sets, targetMin: ex.targetMin, targetMax: ex.targetMax, tempo: it.tempo, targetToday: it.targetText,
        order: order++, targetValue: it.targetValue, priority: it.priority, rpeTarget: it.rpeTarget, restSec: it.restSec, note: it.note
      };
      wes.push(we);
      const past: PastSet[] = [];
      const step = ex.measure === 'time' ? 5 : 1;
      for (let s = 1; s <= it.sets; s++) {
        const roll = R.next();
        const delta = roll < 0.7 ? 0 : roll < 0.8 ? 1 : roll < 0.95 ? -1 : -2;
        const v = Math.max(1, it.targetValue + delta * step - (s === it.sets && R.chance(0.15) ? step : 0));
        const rpe = it.role === 'technique' ? 6 : isDeload ? R.int(6, 7) : roll < 0.45 ? 7 : roll < 0.87 ? 8 : 9;
        const load = ex.measure === 'repsLoad' ? ex.currentLoad ?? '10 ק"ג' : null;
        const sides = ex.unilateral ? (['right', 'left'] as const) : (['none'] as const);
        for (const side of sides) {
          const val = side === 'left' && R.chance(0.2) ? Math.max(1, v - step) : v;
          const rec: SetLog = { ...base('set', d, startH), workoutExerciseId: we.id, setNumber: s, side, reps: ex.measure === 'time' ? null : val, seconds: ex.measure === 'time' ? val : null, load, rpe };
          setLogs.push(rec);
          past.push({ setNumber: s, side, reps: rec.reps, seconds: rec.seconds, load, rpe });
        }
      }
      history.push({ workoutId: w.id, date: d, kind: 'regular', isDeload, location: location.id, exerciseId: ex.id, family: it.family, level: we.level, role: it.role, statusAtTime: ex.status, targetMin: ex.targetMin, targetMax: ex.targetMax, sets: past });
      if (ex.restartAtMin) patchEx(ex.id, { restartAtMin: false }, d);
      if (it.role === 'work') done.push({ ex, family: it.family });
    }

    // הצעות התקדמות (R-PRG). בימים האחרונים נשארות ממתינות
    if (isDeload) return;
    const recent = d >= addDays(Y, -3);
    for (const { ex: ex0, family } of done) {
      const ex = exById().get(ex0.id)!;
      const lad = ladder(exs, family);
      const lvl = levelIn(ex, family) ?? 0;
      const next = lad.filter((e) => levelIn(e, family) === lvl + 1).map((e) => ({ ex: e, availableSomewhere: locations.some((l) => availableAt(e, l)) }));
      const previous = lad.find((e) => levelIn(e, family) === lvl - 1) ?? null;
      for (const s of progressionSuggestions(ex, family, history.filter((h) => h.exerciseId === ex.id), { next, previous })) {
        if (suggestions.some((x) => x.status === 'pending' && x.type === s.type && x.refId === ex.id)) continue;
        const reject = !recent && s.type === 'advance' && R.chance(0.1);
        const rec = suggest({ type: s.type, date: d, refId: ex.id, payload: s.payload, title: s.title, reason: s.reason, status: recent ? 'pending' : reject ? 'rejected' : 'approved', decidedAt: recent ? null : iso(d, 21) }, d);
        if (rec.status !== 'approved') continue;
        applyApproved(rec, d);
      }
    }
  }

  function applyApproved(s: Suggestion, d: ISODate) {
    const exId = s.payload.exerciseId as string;
    if (s.type === 'advance') {
      const nx = exById().get(s.payload.nextId as string);
      if (nx && nx.status === 'red') patchEx(nx.id, { status: 'yellow', restartAtMin: false }, d);
      patchEx(exId, { status: 'green' }, d);
    } else if (s.type === 'regress') patchEx(exId, { status: 'red' }, d);
    else if (s.type === 'tempo') patchEx(exId, { tempo: s.payload.tempo as string, restartAtMin: true }, d);
    else if (s.type === 'load') {
      s.choice = '10 ק"ג';
      patchEx(exId, { currentLoad: '10 ק"ג', restartAtMin: true }, d);
    } else if (s.type === 'stayOrEasier') {
      s.choice = 'stay';
      patchEx(exId, { restartAtMin: true }, d);
    } else if (s.type === 'promote') patchEx(exId, { status: 'green' }, d);
  }

  function logFood(d: ISODate, log: DayLog, trained: boolean) {
    const target = log.targets.calories ?? 2300;
    const bKey = R.chance(0.5) ? 'shakshuka' : 'oats';
    const lKey = R.chance(0.7) ? 'chicken-rice' : 'beef-potato';
    const dKey = R.pick(['tuna-salad', 'salmon', 'lentil']);
    const chosen = [bKey, lKey, dKey, ...(R.chance(0.5) ? ['cottage-snack'] : []), ...(trained ? ['shake'] : [])].map((k) => mealByKey.get(k)!);
    const total = chosen.reduce((a, m) => a + mealValues(m).kcal, 0);
    const factor = clamp((target * (1 + R.noise(0.07))) / total, 0.6, 1.6);
    const hours: Record<string, number> = { breakfast: 8, lunch: 13, dinner: 20, snack: 16, postWorkout: 19 };
    for (const m of chosen) {
      const amount = Math.max(0.5, Math.round(factor * 4) / 4);
      const v = mealValues(m);
      foodLogs.push({
        ...base('food', d, hours[m.type]), date: d, kind: 'meal', refId: m.id, name: m.name, amount,
        kcal: Math.round(v.kcal * amount), protein: r1(v.protein * amount), carbs: r1(v.carbs * amount), fat: r1(v.fat * amount)
      });
    }
    if (R.chance(0.15)) {
      const banana = pantryId.get('banana')!;
      foodLogs.push({ ...base('food', d, 11), date: d, kind: 'pantry', refId: banana.id, name: banana.name, amount: 120, kcal: 107, protein: 1.3, carbs: 27.6, fat: 0.4 });
    }
    if (R.chance(0.1)) foodLogs.push({ ...base('food', d, 17), date: d, kind: 'quick', refId: null, name: 'קפה ועוגייה', amount: 1, kcal: 180, protein: 3, carbs: 24, fat: 8 });
  }

  // ===== אבני דרך: שתיים מוצעות, ואחת שהושגה (R-BODY-6) =====
  const firstReached = (exId: string, value: number) =>
    history.filter((h) => h.exerciseId === exId && h.sets.some((s) => ((s.reps ?? s.seconds) ?? 0) >= value)).map((h) => h.date).sort()[0] ?? null;
  const knee = firstReached('ex-knee-push-up', 10);
  const milestones: Milestone[] = [
    { ...base('milestone', addDays(F, 3), 21), name: '10 Knee Push-ups ברצף', requirements: [{ exerciseId: 'ex-knee-push-up', value: 10 }], achieved: !!knee, targetDate: addDays(F, 42), completedDate: knee },
    ...SUGGESTED_MILESTONES.slice(0, 2).map((m) => ({ ...base('milestone', RS, 21), name: m.name, requirements: structuredClone(m.requirements), achieved: false, targetDate: addDays(today, 180), completedDate: null }))
  ];

  // ===== תוצאה =====
  const tables: Record<DataTableName, Row[]> = {
    profile: [profile], targetVersions, phases: [phase], weekPlanVersions: weekPlans, dayTemplates: templates, exercises: exs,
    workouts, workoutExercises: wes, setLogs, injuries: [injury], milestones, suggestions, dayLogs, foodLogs, supplementLogs: supLogs,
    pantryItems: pantry, meals, supplements, shoppingItems: shopping, bodyMeasurements: measurements, photoSets, photos: []
  } as unknown as Record<DataTableName, Row[]>;
  return { tables, photos, start: S, foundationStart: F, regularStart: RS };
}
