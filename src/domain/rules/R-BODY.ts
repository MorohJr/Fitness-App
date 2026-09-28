// R-BODY-4..6 ו-R-PHOTO: שיאים, אבני דרך, תזכורת מדידה, ניקוי תמונות
import type { Exercise, ISODate, Milestone, ProgressPhotoSet } from '../types';
import { daysBetween } from '../calc/dates';
import { setValues, type PastExercise } from '../engine/history';

export interface PR {
  exerciseId: string;
  maxReps: number | null;
  maxSeconds: number | null;
  maxLoad: number | null;
  date: ISODate;
}

const loadNum = (l: string | null) => {
  const m = l ? /(\d+(?:[.,]\d+)?)/.exec(l) : null;
  return m ? Number(m[1].replace(',', '.')) : null;
};

/** R-BODY-5: מ-SetLog בלבד. בחד-צדדי, הצד החלש */
export function personalRecords(history: PastExercise[], exercises: Map<string, Exercise>): Map<string, PR> {
  const out = new Map<string, PR>();
  for (const pe of history) {
    const ex = exercises.get(pe.exerciseId);
    if (!ex || pe.role === 'warmup') continue;
    const vals = setValues(pe.sets, ex.measure, ex.unilateral);
    const cur = out.get(ex.id) ?? { exerciseId: ex.id, maxReps: null, maxSeconds: null, maxLoad: null, date: pe.date };
    let improved = false;
    for (const v of vals) {
      if (ex.measure === 'time') {
        if (cur.maxSeconds === null || v.value > cur.maxSeconds) (cur.maxSeconds = v.value), (improved = true);
      } else if (cur.maxReps === null || v.value > cur.maxReps) (cur.maxReps = v.value), (improved = true);
      const ld = loadNum(v.load);
      if (ld !== null && (cur.maxLoad === null || ld > cur.maxLoad)) (cur.maxLoad = ld), (improved = true);
    }
    if (improved) cur.date = pe.date;
    out.set(ex.id, cur);
  }
  return out;
}

export type MilestoneState = 'locked' | 'ready' | 'achieved';

/** R-BODY-6: כל הדרישות הושגו כשיא → מוכן למבחן. הושג → מסומן ידנית */
export function milestoneState(m: Milestone, prs: Map<string, PR>): MilestoneState {
  if (m.achieved) return 'achieved';
  const ok = m.requirements.length > 0 && m.requirements.every((r) => {
    const pr = prs.get(r.exerciseId);
    const best = pr ? pr.maxReps ?? pr.maxSeconds : null;
    return best !== null && best >= r.value;
  });
  return ok ? 'ready' : 'locked';
}

/** R-BODY-4: עברו 14 יום מהמדידה האחרונה */
export function measurementDue(last: ISODate | null, today: ISODate): boolean {
  return last === null ? false : daysBetween(last, today) >= 14;
}

/** R-PHOTO-3: מעבר למגבלה (בלי סט הבסיס), הסט השלם הישן ביותר מוצע למחיקה. R-PHOTO-2: הבסיס לעולם לא */
export function photoCleanupCandidate(sets: ProgressPhotoSet[], photosPerSet: Map<string, number>, limit: number): ProgressPhotoSet | null {
  const nonBase = sets.filter((s) => !s.deletedAt && !s.isBaseline).sort((a, b) => a.date.localeCompare(b.date));
  const count = nonBase.reduce((a, s) => a + (photosPerSet.get(s.id) ?? 0), 0);
  if (count <= limit) return null;
  return nonBase.find((s) => (photosPerSet.get(s.id) ?? 0) >= 3) ?? nonBase[0] ?? null;
}

export const SUGGESTED_MILESTONES: { name: string; requirements: { exerciseId: string; value: number }[] }[] = [
  { name: '20 Push-ups ברצף', requirements: [{ exerciseId: 'ex-push-up', value: 20 }] },
  { name: '10 Pull-ups ברצף', requirements: [{ exerciseId: 'ex-pull-up', value: 10 }] },
  { name: '10 Parallel Bar Dips', requirements: [{ exerciseId: 'ex-parallel-bar-dip', value: 10 }] },
  { name: 'Box Pistol Squat × 8 לכל צד', requirements: [{ exerciseId: 'ex-box-pistol-squat', value: 8 }] },
  { name: 'עמידת ידיים על קיר 60 שניות', requirements: [{ exerciseId: 'ex-wall-handstand-hold', value: 60 }] },
  { name: '10 Hanging Leg Raises', requirements: [{ exerciseId: 'ex-hanging-leg-raise', value: 10 }] }
];
