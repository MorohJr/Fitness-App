// גיבוי ושחזור (3.4, 3.5)
import { useEffect, useState } from 'preact/hooks';
import {
  countRecords,
  deleteAllData,
  discardUndoImport,
  exportBackup,
  hasUndoImport,
  importBackup,
  markExported,
  readBackup,
  undoImport,
  type ImportPreview
} from '../../../data/backup/backup';
import { initData } from '../../../data/init';
import { getMeta } from '../../../data/repos/meta';
import { getProfile, updateProfile } from '../../../data/repos/profile';
import { useLive } from '../../hooks';
import { BackLink, ErrorList, NumberField } from '../../components/Fields';
import { showToast } from '../../store';
import { shareOrDownload } from '../../share';
import { exitDemo, isDemoMode, loadDemo } from '../../../data/demo/demo';
import { renderDemoPhoto } from '../../demoPhotos';
import { navigate } from '../../router';

const TABLE_LABELS: Record<string, string> = {
  targetVersions: 'גרסאות יעדים',
  phases: 'שלבים',
  weekPlanVersions: 'תוכניות שבועיות',
  dayLogs: 'ימים ביומן',
  workouts: 'אימונים',
  foodLogs: 'רישומי אוכל',
  bodyMeasurements: 'מדידות',
  photos: 'תמונות'
};

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

