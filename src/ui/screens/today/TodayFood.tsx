// אוכל ביום (נבנה בשלב 4). בינתיים: יעדי היום וסימון רישום מלא
import type { DayLog, ISODate } from '../../../domain/types';
import { updateDayLog } from '../../../data/repos/dayLogs';
import { TargetsNotes, TargetsStats } from '../../components/TargetsCard';

export function TodayFood({ date, log }: { date: ISODate; log: DayLog }) {
  return (
    <div class="card">
      <h2>תזונה</h2>
      <TargetsStats t={log.targets} />
      <TargetsNotes t={log.targets} />
      <label class="check-row" style={{ marginTop: '8px' }}>
        <input type="checkbox" checked={!!log.foodComplete} onChange={(e) => updateDayLog(date, { foodComplete: (e.currentTarget as HTMLInputElement).checked })} />
        <span class="grow">רשמתי את כל מה שאכלתי היום</span>
      </label>
    </div>
  );
}
