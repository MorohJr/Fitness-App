// דרגה ודמות (R-RANK): מחשב מהמדידות ומההיסטוריה, בלי לשמור (E2)
import type { BodyMeasurement, ISODate, Profile, WeighIn } from '../domain/types';
import { composition } from '../domain/calc/bodyfat';
import { referenceWeight } from '../domain/calc/weight';
import { ageOn } from '../domain/calc/dates';
import { computeRank, estimateBodyFat, levelsReached, maxLevels, type Rank } from '../domain/rules/R-RANK';
import type { PastExercise } from '../domain/engine/history';
import { clock } from './clock';
import { listMeasurements } from './repos/body';
import { getHistory } from './repos/workouts';
import { listExercises } from './repos/exercises';
import { getProfile } from './repos/profile';
import { listWeighIns } from './repos/dayLogs';

/** המדידה האחרונה עד התאריך שיש בה אחוז שומן */
function lastWithFat(ms: BodyMeasurement[], date: ISODate) {
  return [...ms]
    .filter((m) => m.date <= date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((m) => ({ m, bf: composition(m).bodyFat }))
    .find((x) => x.bf !== null) ?? null;
}

/** R-RANK-1: בלי מדידה, הערכה לפי BMI מהפרופיל והמשקל האחרון */
function estimate(profile: Profile | undefined, weighIns: WeighIn[], date: ISODate): number | null {
  if (!profile?.sex || !profile.heightCm || !profile.birthDate) return null;
  const w = referenceWeight(weighIns.filter((x) => x.date <= date), date, profile.manualWeightKg);
  return w === null ? null : estimateBodyFat(w, profile.heightCm, ageOn(profile.birthDate, date), profile.sex);
}

function rankFrom(ms: BodyMeasurement[], history: PastExercise[], max: Record<string, number>, date: ISODate, profile?: Profile, weighIns: WeighIn[] = []): Rank {
  const last = lastWithFat(ms, date);
  const levels = levelsReached(history, date);
  if (last) return computeRank(last.bf, last.m.sex, levels, max);
  return computeRank(estimate(profile, weighIns, date), profile?.sex ?? null, levels, max, true);
}

export async function getRank(date: ISODate = clock.today()): Promise<Rank> {
  const [ms, history, exs, profile, weighIns] = await Promise.all([listMeasurements(), getHistory(), listExercises(), getProfile(), listWeighIns()]);
  return rankFrom(ms, history, maxLevels(exs), date, profile, weighIns);
}

/** R-RANK-6: הדמות בכל תאריך מדידה עם אחוז שומן (רק מדידות אמיתיות) */
export async function getRankTimeline(): Promise<{ date: ISODate; rank: Rank }[]> {
  const [ms, history, exs] = await Promise.all([listMeasurements(), getHistory(), listExercises()]);
  const max = maxLevels(exs);
  return [...ms]
    .filter((m) => composition(m).bodyFat !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({ date: m.date, rank: rankFrom(ms, history, max, m.date) }));
}
