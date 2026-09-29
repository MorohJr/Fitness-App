import { beforeEach, describe, expect, it } from 'vitest';
import { freshApp } from './helpers';
import { getDb } from '../../src/data/db';
import { countRecords, deleteAllData, exportBackup, importBackup, readBackup, undoImport } from '../../src/data/backup/backup';
import { exitDemo, isDemoMode, loadDemo } from '../../src/data/demo/demo';
import { generateDemo, DEMO_DAYS } from '../../src/data/demo/generate';
import { updateDayLog, getDayLog, listDayLogs } from '../../src/data/repos/dayLogs';
import { listMeasurements, listMilestones, listPhotoSets } from '../../src/data/repos/body';
import { listPendingSuggestions, listSuggestions } from '../../src/data/repos/suggestions';
import { getHistory, listWorkouts } from '../../src/data/repos/workouts';
import { listAllFoodLogs, listMeals, listPantry } from '../../src/data/repos/nutrition';
import { listExercises } from '../../src/data/repos/exercises';
import { getDayChecks, weeklySummary } from '../../src/data/adherence';
import { getRank, getRankTimeline } from '../../src/data/rank';
import { getFoundationInfo } from '../../src/data/plan';
import { addDays, startOfWeek } from '../../src/domain/calc/dates';
import { adherencePct } from '../../src/domain/rules/R-ADH';
import { FOUNDATION_STRENGTH_LIMIT_SEC } from '../../src/domain/rules/R-BEG';
import type { Workout } from '../../src/domain/types';

const TODAY = '2026-09-29';

beforeEach(async () => {
  await freshApp(TODAY);
  // "הנתונים האמיתיים": שקילה אחת
  await updateDayLog(TODAY, { morningWeightKg: 101.3, steps: 4321 });
});

describe('R-DEMO-3: ההדגמה עקבית וקבועה', () => {
  it('אותה הדגמה בכל טעינה, והתאריכים לפי היום', () => {
    const a = generateDemo(TODAY);
    const b = generateDemo(TODAY);
    expect(JSON.stringify(a.tables)).toBe(JSON.stringify(b.tables));
    expect(a.start).toBe(addDays(TODAY, -DEMO_DAYS));
    const later = generateDemo('2026-12-01');
    expect(later.start).toBe(addDays('2026-12-01', -DEMO_DAYS));
  });
  it('אין תאריך מהיום והלאה, ומזהים ייחודיים', () => {
    const { tables } = generateDemo(TODAY);
    for (const [name, rows] of Object.entries(tables)) {
      const ids = rows.map((r) => r.id as string);
      expect(new Set(ids).size, name).toBe(ids.length);
      for (const r of rows) if (typeof r.date === 'string') expect(r.date < TODAY, `${name} ${r.date}`).toBe(true);
    }
  });
});

