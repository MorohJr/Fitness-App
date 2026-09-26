// יעדי יום (R-NUT-4): מספר קלוריות גדול, מאקרו, מים וצעדים
import type { DayTargets } from '../../domain/types';
import { fmtNum } from '../labels';

export function TargetsStats({ t }: { t: DayTargets }) {
  const macros = [
    { l: 'חלבון', v: t.proteinG },
    { l: 'פחמימות', v: t.carbsG },
    { l: 'שומן', v: t.fatG }
  ];
  return (
    <div>
      <div class="label">יעד קלוריות</div>
      <div class="big" style={{ marginBottom: '14px' }}>
        <span class="v">{fmtNum(t.calories)}</span>
        {t.calories !== null && <span class="of">קק"ל</span>}
      </div>
      <div class="stats" style={{ marginBottom: '8px' }}>
        {macros.map((m) => (
          <div class="stat" key={m.l}>
            <div class="l">{m.l}</div>
            <div class="v">{fmtNum(m.v)}</div>
            <div class="l">גרם</div>
          </div>
        ))}
      </div>
      <div class="stats two">
        <div class="stat">
          <div class="l">מים</div>
          <div class="v">{fmtNum(t.waterL, 1)}</div>
          <div class="l">ליטר</div>
        </div>
        <div class="stat">
          <div class="l">צעדים</div>
          <div class="v">{fmtNum(t.steps)}</div>
          <div class="l">ביום</div>
        </div>
      </div>
    </div>
  );
}

export function TargetsNotes({ t }: { t: DayTargets }) {
  return (
    <p class="muted small" style={{ marginTop: '12px', marginBottom: 0 }}>
      {t.calorieSource === 'phase' && 'הקלוריות לפי השלב הפעיל. '}
      {t.calorieSource === 'targets' && 'הקלוריות לפי היעדים שלך. '}
      {t.referenceWeightKg !== null ? `מאקרו לפי משקל ${fmtNum(t.referenceWeightKg, 1)} ק"ג.` : 'אין משקל, ולכן אין מאקרו. הזן משקל בפרופיל או במחשבון.'}
    </p>
  );
}
