import { describe, expect, it } from 'vitest';
import { referenceWeight, trendWeight } from '../../src/domain/calc/weight';

const w = (date: string, weightKg: number) => ({ date, weightKg });

describe('R-BODY-3 משקל מגמה', () => {
  it('צריך לפחות 3 שקילות ב-7 ימים', () => {
    expect(trendWeight([w('2026-09-25', 80), w('2026-09-27', 81)], '2026-09-27')).toBeNull();
    expect(trendWeight([w('2026-09-21', 80), w('2026-09-25', 81), w('2026-09-27', 82)], '2026-09-27')).toBe(81);
  });
  it('שקילה מלפני 7 ימים או אחרי התאריך לא נספרת', () => {
    const list = [w('2026-09-20', 70), w('2026-09-22', 80), w('2026-09-24', 80), w('2026-09-26', 80), w('2026-09-28', 90)];
    expect(trendWeight(list, '2026-09-27')).toBe(80);
  });
});

describe('R-NUT-2 משקל ייחוס', () => {
  it('מגמה, אחרת שקילה אחרונה עד היום, אחרת ידני', () => {
    expect(referenceWeight([w('2026-09-21', 80), w('2026-09-25', 81), w('2026-09-27', 82)], '2026-09-27', 70)).toBe(81);
    expect(referenceWeight([w('2026-09-10', 79), w('2026-09-30', 85)], '2026-09-27', 70)).toBe(79);
    expect(referenceWeight([], '2026-09-27', 70)).toBe(70);
    expect(referenceWeight([], '2026-09-27', null)).toBeNull();
  });
});