describe('✅ בדיקת קבלה 9ג: טעינה ← המסכים מלאים ← "החזר את הנתונים שלי"', () => {
  it('מקצה לקצה', async () => {
    const before = await countRecords();
    const dump = JSON.stringify(await getDb().data('dayLogs').toArray());

    const { start } = await loadDemo();
    expect(await isDemoMode()).toBe(true);

    // יומן, אוכל, תזונה
    const logs = await listDayLogs();
    expect(logs.length).toBeGreaterThan(160);
    expect(logs.every((l) => l.targets.calories !== null)).toBe(true);
    expect(logs.filter((l) => l.date < TODAY).every((l) => l.targets.proteinG !== null)).toBe(true);
    expect((await listAllFoodLogs()).length).toBeGreaterThan(500);
    expect((await listPantry()).length).toBeGreaterThanOrEqual(25);
    expect((await listMeals()).length).toBeGreaterThanOrEqual(8);
    // היום עצמו נפתח עם תמונת מצב (R-VER-3)
    expect((await getDayLog(TODAY))?.targets.calories).not.toBeNull();

    // אימונים: מבחן, יסודות, רגילה, הורדת עומס, דילוגים
    const ws = await listWorkouts();
    const done = ws.filter((w) => w.status === 'completed' && w.kind === 'regular');
    expect(ws.some((w) => w.kind === 'test')).toBe(true);
    expect(done.length).toBeGreaterThan(80);
    expect(ws.some((w) => w.status === 'skipped')).toBe(true);
    expect(done.some((w) => w.isDeload)).toBe(true);
    for (const w of done.filter((w) => w.dayType === 'training')) {
      const f = await getFoundationInfo(w.date);
      if (f) {
        expect(w.isDeload).toBe(false);
        expect((w.plan as { strengthSec: number }).strengthSec).toBeLessThanOrEqual(FOUNDATION_STRENGTH_LIMIT_SEC);
      }
    }
    const hist = await getHistory();
    expect(hist.filter((h) => h.kind === 'regular' && h.role === 'work').every((h) => h.sets.every((s) => s.rpe !== null))).toBe(true);

    // התקדמות: ברוב משפחות היסודות עלו מעל הרמה של בדיקת הרמה
    const exs = await listExercises();
    const tested = new Map(hist.filter((h) => h.kind === 'test').map((h) => [h.family, h.level]));
    const top = (f: string) => Math.max(...exs.filter((e) => e.status === 'green' || e.status === 'yellow').flatMap((e) => e.families.filter((x) => x.family === f).map((x) => x.level)));
    const grew = [...tested.entries()].filter(([f, lvl]) => top(f) > lvl);
    expect(grew.length).toBeGreaterThanOrEqual(6);
    expect((await listSuggestions()).filter((s) => s.type === 'advance' && s.status === 'approved').length).toBeGreaterThan(3);
    expect((await listPendingSuggestions()).length).toBeGreaterThan(0);

    // גוף ודמות: מתחיל בדרגה 1 ועולה
    expect((await listMeasurements()).length).toBeGreaterThanOrEqual(13);
    expect((await listPhotoSets()).length).toBeGreaterThanOrEqual(3);
    expect((await listMilestones()).length).toBe(3);
    const timeline = await getRankTimeline();
    expect(timeline[0].date).toBe(start);
    expect(timeline[0].rank.rank).toBe(1);
    expect((await getRank()).rank).toBeGreaterThanOrEqual(2);

    // דשבורד: עמידה ביעדים וסיכום שבועי
    const checks = await getDayChecks(addDays(TODAY, -30), TODAY);
    expect(adherencePct(checks, TODAY, 30).pct).toBeGreaterThan(0);
    const sum = await weeklySummary(addDays(startOfWeek(TODAY), -7));
    expect(sum.workoutsDone).toBeGreaterThan(0);

    // החזרה: בדיוק כמו לפני
    await exitDemo();
    expect(await isDemoMode()).toBe(false);
    expect(await countRecords()).toEqual(before);
    expect(JSON.stringify(await getDb().data('dayLogs').toArray())).toBe(dump);
    expect((await getDayLog(TODAY))?.morningWeightKg).toBe(101.3);
  });
});

describe('✅ בדיקת קבלה 9ג: בזמן הדגמה ייבוא ומחיקה חסומים (R-DEMO-4)', () => {
  it('ייבוא, מחיקה, ביטול ייבוא וטעינה חוזרת נכשלים; ייצוא מסומן demo', async () => {
    const real = await exportBackup({ includePhotos: false });
    expect(real.fileName).not.toContain('demo');
    await loadDemo();
    await expect(importBackup(readBackup(real.bytes))).rejects.toThrow('R-DEMO-4');
    await expect(deleteAllData()).rejects.toThrow('R-DEMO-4');
    await expect(undoImport()).rejects.toThrow('R-DEMO-4');
    await expect(loadDemo()).rejects.toThrow('R-DEMO-4');
    const demoFile = await exportBackup({ includePhotos: false });
    expect(demoFile.fileName).toContain('demo');
    // הגיבוי של הנתונים האמיתיים לא נדרס
    await exitDemo();
    expect((await getDayLog(TODAY))?.morningWeightKg).toBe(101.3);
    const ws = (await getDb().data('workouts').toArray()) as Workout[];
    expect(ws).toHaveLength(0);
  });
});
