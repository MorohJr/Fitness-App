import { describe, expect, it } from 'vitest';
import { mapOff } from '../../src/data/external/openFoodFacts';

describe('Open Food Facts: המרה', () => {
  it('ערכים ל-100 גרם ושם בעברית', () => {
    expect(mapOff({ code: '7290000', product_name: 'Cottage', product_name_he: 'קוטג׳ 5%', brands: 'Tnuva, X', nutriments: { 'energy-kcal_100g': 96, proteins_100g: 11, carbohydrates_100g: 1.5, fat_100g: 5 } }))
      .toEqual({ code: '7290000', name: 'קוטג׳ 5%', brand: 'Tnuva', per100: { kcal: 96, protein: 11, carbs: 1.5, fat: 5 } });
  });
  it('רק kJ: המרה לקלוריות', () => {
    expect(mapOff({ product_name: 'x', nutriments: { energy_100g: 418.4 } })?.per100.kcal).toBe(100);
  });
  it('בלי שם או בלי אנרגיה: לא שמיש', () => {
    expect(mapOff({ nutriments: { 'energy-kcal_100g': 10 } })).toBeNull();
    expect(mapOff({ product_name: 'x', nutriments: {} })).toBeNull();
  });
});
