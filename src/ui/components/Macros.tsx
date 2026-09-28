// מאזן מול יעדי היום
import type { DayTargets, Nutrients } from '../../domain/types';
import { nutritionMet } from '../../domain/rules/R-ADH';
import { fmtNum } from '../labels';

function Line({ label, value, target, unit }: { label: string; value: number; target: number | null; unit: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target !== null && value > target * 1.1;
  return (
    <div class="macro">
      <div class="row">
        <span>{label}</span>
        <span class="num">
          {fmtNum(value)} / {fmtNum(target)} {unit}
        </span>
      </div>
      <div class={`bar${over ? ' over' : ''}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MacroBars({ eaten, t }: { eaten: Nutrients; t: DayTargets }) {
  const met = nutritionMet(eaten, t);
  const left = t.calories === null ? null : t.calories - eaten.kcal;
  return (
    <div>
      <div class="big" style={{ marginBottom: '10px' }}>
        <span class="v">{fmtNum(eaten.kcal)}</span>
        <span class="of">
          / {fmtNum(t.calories)} קק"ל{left !== null ? ` · ${left >= 0 ? `נשארו ${fmtNum(left)}` : `חריגה ${fmtNum(-left)}`}` : ''}
        </span>
      </div>
      <Line label="חלבון" value={eaten.protein} target={t.proteinG} unit="ג'" />
      <Line label="פחמימות" value={eaten.carbs} target={t.carbsG} unit="ג'" />
      <Line label="שומן" value={eaten.fat} target={t.fatG} unit="ג'" />
      {met !== null && <span class={`badge${met ? ' accent' : ''}`}>{met ? '✓ בטווח היעד' : 'מחוץ לטווח היעד'}</span>}
    </div>
  );
}
