// תוכן קבוע להדגמה (R-DEMO-2): מזווה, מתכונים, תוספים. ערכים ל-100 גרם, בקירוב
import type { MealType, PantryCategory, StockStatus } from '../../domain/types';

export interface DemoPantry {
  key: string;
  name: string;
  category: PantryCategory;
  stock: StockStatus;
  per100: [kcal: number, protein: number, carbs: number, fat: number];
  barcode?: string;
}

export const DEMO_PANTRY: DemoPantry[] = [
  { key: 'eggs', name: 'ביצים', category: 'protein', stock: 'in', per100: [143, 12.6, 0.7, 9.5] },
  { key: 'chicken', name: 'חזה עוף', category: 'protein', stock: 'in', per100: [120, 23, 0, 2.6] },
  { key: 'tuna', name: 'טונה במים', category: 'protein', stock: 'low', per100: [116, 26, 0, 1], barcode: '7290000066264' },
  { key: 'cottage', name: 'קוטג׳ 5%', category: 'protein', stock: 'in', per100: [96, 11, 1.5, 5], barcode: '7290004131074' },
  { key: 'yogurt', name: 'יוגורט חלבון', category: 'protein', stock: 'in', per100: [60, 10, 3.5, 0.5], barcode: '7290011498818' },
  { key: 'salmon', name: 'סלמון', category: 'protein', stock: 'out', per100: [208, 20, 0, 13] },
  { key: 'beef', name: 'בקר טחון 5%', category: 'protein', stock: 'in', per100: [137, 21, 0, 5] },
  { key: 'whey', name: 'אבקת חלבון', category: 'protein', stock: 'in', per100: [380, 78, 7, 5] },
  { key: 'tofu', name: 'טופו', category: 'protein', stock: 'low', per100: [144, 15, 3, 8] },
  { key: 'oats', name: 'שיבולת שועל', category: 'carbs', stock: 'in', per100: [379, 13, 68, 6.5] },
  { key: 'rice', name: 'אורז מבושל', category: 'carbs', stock: 'in', per100: [130, 2.7, 28, 0.3] },
  { key: 'potato', name: 'בטטה', category: 'carbs', stock: 'in', per100: [86, 1.6, 20, 0.1] },
  { key: 'bread', name: 'לחם מלא', category: 'carbs', stock: 'in', per100: [247, 13, 41, 3.4], barcode: '7290000278019' },
  { key: 'pasta', name: 'פסטה מבושלת', category: 'carbs', stock: 'low', per100: [158, 5.8, 31, 0.9] },
  { key: 'lentils', name: 'עדשים מבושלות', category: 'carbs', stock: 'in', per100: [116, 9, 20, 0.4] },
  { key: 'pita', name: 'פיתה', category: 'carbs', stock: 'out', per100: [275, 9, 55, 1.2] },
  { key: 'olive', name: 'שמן זית', category: 'fats', stock: 'in', per100: [884, 0, 0, 100] },
  { key: 'tahini', name: 'טחינה גולמית', category: 'fats', stock: 'in', per100: [595, 17, 21, 54] },
  { key: 'avocado', name: 'אבוקדו', category: 'fats', stock: 'low', per100: [160, 2, 9, 15] },
  { key: 'almonds', name: 'שקדים', category: 'fats', stock: 'in', per100: [579, 21, 22, 50] },
  { key: 'salad', name: 'ירקות לסלט', category: 'produce', stock: 'in', per100: [20, 1, 4, 0.2] },
  { key: 'banana', name: 'בננה', category: 'produce', stock: 'in', per100: [89, 1.1, 23, 0.3] },
  { key: 'apple', name: 'תפוח', category: 'produce', stock: 'in', per100: [52, 0.3, 14, 0.2] },
  { key: 'berries', name: 'פירות יער קפואים', category: 'produce', stock: 'low', per100: [50, 0.7, 12, 0.3] },
  { key: 'broccoli', name: 'ברוקולי', category: 'produce', stock: 'in', per100: [34, 2.8, 7, 0.4] },
  { key: 'honey', name: 'דבש', category: 'other', stock: 'in', per100: [304, 0.3, 82, 0] }
];

