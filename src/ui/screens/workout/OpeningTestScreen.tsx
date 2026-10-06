// מבחן פתיחה: בחירת מיקום ומשפחות, ואז אימון רגיל (פרק 6, R-TST-1)
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Exercise, Injury, LocationId, Profile } from '../../../domain/types';
import { listExercises } from '../../../data/repos/exercises';
import { listInjuries } from '../../../data/repos/injuries';
import { getProfile } from '../../../data/repos/profile';
import { activeWorkout } from '../../../data/repos/workouts';
import { startTest, usableAt } from '../../../data/repos/testWorkout';
import { FAMILY_META, STRENGTH_FAMILIES, type FamilyId } from '../../../domain/families';
import { ladder } from '../../../domain/calc/exercises';
import { familyReady } from '../../../domain/rules/opening-test';
import { defaultSelection, MIN_PER_FAMILY } from '../../../domain/rules/R-TST';
import { BLOCK_MINUTES } from '../../../domain/engine/buildWorkout';
import { FOUNDATION_FAMILIES } from '../../../domain/rules/R-BEG';
import { useLive } from '../../hooks';
import { LOCATION_LABELS, STATUS_EMOJI } from '../../labels';
import { BackLink, ErrorList, Segmented } from '../../components/Fields';
import { navigate } from '../../router';
import { unlockAudio } from '../../device';

/** foundation = בדיקת הרמה של תוכנית היסודות (R-TST-8) */
export function OpeningTestScreen({ foundation = false }: { foundation?: boolean }) {
  const data = useLive(async () => {
    const [exercises, injuries, profile, active] = await Promise.all([listExercises(), listInjuries(), getProfile(), activeWorkout()]);
    return { exercises, injuries, profile, active };
  });
  if (!data?.profile) return null;
  const back = foundation ? <BackLink to="/workout/foundation" label="תוכנית יסודות" /> : <BackLink to="/workout" label="אימון" />;
  if (data.active) {
    return (
      <div>
        {back}
        <h1>{foundation ? 'בדיקת רמה' : 'מבחן פתיחה'}</h1>
        <div class="card">
          <h2>יש אימון בביצוע</h2>
          <p class="small">{data.active.templateName ?? 'אימון'}. אפשר להמשיך אותו, או לבטל אותו בלשונית "סיום" ואז להתחיל מבחן.</p>
          <a class="btn primary block" href="#/workout/run">המשך לאימון</a>
        </div>
      </div>
    );
  }
  return <TestSetup foundation={foundation} back={back} exercises={data.exercises} injuries={data.injuries} profile={data.profile} />;
}

function TestSetup({ foundation, back, exercises, injuries, profile }: { foundation: boolean; back: ComponentChildren; exercises: Exercise[]; injuries: Injury[]; profile: Profile }) {
  const FAMS = foundation ? FOUNDATION_FAMILIES : STRENGTH_FAMILIES;
  const enabled = profile.locations.filter((l) => l.enabled);
  const [loc, setLoc] = useState<LocationId>(enabled[0]?.id ?? 'outdoor');
  const usable = usableAt(profile, loc, injuries);
  const [picked, setPicked] = useState<FamilyId[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const selected = picked ?? defaultSelection(exercises, FAMS, usable);
  const ready = FAMS.filter((f) => familyReady(exercises, f)).length;
  const minutes = BLOCK_MINUTES.warmup + selected.length * MIN_PER_FAMILY;

  function toggle(f: FamilyId) {
    setPicked(selected.includes(f) ? selected.filter((x) => x !== f) : [...selected, f]);
  }

  async function start() {
    unlockAudio();
    setBusy(true);
    setErrors([]);
    try {
      await startTest({ families: selected, location: loc, foundation });
      navigate('/workout/run');
    } catch (e) {
      setErrors([(e as Error).message]);
      setBusy(false);
    }
  }

  return (
    <div>
      {back}
      <h1>{foundation ? 'בדיקת רמה' : 'מבחן פתיחה'}</h1>
      <p class="muted small">
        המבחן הוא אימון: חימום, ואז סט מקסימלי אחד בטכניקה נקייה לכל משפחה. אחרי כל סט האפליקציה אומרת אם לבדוק עוד רמה ומוסיפה אותה לאימון. בסוף מאשרים מה משתנה.
      </p>
      <div class="progress-line"><i style={{ width: `${(ready / FAMS.length) * 100}%` }} /></div>
      <p class="small muted">{ready} מתוך {FAMS.length} משפחות כבר נבדקו</p>

      <Segmented<LocationId>
        label="איפה אתה עכשיו?"
        value={loc}
        options={enabled.map((l) => ({ value: l.id, label: LOCATION_LABELS[l.id] }))}
        onChange={(v) => {
          setLoc(v);
          setPicked(null);
        }}
      />

      <div class="card">
        <h2>מה בודקים היום</h2>
        {FAMS.map((f) => {
          const lad = ladder(exercises, f);
          const any = lad.some(usable);
          const best = lad.filter((e) => e.status === 'green' || e.status === 'yellow').pop();
          return (
            <label class="check-row" key={f} style={any ? undefined : { opacity: 0.45 }}>
              <input type="checkbox" checked={selected.includes(f)} disabled={!any} onChange={() => toggle(f)} />
              <span class="grow">
                {FAMILY_META[f].name}
                <div class="small muted en">
                  {!any ? `אין תרגיל זמין ב${LOCATION_LABELS[loc]}` : best ? `${STATUS_EMOJI[best.status!]} ${best.name} · בדיקה חוזרת` : 'לא נבדק'}
                </div>
              </span>
            </label>
          );
        })}
      </div>

      <ErrorList errors={errors} />
      <button class="btn primary block" disabled={!selected.length || busy} onClick={start}>
        {selected.length ? `התחל אימון מבחן: ${selected.length} משפחות, כ-${minutes} דקות` : 'בחר לפחות משפחה אחת'}
      </button>
      {selected.length > 8 && <p class="small muted">ארוך? אפשר לבחור חלק עכשיו ואת השאר ביום אחר.</p>}
    </div>
  );
}
