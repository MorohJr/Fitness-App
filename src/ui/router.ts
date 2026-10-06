// ניווט לפי כתובת (#/settings/profile), עובד גם בלי שרת
import { useEffect, useState } from 'preact/hooks';

const current = () => location.hash.replace(/^#/, '') || '/dashboard';

// המסך הקודם, בשביל "חזרה" שמחזירה למקום שממנו הגעת (R-TST-7)
let prev: string | null = null;
let last = current();
addEventListener('hashchange', () => {
  const now = current();
  if (now !== last) prev = last;
  last = now;
});

/** המסך הקודם בתוך האפליקציה, או null אם נפתח ישירות */
export function previousPath(): string | null {
  return prev;
}

export function useRoute(): string {
  const [path, setPath] = useState(current());
  useEffect(() => {
    const on = () => {
      setPath(current());
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path: string): void {
  location.hash = path;
}