export interface DemoMeal {
  key: string;
  name: string;
  type: MealType;
  instructions: string;
  inWeeklyMenu: boolean;
  ingredients: [pantryKey: string, grams: number][];
}

export const DEMO_MEALS: DemoMeal[] = [
  { key: 'shakshuka', name: 'שקשוקה עם לחם', type: 'breakfast', inWeeklyMenu: true, instructions: 'עגבניות ופלפל במחבת, 3 ביצים מעל, מכסה ל-6 דקות.', ingredients: [['eggs', 150], ['salad', 200], ['bread', 60], ['olive', 5]] },
  { key: 'oats', name: 'דייסת שיבולת שועל וחלבון', type: 'breakfast', inWeeklyMenu: true, instructions: 'שיבולת שועל במים או חלב, חלבון אחרי הבישול, פירות מעל.', ingredients: [['oats', 60], ['whey', 30], ['berries', 100], ['banana', 60]] },
  { key: 'chicken-rice', name: 'עוף, אורז וסלט', type: 'lunch', inWeeklyMenu: true, instructions: 'חזה עוף בתנור 20 דקות ב-200°, אורז, סלט עם כפית שמן זית.', ingredients: [['chicken', 200], ['rice', 180], ['salad', 200], ['olive', 8]] },
  { key: 'beef-potato', name: 'קציצות בקר ובטטה', type: 'lunch', inWeeklyMenu: false, instructions: 'קציצות בקר במחבת, בטטה בתנור.', ingredients: [['beef', 180], ['potato', 250], ['broccoli', 150]] },
  { key: 'tuna-salad', name: 'סלט טונה וביצה', type: 'dinner', inWeeklyMenu: true, instructions: 'טונה, ביצה קשה, ירקות וטחינה.', ingredients: [['tuna', 120], ['eggs', 60], ['salad', 250], ['tahini', 15], ['bread', 40]] },
  { key: 'salmon', name: 'סלמון וברוקולי', type: 'dinner', inWeeklyMenu: true, instructions: 'סלמון בתנור 15 דקות, ברוקולי מאודה, אורז.', ingredients: [['salmon', 150], ['broccoli', 200], ['rice', 120]] },
  { key: 'lentil', name: 'מג׳דרה ויוגורט', type: 'dinner', inWeeklyMenu: false, instructions: 'עדשים ואורז עם בצל מטוגן, יוגורט בצד.', ingredients: [['lentils', 200], ['rice', 100], ['yogurt', 200], ['olive', 5]] },
  { key: 'shake', name: 'שייק אחרי אימון', type: 'postWorkout', inWeeklyMenu: true, instructions: 'חלבון, בננה ומים בבלנדר.', ingredients: [['whey', 35], ['banana', 100]] },
  { key: 'cottage-snack', name: 'קוטג׳ עם שקדים', type: 'snack', inWeeklyMenu: false, instructions: 'קוטג׳, קומץ שקדים ותפוח.', ingredients: [['cottage', 250], ['almonds', 15], ['apple', 150]] }
];

export const DEMO_SUPPLEMENTS = [
  { key: 'creatine', name: 'קריאטין', dose: '5 ג׳', timing: 'morning' as const },
  { key: 'vitd', name: 'ויטמין D', dose: '2000 יחב״ל', timing: 'morning' as const },
  { key: 'omega', name: 'אומגה 3', dose: '1 כמוסה', timing: 'morning' as const },
  { key: 'magnesium', name: 'מגנזיום', dose: '400 מ״ג', timing: 'night' as const }
];

export const DEMO_SHOPPING = [
  { name: 'נייר אפייה', category: 'other' as const, bought: false },
  { name: 'לימונים', category: 'produce' as const, bought: true },
  { name: 'גבינה בולגרית', category: 'protein' as const, bought: false }
];
