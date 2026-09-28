// באנר תזכורות בראש כל מסך (R-REM-1). נסגר עד הפתיחה הבאה (R-REM-2). בשבת אין תזכורות אימון
import { useState } from 'preact/hooks';
import { backupReminderDue, daysSince } from '../../domain/rules/R-REM';
import { measurementDue } from '../../domain/rules/R-BODY';
import { isDeloadWeek } from '../../domain/rules/R-DL';
import { dayOfWeek } from '../../domain/calc/dates';
import { getMeta } from '../../data/repos/meta';
import { getProfile } from '../../data/repos/profile';
import { listMeasurements } from '../../data/repos/body';
import { listPendingSuggestions } from '../../data/repos/suggestions';
import { getDeloadContext } from '../../data/plan';
import { clock } from '../../data/clock';
import { useLive } from '../hooks';
import { updateStore, useStore } from '../store';
import { navigate } from '../router';

// נשמר בזיכרון בלבד: נסגר עד הפתיחה הבאה של האפליקציה
const closedThisOpen: Record<string, boolean> = {};

export function Banners() {
  const [, force] = useState(0);
  const update = useStore(updateStore);
  const data = useLive(async () => {
    const today = clock.today();
    const [last, first, profile, ms, pending, dctx] = await Promise.all([
      getMeta<string>('lastExportAt'), getMeta<string>('firstLaunchAt'), getProfile(), listMeasurements(), listPendingSuggestions(), getDeloadContext()
    ]);
    const saturday = dayOfWeek(today) === 6;
    return {
      backup: backupReminderDue(last ?? null, first ?? null, new Date(), profile?.settings.backupReminderDays ?? 3),
      backupDays: daysSince(last ?? null, new Date()),
      measure: measurementDue(ms[ms.length - 1]?.date ?? null, today),
      missed: !saturday && pending.some((s) => s.type === 'missedWorkout'),
      deload: !saturday && isDeloadWeek(today, dctx),
      pending: pending.filter((s) => s.type !== 'missedWorkout').length
    };
  });
  const close = (k: string) => {
    closedThisOpen[k] = true;
    force((n) => n + 1);
  };
  const B = ({ k, text, action, go }: { k: string; text: string; action: string; go: () => void }) =>
    closedThisOpen[k] ? null : (
      <div class="banner">
        <span class="grow">{text}</span>
        <button class="btn primary" onClick={go}>{action}</button>
        <button class="x" aria-label="סגור" onClick={() => close(k)}>✕</button>
      </div>
    );

  return (
    <div>
      {update && <B k="update" text="גרסה חדשה של האפליקציה זמינה" action="רענן" go={() => update()} />}
      {data?.backup && <B k="backup" text={`${data.backupDays === null ? 'עוד לא ייצאת גיבוי.' : `עברו ${data.backupDays} ימים מהגיבוי האחרון.`} כדאי לייצא עכשיו.`} action="לגיבוי" go={() => navigate('/settings/backup')} />}
      {data?.missed && <B k="missed" text="יש אימון שהוחמץ השבוע. מה לעשות איתו?" action="לאימון" go={() => navigate('/workout')} />}
      {data?.deload && <B k="deload" text="השבוע: שבוע הורדת עומס (חצי מהסטים, RPE 6–7)" action="לאימון" go={() => navigate('/workout')} />}
      {data?.measure && <B k="measure" text="עברו 14 יום מהמדידה האחרונה" action="למדידה" go={() => navigate('/body/measure/new')} />}
      {data && data.pending > 0 && <B k="pending" text={`${data.pending} הצעות ממתינות לאישור`} action="לדשבורד" go={() => navigate('/dashboard')} />}
    </div>
  );
}
