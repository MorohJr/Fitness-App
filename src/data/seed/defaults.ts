// ערכי ברירת מחדל לפרופיל וליעדים (4.1)
import type { AppSettings, EquipmentItem, LocationSetup, TargetValues } from '../../domain/types';

export const DEFAULT_EQUIPMENT: EquipmentItem[] = [
  { id: 'dumbbells-10', name: 'שתי משקולות יד 10 ק"ג' },
  { id: 'dumbbell-bar', name: 'מוט חיבור למשקולות' },
  { id: 'pullup-bar', name: 'מוט מתח' },
  { id: 'parallel-bars', name: 'מקבילים' },
  { id: 'bench', name: 'ספסל' },
  { id: 'bands', name: 'גומיות התנגדות' },
  { id: 'sliders', name: 'סליידרים' }
];

export const DEFAULT_LOCATIONS: LocationSetup[] = [
  { id: 'home', name: 'בית', enabled: true, equipmentIds: ['dumbbells-10', 'dumbbell-bar'] },
  { id: 'outdoor', name: 'חוץ', enabled: true, equipmentIds: ['pullup-bar', 'parallel-bars', 'bench'] }
];

export const DEFAULT_SETTINGS: AppSettings = {
  backupReminderDays: 3,
  photoLimit: 40,
  themeMode: 'system',
  deloadEveryWeeks: 5
};

export const DEFAULT_TARGET_VALUES: TargetValues = {
  calories: 2200,
  proteinPerKg: 1.8,
  fatPerKgMin: 0.8,
  waterL: 3,
  steps: 8000,
  adherence: { caloriesPct: 10, proteinMinPct: 90 }
};
