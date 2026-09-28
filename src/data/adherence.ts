// נתונים לעמידה ביעדים, רצף וסיכום שבועי (R-ADH, פרק 7)
import type { DayLog, DayType, FoodLog, ISODate, Workout } from '../domain/types';
import { addDays, startOfWeek } from '../domain/calc/dates';
import { nutritionMet, trainingMet, type DayCheck } from '../domain/rules/R-ADH';
import { sumLogs } from '../domain/rules/R-NUT-food';
import { personalRecords } from '../domain/rules/R-BODY';
import { weeklyVolume, MAJOR_MUSCLES } from '../domain/engine/volume';
import { trendWeight } from '../domain/calc/weight';
import { getDb } from './db';
import { alive } from './repos/base';
import { listDayLogs, listWeighIns } from './repos/dayLogs';
import { effectivePlanResolver } from './plan';
import { getHistory } from './repos/workouts';
import { listExercises } from './repos/exercises';

export async function getDayChecks(from: ISODate, to: ISODate): Promise<Map<ISODate, DayCheck>> {
  const db = getDb();
  const logs = new Map((await listDayLogs()).map((l) => [l.date, l] as [string, DayLog]));
  const food = alive((await db.data('foodLogs').toArray()) as FoodLog[]);
  const workouts = alive((await db.data('workouts').toArray()) as Workout[]).filter((w) => w.status === 'completed' && w.kind === 'regular');
  const out = new Map<ISODate, DayCheck>();
  const planOf = await effectivePlanResolver();
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const log = logs.get(d);
    const dayType: DayType = log?.dayType ?? planOf(d).dayType;
    const eaten = sumLogs(food.filter((f) => f.date === d));
    out.set(d, {
      date: d,
      dayType,
      hasLog: !!log,
      nutrition: log ? nutritionMet(eaten, log.targets) : null,
      training: trainingMet(dayType, workouts.filter((w) => w.date === d).map((w) => w.dayType ?? 'training'))
    });
  }
  return out;
}

export interface WeekSummary {
  weekStart: ISODate;
  volume: { muscle: string; sets: number }[];
  newPRs: { exerciseId: string; name: string; value: string }[];
  trendChange: number | null;
  workoutsDone: number;
}

/** סיכום שבועי (פרק 7): נפח מול יעד, שיאים חדשים, שינוי במשקל המגמה */
export async function weeklySummary(weekStart: ISODate): Promise<WeekSummary> {
  const end = addDays(weekStart, 6);
  const [history, exs, weighIns] = await Promise.all([getHistory(), listExercises(), listWeighIns()]);
  const byId = new Map(exs.map((e) => [e.id, e]));
  const vol = weeklyVolume(history, byId, weekStart);
  const before = personalRecords(history.filter((h) => h.date < weekStart), byId);
  const after = personalRecords(history.filter((h) => h.date <= end), byId);
  const newPRs = [...after.values()]
    .filter((p) => p.date >= weekStart && p.date <= end)
    .filter((p) => {
      const b = before.get(p.exerciseId);
      return !b || (p.maxReps ?? 0) > (b.maxReps ?? 0) || (p.maxSeconds ?? 0) > (b.maxSeconds ?? 0) || (p.maxLoad ?? 0) > (b.maxLoad ?? 0);
    })
    .map((p) => ({ exerciseId: p.exerciseId, name: byId.get(p.exerciseId)?.name ?? '', value: p.maxSeconds !== null ? `${p.maxSeconds} שנ'` : `${p.maxReps}` }));
  const tEnd = trendWeight(weighIns, end);
  const tStart = trendWeight(weighIns, addDays(weekStart, -1));
  const workoutsDone = new Set(history.filter((h) => h.kind === 'regular' && h.date >= weekStart && h.date <= end).map((h) => h.workoutId)).size;
  return {
    weekStart,
    volume: MAJOR_MUSCLES.map((m) => ({ muscle: m, sets: vol[m] })),
    newPRs,
    trendChange: tEnd !== null && tStart !== null ? Math.round((tEnd - tStart) * 10) / 10 : null,
    workoutsDone
  };
}

/** מוצג במוצאי שבת (מ-18:00) ובראשון. בשבת: השבוע הזה, בראשון: השבוע שעבר */
export function summaryWeek(today: ISODate, now: Date): ISODate | null {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (dow === 6 && now.getHours() >= 18) return startOfWeek(today);
  if (dow === 0) return addDays(startOfWeek(today), -7);
  return null;
}
