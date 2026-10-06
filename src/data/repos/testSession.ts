// מבחן פתיחה פתוח (R-TST-6): נשמר מקומית בטלפון אחרי כל פעולה, לא בגיבוי
import type { Exercise } from '../../domain/types';
import { currentFamily, isValidSession, nextFamily, sessionChanges, type TestSession, type Usable } from '../../domain/rules/R-TST';
import { getMeta, setMeta } from './meta';
import { listExercises } from './exercises';
import { saveTestFamily } from './workouts';

/** המבחן הפתוח, או null. מצב פגום (למשל תרגיל שנמחק) נזרק */
export async function getTestSession(exercises?: Exercise[]): Promise<TestSession | null> {
  const raw = await getMeta<TestSession>('testSession');
  if (!raw) return null;
  return isValidSession(raw, exercises ?? (await listExercises())) ? raw : null;
}

export async function saveTestSession(s: TestSession): Promise<void> {
  await setMeta('testSession', s);
}

export async function clearTestSession(): Promise<void> {
  await setMeta('testSession', null);
}

/** R-TST-5: "אשר והמשך". שומר את הסטים ואת שינויי הסטטוס (E2) ועובר למשפחה הבאה */
export async function confirmTestFamily(s: TestSession, exercises: Exercise[], usable: Usable, now: number): Promise<TestSession> {
  const f = currentFamily(s);
  if (!f) return s;
  if (s.sets.length) {
    const byId = new Map(exercises.map((e) => [e.id, e]));
    await saveTestFamily(
      s.location,
      s.sets.map((d) => ({ exercise: byId.get(d.exerciseId)!, family: f, value: d.value, right: d.right, left: d.left, status: d.status })),
      sessionChanges(s, exercises)
    );
  }
  // אחרי השמירה הסטטוסים השתנו, ההצעה למשפחה הבאה מחושבת מהמצב החדש
  const next = nextFamily(s, await listExercises(), usable, s.sets.length > 0, now);
  await saveTestSession(next);
  return next;
}
