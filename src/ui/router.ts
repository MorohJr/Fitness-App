// ניווט לפי כתובת (#/settings/profile), עובד גם בלי שרת
import { useEffect, useState } from 'preact/hooks';

const current = () => location.hash.replace(/^#/, '') || '/dashboard';

export function useRoute(): string {
  const [path, setPath] = useState(current());
  useEffect(() => {
    const on = () => {
      setPath(current());
      document.getElementById('main-scroll')?.scrollTo(0, 0);
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function navigate(path: string): void {
  location.hash = path;
}
