// R-REM: תזכורות. בשלב 1: תזכורת גיבוי (3.4)

/** האם להציג תזכורת גיבוי: עברו יותר מ-intervalDays מהייצוא האחרון (או מההפעלה הראשונה, אם לא היה ייצוא) */
export function backupReminderDue(lastExportAt: string | null, firstLaunchAt: string | null, now: Date, intervalDays: number): boolean {
  const since = lastExportAt ?? firstLaunchAt;
  if (!since) return false;
  const days = (now.getTime() - new Date(since).getTime()) / 86_400_000;
  return days > intervalDays;
}

/** כמה ימים עברו מהייצוא האחרון (לתצוגה) */
export function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
}
