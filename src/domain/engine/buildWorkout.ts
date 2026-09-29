// בניית אימון (R-GEN, R-DAY-2, R-DAY-4, R-DL-2, R-REC-2, R-INJ). לוגיקה בלבד
import type { DayPlan, DayTemplate, Exercise, Injury, ISODate, LocationSetup, SlotPriority } from '../types';
import { FAMILY_META, type FamilyId } from '../families';
import { availableAt, ladder, levelIn } from '../calc/exercises';
import { isBlocked } from '../rules/R-INJ';
import { deloadSets } from '../rules/R-DL';
import { targetToday } from '../rules/R-PRG';
import type { PastExercise } from './history';
import { WALK_TEMPLATE_ID } from '../rules/R-DAY';
import { FOUNDATION_BLOCK_MINUTES, FOUNDATION_STRENGTH_LIMIT_SEC, FOUNDATION_TOTAL_LIMIT_SEC, WALK_DAY_MINUTES, foundationSets } from '../rules/R-BEG';

export const STRENGTH_LIMIT_SEC = 60 * 60;
export const TOTAL_LIMIT_SEC = 90 * 60;
export const TRANSITION_SEC = 60;
/** בלוקים 1, 3–6 (R-DAY-4). סה"כ 29 דקות, עד 30 */
export const BLOCK_MINUTES = { warmup: 7, stretch: 10, posture: 4, jaw: 3, meditation: 5 };
export const RECOVERY_MINUTES = { mobility: 20, stretch: 20, posture: 8, jaw: 3, meditation: 5 };

export interface PlannedItem {
  exercise: Exercise;
  family: string;
  priority: SlotPriority;
  role: 'work' | 'technique';
  sets: number;
  targetValue: number;
  targetText: string;
  tempo: string;
  restSec: number;
  rpeTarget: string | null;
  note: string | null;
  /** אם הוחלף (R-INJ-2, R-GEN-1א) */
  substituteFor: string | null;
}

export type BlockKey = 'warmup' | 'stretch' | 'posture' | 'jaw' | 'meditation' | 'mobility' | 'cardio';

export interface PlannedBlock {
  key: BlockKey;
  title: string;
  minutes: number;
  items: { exerciseId: string | null; name: string; detail: string }[];
}

export interface PlannedWorkout {
  date: ISODate;
  dayType: DayPlan['dayType'];
  templateName: string | null;
  isDeload: boolean;
  strength: PlannedItem[];
  blocks: PlannedBlock[];
  strengthSec: number;
  totalSec: number;
  /** מגבלות הזמן של האימון הזה (R-DAY-4, או R-BEG-4 ביסודות) */
  strengthLimitSec: number;
  totalLimitSec: number;
  skipped: { family: string; reason: string }[];
  notes: string[];
}

export interface BuildInput {
  date: ISODate;
  plan: DayPlan;
  template: DayTemplate | null;
  exercises: Exercise[];
  injuries: Injury[];
  location: LocationSetup;
  history: PastExercise[];
  isDeload: boolean;
  /** R-REC-2: ההצעה לעבור להתאוששות נדחתה */
  lowRecoveryDeclined: boolean;
  /** R-INJ-3: פציעות שהחלימו, ובאיזה אימון זה (1 = ראשון אחרי ההחלמה) */
  healedReturns: { injury: Injury; workoutNumber: number }[];
  /** R-GEN-7: להעדיף את התרגילים מהפעם הקודמת */
  preferIds?: string[];
  /** R-BEG: השבוע בתוכנית היסודות, או null מחוץ לה */
  foundationWeek?: number | null;
}

/** R-GEN-4: זמן תרגיל = סטים × זמן לסט + (סטים − 1) × מנוחה. חד-צדדי: זמן הסט כפול */
export function itemSeconds(it: Pick<PlannedItem, 'sets' | 'restSec'> & { exercise: Pick<Exercise, 'secondsPerSet' | 'unilateral'> }): number {
  return it.sets * it.exercise.secondsPerSet * (it.exercise.unilateral ? 2 : 1) + (it.sets - 1) * it.restSec;
}

export function strengthSeconds(items: PlannedItem[]): number {
  if (!items.length) return 0;
  return items.reduce((a, it) => a + itemSeconds(it), 0) + (items.length - 1) * TRANSITION_SEC;
}

function lastSession(history: PastExercise[], exId: string): PastExercise | null {
  const list = history.filter((h) => h.exerciseId === exId && h.role === 'work').sort((a, b) => a.date.localeCompare(b.date));
  return list[list.length - 1] ?? null;
}