export function BackupScreen() {
  const data = useLive(async () => {
    const [profile, lastExportAt, undo, counts, demo] = await Promise.all([getProfile(), getMeta<string>('lastExportAt'), hasUndoImport(), countRecords(), isDemoMode()]);
    return { profile, lastExportAt, undo, counts, demo };
  });
  const [includePhotos, setIncludePhotos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, []);

  if (!data) return null;
  const { profile, lastExportAt, undo, counts, demo } = data;

  /** מריץ פעולה ומציג שגיאה אם נכשלה (לא בולעים שגיאות בשקט, 3.5) */
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErrors([]);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setErrors([`הפעולה נכשלה: ${(err as Error)?.message ?? err}`]);
    } finally {
      setBusy(false);
    }
  }

  const restore = () =>
    run(async () => {
      await undoImport();
      await initData();
      showToast(undo?.reason === 'delete' ? 'המחיקה בוטלה, הנתונים חזרו' : 'הייבוא בוטל, הנתונים הקודמים חזרו');
    });

  const doExport = () =>
    run(async () => {
      const { bytes, fileName } = await exportBackup({ includePhotos });
      const r = await shareOrDownload(bytes, fileName);
      if (r !== 'cancelled') {
        await markExported();
        showToast('הגיבוי נוצר');
      }
    });

  async function pickFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await run(async () => {
      setPreview(null);
      setPreview(readBackup(new Uint8Array(await file.arrayBuffer())));
    });
  }

  const doImport = () =>
    run(async () => {
      if (!preview) return;
      await importBackup(preview);
      await initData();
      setPreview(null);
      showToast('הנתונים יובאו', async () => {
        await run(async () => {
          await undoImport();
          await initData();
        });
      });
    });

  const doDelete = () =>
    run(async () => {
      await deleteAllData();
      await initData();
      setConfirmDelete(false);
      showToast('כל הנתונים נמחקו', async () => {
        await run(async () => {
          await undoImport();
          await initData();
        });
      });
    });

  const doLoadDemo = () =>
    run(async () => {
      await loadDemo(renderDemoPhoto);
      await initData();
      setConfirmDemo(false);
      showToast('נתוני ההדגמה נטענו');
      navigate('/dashboard');
    });

  const doExitDemo = () =>
    run(async () => {
      await exitDemo();
      await initData();
      showToast('הנתונים שלך חזרו');
    });

  const demoCard = (
    <div class="card">
      <h2>נתוני הדגמה</h2>
      {demo ? (
        <>
          <p class="small">אתה צופה בנתוני הדגמה. הנתונים שלך שמורים בצד, וחוזרים בלחיצה. עד אז ייבוא ומחיקה חסומים (R-DEMO-4).</p>
          <button class="btn primary block" disabled={busy} onClick={doExitDemo}>החזר את הנתונים שלי</button>
        </>
      ) : !confirmDemo ? (
        <>
          <p class="small muted">חצי שנה של שימוש מלא, כדי לראות איך האפליקציה נראית עם נתונים: אימונים, תזונה, מדידות, תמונות ושיאים.</p>
          <button class="btn block" disabled={busy} onClick={() => setConfirmDemo(true)}>טען נתוני הדגמה</button>
        </>
      ) : (
        <div>
          <div class="alert warn">
            הנתונים שלך יוחלפו בנתוני הדגמה. הם נשמרים בצד במכשיר, ו"החזר את הנתונים שלי" מחזיר אותם בדיוק כמו שהם. בכל זאת מומלץ לייצא גיבוי קודם.
          </div>
          <div class="actions">
            <button class="btn" onClick={() => setConfirmDemo(false)}>ביטול</button>
            <button class="btn primary" disabled={busy} onClick={doLoadDemo}>{busy ? 'טוען…' : 'טען הדגמה'}</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <BackLink />
      <h1>גיבוי ושחזור</h1>
      {demo && demoCard}

      <div class="alert danger">מחיקת האפליקציה ממסך הבית מוחקת את כל הנתונים. ייצא גיבוי לפני כן.</div>
      <ErrorList errors={errors} />

      <div class="card">
        <h2>מה שמור במכשיר הזה</h2>
        <table class="plain">
          <tbody>
            <tr>
              <td>פרופיל</td>
              <td>{profile?.heightCm && profile.birthDate ? 'מלא' : 'ריק'}</td>
            </tr>
            {Object.entries(TABLE_LABELS).map(([k, l]) => (
              <tr key={k}>
                <td>{l}</td>
                <td class="num">{counts[k as keyof typeof counts] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>ייצוא</h2>
        <p class="small muted">גיבוי אחרון: {lastExportAt ? fmtDateTime(lastExportAt) : 'עוד לא'}</p>
        <label class="check">
          <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos((e.currentTarget as HTMLInputElement).checked)} />
          כולל תמונות
        </label>
        <button class="btn primary block" disabled={busy} onClick={doExport}>
          ייצא גיבוי
        </button>
        <p class="small muted" style={{ marginTop: '8px' }}>באייפון נפתח תפריט השיתוף: שמור ל-iCloud Drive או שלח ב-AirDrop למחשב.</p>
        {profile && (
          <NumberField
            label="תזכורת גיבוי אחרי"
            suffix="ימים"
            min={1}
            max={60}
            value={profile.settings.backupReminderDays}
            onChange={(v) => v && v >= 1 && v <= 60 && updateProfile({ settings: { ...profile.settings, backupReminderDays: v } })}
          />
        )}
      </div>

      {undo && !demo && (
        <div class="card">
          <h2>{undo.reason === 'delete' ? 'בטל מחיקה' : 'בטל ייבוא'}</h2>
          <p class="small">
            הנתונים שהיו לפני {undo.reason === 'delete' ? 'המחיקה' : 'הייבוא'} ({fmtDateTime(undo.createdAt)}) שמורים. אפשר לחזור אליהם.
          </p>
          <div class="actions">
            <button class="btn primary" disabled={busy} onClick={restore}>
              {undo.reason === 'delete' ? 'בטל מחיקה' : 'בטל ייבוא'}
            </button>
            <button class="btn" disabled={busy} onClick={() => run(async () => { await discardUndoImport(); showToast('נשמר סופית'); })}>
              {undo.reason === 'delete' ? 'המחיקה סופית' : 'השאר את הייבוא'}
            </button>
          </div>
        </div>
      )}

      {!demo && <div class="card">
        <h2>ייבוא</h2>
        <p class="small muted">ייבוא מחליף את כל הנתונים במכשיר הזה. לפני ההחלפה נשמר עותק של המצב הנוכחי, עם אפשרות לבטל.</p>
        <label class="btn block">
          בחר קובץ גיבוי (ZIP)
          <input type="file" accept=".zip,application/zip" style={{ display: 'none' }} onChange={pickFile} />
        </label>
        {preview && (
          <div class="card" style={{ background: 'var(--surface-2)', marginTop: '12px' }}>
            <p>
              גיבוי מ-{fmtDateTime(preview.data.exportedAt)}
              {preview.data.includesPhotos ? ', כולל תמונות' : ', בלי תמונות (התמונות הקיימות יישארו)'}
            </p>
            <table class="plain">
              <tbody>
                {Object.entries(TABLE_LABELS).map(([k, l]) => (
                  <tr key={k}>
                    <td>{l}</td>
                    <td class="num">{preview.counts[k] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div class="actions">
              <button class="btn" onClick={() => setPreview(null)}>ביטול</button>
              <button class="btn primary" disabled={busy} onClick={doImport}>החלף את כל הנתונים</button>
            </div>
          </div>
        )}
      </div>}

      {!demo && demoCard}

      <div class="card">
        <h2>אחסון קבוע</h2>
        <p class="small">
          {persisted === true && '✓ הדפדפן התחייב לא למחוק את הנתונים לבד.'}
          {persisted === false && 'הדפדפן עדיין לא אישר אחסון קבוע. באייפון זה בדרך כלל מאושר אחרי הוספה למסך הבית.'}
          {persisted === null && 'הדפדפן לא מדווח על סטטוס האחסון.'}
        </p>
        {persisted === false && (
          <button class="btn" onClick={async () => setPersisted((await navigator.storage?.persist?.()) ?? false)}>
            בקש אחסון קבוע
          </button>
        )}
      </div>

      {!demo && <div class="card">
        <h2>מחיקת כל הנתונים</h2>
        {!confirmDelete ? (
          <button class="btn danger block" disabled={busy} onClick={() => setConfirmDelete(true)}>
            מחק את כל הנתונים
          </button>
        ) : (
          <div>
            <div class="alert danger">
              זה ימחק את כל הנתונים במכשיר הזה: פרופיל, יעדים, שלבים, יומן ותמונות. אם תרצה לשמור אותם, ייצא גיבוי קודם. אחרי המחיקה יהיה אפשר לבטל, עד הייבוא או המחיקה הבאה.
            </div>
            <div class="actions">
              <button class="btn" onClick={() => setConfirmDelete(false)}>ביטול</button>
              <button class="btn danger" disabled={busy} onClick={doDelete}>כן, מחק הכול</button>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}
