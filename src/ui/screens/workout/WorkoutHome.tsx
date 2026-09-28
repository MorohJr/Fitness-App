// לשונית אימון. בשלב 2: מאגר תרגילים ומבחן פתיחה. בניית אימון בשלב 5
import { listExercises } from '../../../data/repos/exercises';
import { STRENGTH_FAMILIES } from '../../../domain/families';
import { familyReady } from '../../../domain/rules/opening-test';
import { useLive } from '../../hooks';
import { Icon } from '../../components/Icon';

export function WorkoutHome() {
  const data = useLive(async () => {
    const exs = await listExercises();
    return { count: exs.length, ready: STRENGTH_FAMILIES.filter((f) => familyReady(exs, f)).length };
  });
  if (!data) return null;
  const total = STRENGTH_FAMILIES.length;
  return (
    <div>
      <h1>אימון</h1>
      {data.ready < total && (
        <div class="card">
          <div class="label">מבחן פתיחה</div>
          <div class="big" style={{ margin: '6px 0' }}>
            <span class="v" style={{ fontSize: '2.4rem' }}>{data.ready}</span>
            <span class="of">מתוך {total} משפחות</span>
          </div>
          <div class="progress-line"><i style={{ width: `${(data.ready / total) * 100}%` }} /></div>
          <p class="small muted">בלי מבחן פתיחה אי אפשר לבנות אימון. אפשר לבדוק כל משפחה בנפרד, בכל יום.</p>
          <a class="btn primary block" href="#/workout/test">{data.ready ? 'המשך מבחן פתיחה' : 'התחל מבחן פתיחה'}</a>
        </div>
      )}
      <div class="list">
        <a href="#/workout/library"><Icon name="workout" /><span class="grow">מאגר תרגילים ({data.count})</span></a>
        <a href="#/workout/test"><Icon name="target" /><span class="grow">מבחן פתיחה ({data.ready}/{total})</span></a>
      </div>
      <p class="muted small">בניית האימון היומי, מצב ביצוע וטיימרים נבנים בשלב 5.</p>
    </div>
  );
}
