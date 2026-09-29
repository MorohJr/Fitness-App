// נקודת הכניסה: הפעלת הנתונים, אחסון קבוע, Service Worker והממשק
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
// גופן Rubik שמור באפליקציה, עובד בלי אינטרנט (3.7)
import '@fontsource/rubik/hebrew-400.css';
import '@fontsource/rubik/hebrew-500.css';
import '@fontsource/rubik/hebrew-700.css';
import '@fontsource/rubik/hebrew-800.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-800.css';
import './ui/theme/theme.css';
import { App } from './ui/App';
import { initData } from './data/init';
import { runStartupChecks } from './data/checks';
import './data/engineChecks';
import './data/foundation';
import { purgeDeleted } from './data/purge';
import { getMeta, setMeta } from './data/repos/meta';
import { updateStore } from './ui/store';

async function start() {
  await initData();
  // בקשת אחסון קבוע בהפעלה הראשונה (3.4)
  if (!(await getMeta('persistRequested')) && navigator.storage?.persist) {
    await navigator.storage.persist().catch(() => false);
    await setMeta('persistRequested', true);
  }
  render(<App />, document.getElementById('app')!);
  // בדיקות שיוצרות הצעות (E2), ברקע
  runStartupChecks();
  purgeDeleted().catch((e) => console.error(e));
}

// גרסה חדשה: באנר עם כפתור רענון, בלי רענון אוטומטי (3.6)
const updateSW = registerSW({
  onNeedRefresh() {
    updateStore.set(() => updateSW(true));
  }
});

// אייפון: אחרי סגירת המקלדת הדף לפעמים נשאר מוזז. מחזירים אותו למקום
document.addEventListener('focusout', () => {
  setTimeout(() => {
    const el = document.activeElement;
    if (!el || !['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) window.scrollTo(0, 0);
  }, 50);
});

start().catch((e) => {
  console.error(e);
  document.getElementById('app')!.textContent = 'שגיאה בפתיחת האפליקציה: ' + (e?.message ?? e);
});
