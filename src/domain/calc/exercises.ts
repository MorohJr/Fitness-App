// עזרים לתרגילים: סולם של משפחה וזמינות לפי מיקום
import type { Exercise, LocationSetup } from '../types';

export const alive = (list: Exercise[]) => list.filter((e) => !e.deletedAt);

export function levelIn(ex: Exercise, family: string): number | null {
  return ex.families.find((f) => f.family === family)?.level ?? null;
}

/** תרגילי המשפחה לפי רמה (קל ← קשה). באותה רמה יכולות להיות חלופות */
export function ladder(exercises: Exercise[], family: string): Exercise[] {
  return alive(exercises)
    .filter((e) => levelIn(e, family) !== null)
    .sort((a, b) => levelIn(a, family)! - levelIn(b, family)! || a.name.localeCompare(b.name));
}

/** האם התרגיל אפשרי במיקום: המיקום מותר וכל הציוד הנדרש קיים שם */
export function availableAt(ex: Exercise, loc: LocationSetup): boolean {
  return loc.enabled && ex.locations.includes(loc.id) && ex.equipment.every((e) => loc.equipmentIds.includes(e));
}

/** קישור לסרטון: חיפוש ביוטיוב לפי השם (4.2) */
export function videoUrl(ex: Pick<Exercise, 'name'>): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise form')}`;
}
