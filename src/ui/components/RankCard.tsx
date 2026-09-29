// כרטיס הדמות (R-RANK): הדמות, הדרגה, ומה חסר לדרגה הבאה
import type { Rank } from '../../domain/rules/R-RANK';
import { RANK_NAMES } from '../../domain/rules/R-RANK';
import { Avatar } from './Avatar';
import { fmtNum } from '../labels';

export function RankCard({ rank }: { rank: Rank }) {
  return (
    <div class="card rank-card">
      <Avatar body={rank.body} strength={rank.strength} size={96} label={rank.name ? `הדמות: ${rank.name}` : 'הדמות'} />
      <div class="grow">
        <div class="label">דרגה</div>
        {rank.rank !== null ? (
          <>
            <div class="big" style={{ margin: '2px 0 4px' }}>
              <span class="v" style={{ fontSize: '2.2rem' }}>{rank.rank}</span>
              <span class="of">מתוך 5 · {rank.name}</span>
            </div>
            <div class="rank-pips" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => <i key={n} class={n <= rank.rank! ? 'on' : ''} />)}
            </div>
            <p class="small" style={{ margin: '8px 0 0' }}>
              גוף {rank.body}/5 ({fmtNum(rank.bodyFat, 1)}% שומן) · כוח {rank.strength}/5
            </p>
            <ul class="small muted rank-next">
              {rank.bodyFatToNext !== null && <li>עוד {fmtNum(rank.bodyFatToNext, 1)}% שומן לציון גוף {rank.body! + 1}</li>}
              {rank.levelsToNext !== null && <li>עוד {rank.levelsToNext} {rank.levelsToNext === 1 ? 'רמה' : 'רמות'}, בכל הסולמות יחד, לציון כוח {rank.strength + 1}</li>}
              {rank.rank === 5 && <li>{RANK_NAMES[5]}. הדרגה הגבוהה ביותר</li>}
            </ul>
          </>
        ) : (
          <>
            <p class="small" style={{ margin: '4px 0 8px' }}>מדוד כדי לראות את הדרגה: צריך מותניים וצוואר (ואגן לנשים) לאחוז שומן.</p>
            <a class="btn" href="#/body/measure/new">מדידה חדשה</a>
          </>
        )}
      </div>
    </div>
  );
}
