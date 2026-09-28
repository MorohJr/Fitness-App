// אוכל ביום: מה נאכל, מאזן מול יעדי היום, וסימון רישום מלא
import type { DayLog, ISODate } from '../../../domain/types';
import { updateDayLog } from '../../../data/repos/dayLogs';
import { listFoodLogs } from '../../../data/repos/nutrition';
import { sumLogs } from '../../../domain/rules/R-NUT-food';
import { useLive } from '../../hooks';
import { fmtNum } from '../../labels';
import { MacroBars } from '../../components/Macros';
import { clock } from '../../../data/clock';

export function TodayFood({ date, log }: { date: ISODate; log: DayLog }) {
  const logs = useLive(() => listFoodLogs(date), [date]);
  if (!logs) return null;
  return (
    <div class="card">
      <div class="row">
        <h2 style={{ margin: 0 }}>תזונה</h2>
        <a class="btn" href={date === clock.today() ? '#/nutrition' : `#/nutrition/log/${date}`}>+ רשום</a>
      </div>
      <div style={{ height: '10px' }} />
      <MacroBars eaten={sumLogs(logs)} t={log.targets} />
      {logs.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          {logs.map((l) => (
            <div class="log-item" key={l.id}>
              <span class="grow">{l.name}</span>
              <span class="num small">{fmtNum(l.kcal)}</span>
            </div>
          ))}
        </div>
      )}
      <label class="check-row" style={{ marginTop: '8px' }}>
        <input type="checkbox" checked={!!log.foodComplete} onChange={(e) => updateDayLog(date, { foodComplete: (e.currentTarget as HTMLInputElement).checked })} />
        <span class="grow">רשמתי את כל מה שאכלתי היום</span>
      </label>
    </div>
  );
}
