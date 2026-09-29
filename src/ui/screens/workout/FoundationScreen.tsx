// תוכנית יסודות (R-BEG): הסבר, בדיקת רמה, התחלה, ומעבר לתוכנית הרגילה
import { useState } from 'preact/hooks';
import { getFoundationState, startFoundation, switchToRegular } from '../../../data/foundation';
import { cancelPendingWeekPlan } from '../../../data/repos/weekPlan';
import { clock } from '../../../data/clock';
import { FOUNDATION_FAMILIES, FOUNDATION_WEEKS, foundationEnd } from '../../../domain/rules/R-BEG';
import { FOUNDATION_WEEK_DAYS } from '../../../domain/rules/R-DAY';
import { FAMILY_META } from '../../../domain/families';
import { formatDate, nextSunday } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { DAY_TYPE_LABELS, WEEKDAYS } from '../../labels';
import { BackLink, ErrorList } from '../../components/Fields';
import { showToast } from '../../store';
import { navigate } from '../../router';

const DAY_NAMES: Record<string, string> = {
  'tpl-found-upper': "יסודות א': פלג גוף עליון",
  'tpl-found-lower': "יסודות ב': רגליים וליבה",
  'tpl-walk': 'הליכה ומוביליטי',
  'tpl-recovery': 'מוביליטי ויציבה'
};

export function FoundationScreen() {
  const today = clock.today();
  const st = useLive(() => getFoundationState(today), [today]);
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  if (!st) return null;
  const { active, pending, switchPending, readyFamilies, remainingFamilies, startsOn, startList } = st;
  const startsToday = startsOn === today;
  const total = FOUNDATION_FAMILIES.length;
  const sunday = nextSunday(today);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      setErrors([]);
      await fn();
      setConfirm(false);
      showToast(msg);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const week = (
    <div class="card">
      <h2>שבוע יסודות</h2>
      {FOUNDATION_WEEK_DAYS.map((d, i) => (
        <div class="rung" key={i}>
          <span class="nm" style={{ minWidth: '4.5em' }}>{WEEKDAYS[i]}</span>
          <span class="grow small">{d.templateId ? DAY_NAMES[d.templateId] : DAY_TYPE_LABELS[d.dayType]}</span>
        </div>
      ))}
      <p class="small muted" style={{ margin: '8px 0 0' }}>
        אימון עד 60 דקות: חימום, כוח עד 30 דקות, 8 דקות כושר בלי קפיצות, מתיחות ונשימה. בשבועיים הראשונים 2 סטים לכל תרגיל, אחר כך 3 (R-BEG-4).
      </p>
    </div>
  );

  return (
    <div>
      <BackLink to="/workout" label="אימון" />
      <h1>תוכנית יסודות</h1>
      <p class="muted small">
        {FOUNDATION_WEEKS} שבועות למי שמתחיל מאפס. מתחילים מהתרגילים הכי קלים, בלי קפיצות ובלי עומס על המפרקים, ועולים רמה רק כשהגוף מוכן (הצעה שמאשרים).
      </p>

      {active ? (
        <div class="card">
          <div class="label">שבוע</div>
          <div class="big" style={{ margin: '6px 0' }}>
            <span class="v" style={{ fontSize: '2.4rem' }}>{Math.min(active.week, FOUNDATION_WEEKS)}</span>
            <span class="of">מתוך {FOUNDATION_WEEKS}</span>
          </div>
          <div class="progress-line"><i style={{ width: `${(Math.min(active.week, FOUNDATION_WEEKS) / FOUNDATION_WEEKS) * 100}%` }} /></div>
          <p class="small muted">התחלת ב-{formatDate(active.start)}. השבוע השישי נגמר ב-{formatDate(foundationEnd(active.start))}.</p>
          {switchPending ? (
            <>
              <div class="alert ok">התוכנית הרגילה מתחילה ביום ראשון {formatDate(switchPending.effectiveFrom)}.</div>
              <button class="btn block" onClick={() => run(() => cancelPendingWeekPlan(switchPending.id), 'המעבר בוטל, ממשיכים ביסודות')}>בטל את המעבר</button>
            </>
          ) : confirm ? (
            <div class="alert warn">
              <p style={{ margin: '0 0 8px' }}>לעבור לתוכנית הרגילה מיום ראשון {formatDate(sunday)}? 5 ימי אימון בשבוע, וספירת הורדת העומס מתחילה (R-BEG-6).</p>
              <div class="actions">
                <button class="btn" onClick={() => setConfirm(false)}>ביטול</button>
                <button class="btn primary" onClick={() => run(switchToRegular, `התוכנית הרגילה מתחילה ב-${formatDate(sunday)}`)}>אישור</button>
              </div>
            </div>
          ) : (
            <button class="btn block" onClick={() => setConfirm(true)}>{active.week >= FOUNDATION_WEEKS ? 'עבור לתוכנית הרגילה' : 'עבור לתוכנית הרגילה מוקדם'}</button>
          )}
          {remainingFamilies.length > 0 && (
            <p class="small muted" style={{ marginTop: '10px' }}>
              לפני התוכנית הרגילה כדאי לבדוק גם: {remainingFamilies.map((f) => FAMILY_META[f].name).join(', ')}. <a href="#/workout/test">למבחן הפתיחה</a>
            </p>
          )}
        </div>
      ) : pending ? (
        <div class="card">
          <div class="alert ok">התוכנית מתחילה ביום ראשון {formatDate(pending.effectiveFrom)}. עד אז אפשר להתאמן לפי התוכנית הנוכחית, או לנוח.</div>
          <button class="btn block" onClick={() => run(() => cancelPendingWeekPlan(pending.id), 'תוכנית היסודות בוטלה')}>בטל</button>
        </div>
      ) : (
        <>
          <div class="card">
            <h2>מה תעשה</h2>
            <p class="small" style={{ margin: '0 0 8px' }}>
              בלי מבחן לפני. מתחילים מהתרגילים האלה, והאימונים הראשונים מכיילים: אם יהיה לך קל מדי, האפליקציה תציע לעלות רמה כבר אחרי אימון אחד (R-BEG-7).
            </p>
            {startList.map((row) => (
              <div class="rung" key={row.family}>
                <span class="nm" style={{ minWidth: '6.5em' }}>{FAMILY_META[row.family].name}</span>
                <span class="grow small en">{row.exercises.length ? row.exercises.map((e) => e.name).join(' / ') : 'אין תרגיל זמין'}</span>
              </div>
            ))}
            <button class="btn primary block" style={{ marginTop: '12px' }} onClick={() => run(async () => { await startFoundation(); if (startsToday) navigate('/workout'); }, startsToday ? 'תוכנית היסודות התחילה. האימון הראשון מחכה במסך האימון' : `תוכנית היסודות מתחילה ב-${formatDate(startsOn)}`)}>
              {startsToday ? 'מתחילים היום' : `התחל ביום ראשון ${formatDate(startsOn)}`}
            </button>
            <p class="small muted" style={{ margin: '10px 0 0' }}>
              כבר מתאמן ורוצה לדלג על הרמות הקלות? <a href="#/workout/test-foundation">בדיקת רמה במקום ({readyFamilies.length}/{total})</a>
            </p>
          </div>
        </>
      )}

      <ErrorList errors={errors} />
      {week}
    </div>
  );
}
