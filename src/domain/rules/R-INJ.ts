// R-INJ: פציעות. בשלב 2: R-INJ-1 (חסימה) והצעות לפי אזור (נספח ו')
import type { Exercise, Injury } from '../types';
import type { FamilyId } from '../families';
import type { MuscleId } from '../muscles';

/** פציעה שחוסמת: כאב פעיל או בהחלמה (R-INJ-1) */
export function isBlocking(inj: Injury): boolean {
  return !inj.deletedAt && (inj.status === 'active' || inj.status === 'recovering');
}

export interface BlockReason {
  injuryId: string;
  area: string;
  by: 'exercise' | 'family' | 'muscle';
  what: string;
}

/** R-INJ-1: למה התרגיל חסום (רשימה ריקה = לא חסום) */
export function blockReasons(ex: Exercise, injuries: Injury[]): BlockReason[] {
  const out: BlockReason[] = [];
  const muscles = [...ex.primaryMuscles, ...ex.secondaryMuscles];
  for (const inj of injuries) {
    if (!isBlocking(inj)) continue;
    if (inj.blockedExercises.includes(ex.id)) out.push({ injuryId: inj.id, area: inj.area, by: 'exercise', what: ex.id });
    for (const f of ex.familyIds) if (inj.blockedFamilies.includes(f)) out.push({ injuryId: inj.id, area: inj.area, by: 'family', what: f });
    for (const m of muscles) if (inj.blockedMuscles.includes(m)) out.push({ injuryId: inj.id, area: inj.area, by: 'muscle', what: m });
  }
  return out;
}

export function isBlocked(ex: Exercise, injuries: Injury[]): boolean {
  return blockReasons(ex, injuries).length > 0;
}

/** נספח ו': חסימות מוצעות לפי אזור */
export const INJURY_AREAS: Record<string, { name: string; families: FamilyId[]; muscles: MuscleId[] }> = {
  shoulder: { name: 'כתף', families: ['verticalPush', 'dips'], muscles: ['shoulders'] },
  elbow: { name: 'מרפק', families: ['dips', 'triceps', 'biceps'], muscles: [] },
  wrist: { name: 'שורש כף היד', families: ['horizontalPush', 'verticalPush', 'grip'], muscles: ['forearms'] },
  lowerBack: { name: 'גב תחתון', families: ['hipHinge', 'hamstring'], muscles: ['lowerBack'] },
  knee: { name: 'ברך', families: ['squat', 'singleLeg'], muscles: ['quads'] },
  ankle: { name: 'קרסול', families: ['calves', 'singleLeg'], muscles: ['calves'] },
  hip: { name: 'ירך / מפשעה', families: ['singleLeg', 'coreSide'], muscles: ['adductors'] },
  neck: { name: 'צוואר', families: [], muscles: ['neck'] },
  other: { name: 'אחר', families: [], muscles: [] }
};
