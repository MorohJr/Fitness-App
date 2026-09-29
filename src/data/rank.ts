// דרגה ודמות (R-RANK): מחשב מהמדידות ומההיסטוריה, בלי לשמור (E2)
import type { BodyMeasurement, ISODate } from '../domain/types';
import { composition } from '../domain/calc/bodyfat';
import { computeRank, levelsReached, maxLevels, type Rank } from '../domain/rules/R-RANK';
import type { PastExercise } from '../domain/engine/history';
import { clock } from './clock';
import { listMeasurements } from './repos/body';
import { getHistory } from './repos/workouts';
import { listExercises } from './repos/exercises';

/** המדידה האחרונה עד התאריך שיש בה אחוז שומן */
function lastWithFat(ms: BodyMeasurement[], date: ISODate) {
  return [...ms]
    .filter((m) => m.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((m) => ({ m, bf: composition(m).bodyFat }))
    .find((x) => x.bf !== null) ?? null;
}

function rankFrom(ms: BodyMeasurement[], history: PastExercise[], max: Record<string, number>, date: ISODate): Rank {
  const last = lastWithFat(ms, date);
  return computeRank(last?.bf ?? null, last?.m.sex ?? null, levelsReached(history, date), max);
}

export async function getRank(date: ISODate = clock.today()): Promise<Rank> {
  const [ms, history, exs] = await Promise.all([listMeasurements(), getHistory(), listExercises()]);
  return rankFrom(ms, history, maxLevels(exs), date);
}

/** R-RANK-6: הדמות בכל תאריך מדידה עם אחוז שומן */
export async function getRankTimeline(): Promise<{ date: ISODate; rank: Rank }[]> {
  const [ms, history, exs] = await Promise.all([listMeasurements(), getHistory(), listExercises()]);
  const max = maxLevels(exs);
  return [...ms]
    .filter((m) => composition(m).bodyFat !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, rank: rankFrom(ms, history, max, m.date) }));
}
