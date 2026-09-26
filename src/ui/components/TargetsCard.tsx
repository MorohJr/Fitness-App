// כרטיס יעדי יום (R-NUT-4)
import type { DayTargets } from '../../domain/types';
import { fmtNum } from '../labels';

export function TargetsStats({ t }: { t: DayTargets }) {
  const items = [
    { l: 'קלוריות', v: fmtNum(t.calories) },
    { l: 'חלבון (ג\')', v: fmtNum(t.proteinG) },
    { l: 'פחמימות (ג\')', v: fmtNum(t.carbsG) },
    { l: 'שומן (ג\')', v: fmtNum(t.fatG) },
    { l: 'מים (ל\')', v: fmtNum(t.waterL, 1) },
    { l: 'צעדים', v: fmtNum(t.steps) }
  ];
  return (
    <div class="stats">
      {items.map((i) => (
        <div class="stat" key={i.l}>
          <div class="v">{i.v}</div>
          <div class="l">{i.l}</div>
        </div>
      ))}
    </div>
  );
}

export function TargetsNotes({ t }: { t: DayTargets }) {
  return (
    <p class="muted small" style={{ marginTop: '10px' }}>
      {t.calorieSource === 'phase' && 'הקלוריות לפי השלב הפעיל. '}
      {t.calorieSource === 'targets' && 'הקלוריות לפי היעדים שלך. '}
      {t.referenceWeightKg !== null ? `מאקרו לפי משקל ${fmtNum(t.referenceWeightKg, 1)} ק"ג.` : 'אין משקל, ולכן אין מאקרו. הזן משקל בפרופיל או במחשבון.'}
    </p>
  );
}
