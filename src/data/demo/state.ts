// סימון מצב הדגמה (R-DEMO-5): נשמר רק במכשיר, לא בגיבוי
import { getMeta } from '../repos/meta';

export const DEMO_META_KEY = 'demoMode';

export async function isDemoMode(): Promise<boolean> {
  return !!(await getMeta<string>(DEMO_META_KEY));
}

/** R-DEMO-4: חסימה של פעולות שהיו דורסות את הגיבוי של הנתונים האמיתיים */
export async function assertNotDemo(action: string): Promise<void> {
  if (await isDemoMode()) throw new Error(`${action} חסום בזמן הדגמה. קודם "החזר את הנתונים שלי" (R-DEMO-4)`);
}
