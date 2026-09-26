// באנר תזכורות בראש כל מסך (R-REM). בשלב 1: גיבוי וגרסה חדשה
import { useState } from 'preact/hooks';
import { backupReminderDue, daysSince } from '../../domain/rules/R-REM';
import { getMeta } from '../../data/repos/meta';
import { getProfile } from '../../data/repos/profile';
import { useLive } from '../hooks';
import { updateStore, useStore } from '../store';
import { navigate } from '../router';

export function Banners() {
  // נסגר עד הפתיחה הבאה (R-REM-2): המצב נשמר רק בזיכרון
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const update = useStore(updateStore);
  const backup = useLive(async () => {
    const [last, first, profile] = await Promise.all([getMeta<string>('lastExportAt'), getMeta<string>('firstLaunchAt'), getProfile()]);
    const interval = profile?.settings.backupReminderDays ?? 3;
    return { due: backupReminderDue(last ?? null, first ?? null, new Date(), interval), days: daysSince(last ?? null, new Date()) };
  });
  const close = (k: string) => setClosed({ ...closed, [k]: true });

  return (
    <div>
      {update && !closed.update && (
        <div class="banner">
          <span class="grow">גרסה חדשה של האפליקציה זמינה</span>
          <button class="btn primary" onClick={() => update()}>
            רענן
          </button>
          <button class="x" aria-label="סגור" onClick={() => close('update')}>
            ✕
          </button>
        </div>
      )}
      {backup?.due && !closed.backup && (
        <div class="banner">
          <span class="grow">{backup.days === null ? 'עוד לא ייצאת גיבוי.' : `עברו ${backup.days} ימים מהגיבוי האחרון.`} כדאי לייצא עכשיו.</span>
          <button class="btn primary" onClick={() => navigate('/settings/backup')}>
            לגיבוי
          </button>
          <button class="x" aria-label="סגור" onClick={() => close('backup')}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
