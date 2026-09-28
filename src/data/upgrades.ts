// עדכוני מבנה לנתונים קיימים, רצים בכל הפעלה ולא משנים ערכים שבחרת
import type { DayTemplate, Profile } from '../domain/types';
import { DEFAULT_TEMPLATES } from '../domain/rules/R-DAY';
import { getDb } from './db';
import { touched } from './repos/base';
import { DEFAULT_EQUIPMENT } from './seed/defaults';

/** פריטי ציוד חדשים ברשימה. "משטח מוגבה" נוסף אוטומטית רק למיקום שיש בו ספסל */
export async function upgradeProfileEquipment(): Promise<void> {
  const db = getDb();
  const profiles = (await db.data('profile').toArray()) as Profile[];
  for (const p of profiles) {
    const ids = new Set(p.equipment.map((e) => e.id));
    const missing = DEFAULT_EQUIPMENT.filter((e) => !ids.has(e.id));
    const locations = p.locations.map((l) =>
      l.equipmentIds.includes('bench') && !l.equipmentIds.includes('elevated') && missing.some((m) => m.id === 'elevated')
        ? { ...l, equipmentIds: [...l.equipmentIds, 'elevated'] }
        : l
    );
    if (missing.length) await db.data('profile').put(touched(p, { equipment: [...p.equipment, ...missing], locations }));
  }
}

/** תבניות ברירת המחדל: החלפת משבצת "ליבה" הכללית במיפוי של נספח ב' */
export async function upgradeDefaultTemplates(): Promise<void> {
  const db = getDb();
  const templates = (await db.data('dayTemplates').toArray()) as DayTemplate[];
  for (const t of templates) {
    if (!t.slots.some((s) => s.family === 'core')) continue;
    const def = DEFAULT_TEMPLATES.find((d) => d.id === t.id);
    if (def) await db.data('dayTemplates').put(touched(t, { slots: structuredClone(def.slots) }));
  }
}
