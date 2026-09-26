import { clock } from '../../src/data/clock';
import { useFreshDb } from '../../src/data/db';
import { initData } from '../../src/data/init';

/** קובע את "עכשיו" לתאריך ושעה מקומיים */
export function setNow(date: string, hour = 10) {
  const [y, m, d] = date.split('-').map(Number);
  clock.set(() => new Date(y, m - 1, d, hour, 0));
}

export async function freshApp(date = '2026-09-27') {
  setNow(date);
  await useFreshDb();
  await initData();
}

export const TARGETS = {
  calories: 2400,
  proteinPerKg: 1.8,
  fatPerKgMin: 0.8,
  waterL: 3,
  steps: 8000,
  adherence: { caloriesPct: 10, proteinMinPct: 90 }
};