const familyMuscles = (exs: Exercise[], family: string) => new Set(ladder(exs, family).flatMap((e) => e.primaryMuscles));

export function buildWorkout(inp: BuildInput): PlannedWorkout {
  const { exercises, injuries, location, date } = inp;
  const foundation = inp.foundationWeek ?? null;
  const strengthLimit = foundation ? FOUNDATION_STRENGTH_LIMIT_SEC : STRENGTH_LIMIT_SEC;
  const base: PlannedWorkout = {
    date, dayType: inp.plan.dayType, templateName: inp.template?.name ?? null, isDeload: inp.isDeload, strength: [], blocks: [], strengthSec: 0, totalSec: 0,
    strengthLimitSec: inp.plan.dayType === 'training' ? strengthLimit : 0,
    totalLimitSec: inp.plan.dayType === 'training' ? (foundation ? FOUNDATION_TOTAL_LIMIT_SEC : TOTAL_LIMIT_SEC) : 60 * 60,
    skipped: [], notes: []
  };
  const usable = (e: Exercise) => availableAt(e, location) && !isBlocked(e, injuries);
  const pool = (fam: FamilyId) => ladder(exercises, fam).filter(usable);

  // R-DAY-3: שבת / מנוחה מלאה
  if (inp.plan.dayType === 'rest') {
    base.notes.push('יום מנוחה מלאה. אין אימון מכל סוג (R-DAY-3)');
    return base;
  }

  // R-DAY-2: התאוששות פעילה, אפס עבודת כוח, עד 60 דקות
  if (inp.plan.dayType === 'activeRecovery') {
    const block = (key: BlockKey, title: string, minutes: number, list: Exercise[]): PlannedBlock => ({
      key, title, minutes, items: list.map((e) => ({ exerciseId: e.id, name: e.name, detail: detailOf(e) }))
    });
    // R-BEG-4: יום הליכה ומוביליטי
    if (inp.template?.id === WALK_TEMPLATE_ID) {
      const walk = pool('cardio').filter((e) => e.targetMax >= 20 * 60).slice(0, 1);
      base.blocks = [
        block('cardio', 'הליכה מהירה', WALK_DAY_MINUTES.cardio, walk.length ? walk : pool('cardio').slice(0, 2)),
        block('mobility', 'מוביליטי', WALK_DAY_MINUTES.mobility, pool('mobility').slice(0, 6)),
        block('stretch', 'מתיחות', WALK_DAY_MINUTES.stretch, pool('stretch').slice(0, 6))
      ];
      base.totalSec = base.blocks.reduce((a, b) => a + b.minutes * 60, 0);
      return base;
    }
    base.blocks = [
      block('mobility', 'מוביליטי עמוק', RECOVERY_MINUTES.mobility, pool('mobility').slice(0, 8)),
      block('stretch', 'מתיחות ארוכות', RECOVERY_MINUTES.stretch, pool('stretch').slice(0, 8)),
      block('posture', 'יציבה וצוואר', RECOVERY_MINUTES.posture, pool('posture')),
      block('jaw', 'לסת ומיואינג', RECOVERY_MINUTES.jaw, pool('jaw')),
      { key: 'meditation', title: 'נשימה ומדיטציה', minutes: RECOVERY_MINUTES.meditation, items: [{ exerciseId: null, name: 'נשימה 4-4-6', detail: 'שאיפה 4, עצירה 4, נשיפה 6' }] }
    ];
    base.totalSec = base.blocks.reduce((a, b) => a + b.minutes * 60, 0);
    return base;
  }

  // ===== יום אימון =====
  const used = new Set<string>();
  const items: PlannedItem[] = [];
  const healedFor = (e: Exercise) => inp.healedReturns.find((h) => isBlocked(e, [{ ...h.injury, status: 'active' }]));

  const slots = inp.template?.slots ?? [];
  // מעבר ראשון: בחירה ישירה לכל המשבצות (R-GEN-1). מעבר שני: תחליפים (R-INJ-2, R-GEN-1א)
  const picks: (Exercise | null)[] = slots.map(() => null);
  const subsFor: (string | null)[] = slots.map(() => null);
  slots.forEach((slot, i) => {
    const fam = slot.family as FamilyId;
    const eligible = ladder(exercises, fam).filter((e) => (e.status === 'green' || e.status === 'yellow') && usable(e) && !used.has(e.id));
    const chosen = (inp.preferIds ? eligible.find((e) => inp.preferIds!.includes(e.id)) : undefined) ?? eligible[eligible.length - 1];
    if (chosen) {
      picks[i] = chosen;
      used.add(chosen.id);
    }
  });
  slots.forEach((slot, i) => {
    if (picks[i]) return;
    const fam = slot.family as FamilyId;
    const muscles = familyMuscles(exercises, fam);
    const overlap = (e: Exercise) => e.primaryMuscles.filter((m) => muscles.has(m)).length;
    const sub = exercises
      .filter((e) => (e.status === 'green' || e.status === 'yellow') && usable(e) && !used.has(e.id) && overlap(e) > 0)
      .sort((a, b) => overlap(b) - overlap(a))[0];
    if (sub) {
      picks[i] = sub;
      subsFor[i] = FAMILY_META[fam]?.name ?? fam;
      used.add(sub.id);
      return;
    }
    const all = ladder(exercises, fam);
    const reason = !all.some((e) => e.status === 'green' || e.status === 'yellow')
      ? 'אין תרגיל שנבדק במבחן פתיחה'
      : all.some((e) => availableAt(e, location)) ? 'חסום בגלל פציעה, ואין תחליף (R-INJ-2)' : 'אין ציוד מתאים במיקום, ואין תחליף (R-GEN-1א)';
    base.skipped.push({ family: FAMILY_META[fam]?.name ?? fam, reason });
  });

  slots.forEach((slot, i) => {
    const chosen = picks[i];
    if (!chosen) return;
    const fam = slot.family as FamilyId;
    const substituteFor = subsFor[i];
    let sets = slot.sets;
    let rpeTarget: string | null = null;
    const notes: string[] = [];
    if (foundation) ({ sets, rpeTarget } = foundationSets(slot.sets, foundation));
    if (inp.isDeload) {
      sets = deloadSets(sets);
      rpeTarget = '6–7';
    } else if (inp.lowRecoveryDeclined) {
      sets = 2;
      rpeTarget = '7';
      notes.push('התאוששות נמוכה (R-REC-2)');
    }
    const healed = healedFor(chosen);
    if (healed && healed.workoutNumber === 1) {
      sets = Math.ceil(sets / 2);
      rpeTarget = '6';
      notes.push('חזרה אחרי פציעה: חצי מהסטים (R-INJ-3)');
    }
    const t = targetToday(chosen, lastSession(inp.history, chosen.id), sets);
    if (chosen.restartAtMin) notes.push('מתחילים מהקצה התחתון');
    if (chosen.currentLoad) notes.push(`עומס: ${chosen.currentLoad}`);
    if (substituteFor) notes.push(`במקום ${substituteFor}`);
    items.push({
      exercise: chosen, family: fam, priority: slot.priority, role: 'work', sets, targetValue: t.value, targetText: t.text,
      tempo: chosen.tempo, restSec: chosen.restSec, rpeTarget, note: notes.join(' · ') || null, substituteFor
    });
  });

  // R-GEN-5: התאמה ל-60 דקות. טכניקה ← אביזרים ← משניים; ראשי לא מתחת ל-2; ואז האביזר האחרון מוסר
  const over = () => strengthSeconds(items) > strengthLimit;
  const limitMin = strengthLimit / 60;
  const reduce = (prio: SlotPriority, floor: number) => {
    let changed = true;
    while (over() && changed) {
      changed = false;
      for (let i = items.length - 1; i >= 0 && over(); i--) {
        if (items[i].priority === prio && items[i].sets > floor) {
          items[i].sets--;
          changed = true;
        }
      }
    }
  };
  reduce('accessory', 1);
  reduce('secondary', 2);
  reduce('main', 2);
  while (over()) {
    const idx = items.map((it) => it.priority).lastIndexOf('accessory');
    if (idx < 0) break;
    base.notes.push(`${items[idx].exercise.name} הוסר כדי לעמוד ב-${limitMin} דקות (R-GEN-5)`);
    items.splice(idx, 1);
  }
  while (over()) {
    const idx = items.map((it) => it.priority).lastIndexOf('secondary');
    if (idx < 0) break;
    base.notes.push(`${items[idx].exercise.name} הוסר כדי לעמוד ב-${limitMin} דקות`);
    items.splice(idx, 1);
  }

  // R-GEN-2: עבודת טכניקה, רק אם נשאר זמן (לא בהורדת עומס)
  if (!inp.isDeload) {
    for (const it of [...items]) {
      if (it.substituteFor) continue;
      const lvl = levelIn(it.exercise, it.family) ?? 0;
      const red = ladder(exercises, it.family).find((e) => e.status === 'red' && (levelIn(e, it.family) ?? 0) > lvl && usable(e) && !used.has(e.id));
      if (!red) continue;
      for (const sets of [2, 1]) {
        const tech: PlannedItem = {
          exercise: red, family: it.family, priority: 'accessory', role: 'technique', sets, targetValue: red.targetMin,
          targetText: `${sets}×${red.targetMin}${red.measure === 'time' ? 'שנ\'' : ''}`, tempo: red.tempo, restSec: red.restSec, rpeTarget: 'עד 6', note: 'עבודת טכניקה (R-GEN-2)', substituteFor: null
        };
        items.push(tech);
        if (!over()) {
          used.add(red.id);
          break;
        }
        items.pop();
      }
    }
  }

  for (const it of items) it.targetText = targetLabel(it.exercise, it.sets, it.targetValue);
  base.strength = items;
  base.strengthSec = strengthSeconds(items);

  // בלוקים 1, 3–6 (R-DAY-4)
  const dayMuscles = new Set(items.filter((i) => i.role === 'work').flatMap((i) => i.exercise.primaryMuscles));
  const byOverlap = (list: Exercise[]) =>
    [...list].sort((a, b) => [...b.primaryMuscles, ...b.secondaryMuscles].filter((m) => dayMuscles.has(m)).length - [...a.primaryMuscles, ...a.secondaryMuscles].filter((m) => dayMuscles.has(m)).length);
  const rot = <T,>(list: T[], k: number) => (list.length ? list.map((_, i) => list[(i + k) % list.length]) : list);
  const dayNum = Number(date.replaceAll('-', ''));
  const warm = byOverlap(pool('mobility')).slice(0, 3);
  const first = items.find((i) => i.role === 'work');
  const M = foundation ? FOUNDATION_BLOCK_MINUTES : { ...BLOCK_MINUTES, cardio: 0 };
  const toItem = (e: Exercise) => ({ exerciseId: e.id, name: e.name, detail: detailOf(e) });
  // R-BEG-4: כושר קצר בלי קפיצות, אחרי הכוח
  const cardio: PlannedBlock[] = foundation
    ? [{ key: 'cardio', title: 'כושר (בלי קפיצות)', minutes: M.cardio, items: rot(pool('cardio').filter((e) => e.targetMax <= 180), dayNum).slice(0, 2).map(toItem) }]
    : [];
  base.blocks = [
    {
      key: 'warmup', title: 'חימום דינמי (חובה)', minutes: M.warmup,
      items: [
        ...warm.map((e) => ({ exerciseId: e.id, name: e.name, detail: detailOf(e) })),
        ...(first ? [{ exerciseId: first.exercise.id, name: first.exercise.name, detail: 'סט קל אחד, חצי מיעד היום' }] : [])
      ]
    },
    ...cardio,
    { key: 'stretch', title: 'מתיחות סטטיות', minutes: M.stretch, items: byOverlap(pool('stretch')).slice(0, foundation ? 4 : 5).map(toItem) },
    { key: 'posture', title: 'יציבה וצוואר', minutes: M.posture, items: rot(pool('posture'), dayNum).slice(0, foundation ? 1 : 2).map(toItem) },
    { key: 'jaw', title: 'לסת ומיואינג', minutes: M.jaw, items: pool('jaw').map(toItem) },
    { key: 'meditation', title: 'נשימה ומדיטציה', minutes: M.meditation, items: [{ exerciseId: null, name: 'נשימה 4-4-6', detail: 'שאיפה 4, עצירה 4, נשיפה 6' }] }
  ];
  base.totalSec = base.strengthSec + base.blocks.reduce((a, b) => a + b.minutes * 60, 0);
  if (foundation) base.notes.push(`תוכנית יסודות, שבוע ${foundation} (R-BEG-4)`);
  if (inp.isDeload) base.notes.push('שבוע הורדת עומס: חצי מהסטים, RPE 6–7. בלוקי הגמישות מלאים (R-DL-2)');
  return base;
}

function detailOf(e: Exercise): string {
  // זמן ארוך (כמו הליכה) מוצג בדקות
  if (e.measure === 'time' && e.targetMax >= 180) return `${Math.round(e.targetMin / 60)}–${Math.round(e.targetMax / 60)} דק'${e.unilateral ? ' לכל צד' : ''}`;
  const u = e.measure === 'time' ? 'שנ\'' : 'חזרות';
  return `${e.targetMin}–${e.targetMax} ${u}${e.unilateral ? ' לכל צד' : ''}`;
}

export function targetLabel(e: Pick<Exercise, 'measure' | 'unilateral'>, sets: number, value: number): string {
  return `${sets}×${value}${e.measure === 'time' ? 'שנ\'' : ''}${e.unilateral ? ' לכל צד' : ''}`;
}
