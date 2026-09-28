// גוף ושיאים. בשלב 2: יומן פציעות. מדידות, תמונות ושיאים בשלב 6
import { listInjuries } from '../../../data/repos/injuries';
import { listExercises } from '../../../data/repos/exercises';
import { INJURY_AREAS, isBlocked, isBlocking } from '../../../domain/rules/R-INJ';
import { formatDate } from '../../../domain/calc/dates';
import { useLive } from '../../hooks';
import { INJURY_STATUS_LABELS } from '../../labels';
import { BodyTabs } from './BodyTabs';

export function InjuriesScreen() {
  const data = useLive(async () => {
    const [injuries, exercises] = await Promise.all([listInjuries(), listExercises()]);
    return { injuries, exercises };
  });
  if (!data) return null;
  const { injuries, exercises } = data;
  return (
    <div>
      <h1>גוף ושיאים</h1>
      <BodyTabs active="/body/injuries" />
      <div class="row">
        <h2 style={{ margin: 0 }}>יומן פציעות</h2>
        <a class="btn" href="#/body/injury/new">+ פציעה</a>
      </div>
      <div style={{ height: '10px' }} />
      {injuries.length === 0 && <p class="muted small">אין פציעות רשומות.</p>}
      {injuries.map((i) => {
        const n = exercises.filter((e) => isBlocked(e, [i])).length;
        return (
          <a class="ex-card" key={i.id} href={`#/body/injury/${i.id}`}>
            <div class="row">
              <strong>{INJURY_AREAS[i.area]?.name ?? i.area}</strong>
              <span class={`badge${isBlocking(i) ? ' warn' : ''}`}>{INJURY_STATUS_LABELS[i.status]}</span>
            </div>
            <div class="meta">
              כאב {i.pain}/10 · מ-{formatDate(i.startDate)}
              {i.healedDate ? ` עד ${formatDate(i.healedDate)}` : ''}
              {isBlocking(i) ? ` · חוסם ${n} תרגילים` : ''}
            </div>
          </a>
        );
      })}
    </div>
  );
}
