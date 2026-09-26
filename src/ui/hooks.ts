// חיבור הממשק לנתונים: מתעדכן לבד כשהמסד משתנה
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';

export function useLive<T>(fn: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(fn).subscribe({ next: (v) => setValue(() => v), error: (e) => console.error(e) });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
