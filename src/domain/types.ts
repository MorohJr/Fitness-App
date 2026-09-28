// טיפוסי הרשומות (SPEC פרק 4). שדות 📸 הם תמונת מצב ולא מתעדכנים כשהמקור משתנה.

/** תאריך לוגי בפורמט YYYY-MM-DD (היום מתחיל ב-04:00, ראה מילון) */
export type ISODate = string;

/** שדות חובה בכל רשומה (3.3) */
export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high';
export type ThemeMode = 'system' | 'light' | 'dark';
export type LocationId = 'home' | 'outdoor';
export type PhaseType = 'cut' | 'bulk' | 'recomp' | 'maintain';
export type DayType = 'training' | 'activeRecovery' | 'rest';
export type SlotPriority = 'main' | 'secondary' | 'accessory';

export interface EquipmentItem {
  id: string;
  name: string;
}

export interface LocationSetup {
  id: LocationId;
  name: string;
  enabled: boolean;
  equipmentIds: string[];
}

export interface AppSettings {
  backupReminderDays: number;
  photoLimit: number;
  themeMode: ThemeMode;
  deloadEveryWeeks: number;
}

/** Profile, רשומה אחת (4.1) */
export interface Profile extends BaseRecord {
  sex: Sex | null;
  birthDate: ISODate | null;
  heightCm: number | null;
  activityLevel: ActivityLevel;
  /** משקל ידני, רק כשאין שקילה או מדידה (R-NUT-2) */
  manualWeightKg: number | null;
  manualWeightDate: ISODate | null;
  equipment: EquipmentItem[];
  locations: LocationSetup[];
  settings: AppSettings;
}

export interface AdherenceRanges {
  /** קלוריות בטווח ± אחוז (R-ADH-1) */
  caloriesPct: number;
  /** חלבון לפחות אחוז מהיעד (R-ADH-1) */
  proteinMinPct: number;
}

/** גרסת יעדים (4.1, R-VER) */
export interface TargetVersion extends BaseRecord {
  effectiveFrom: ISODate;
  calories: number;
  proteinPerKg: number;
  fatPerKgMin: number;
  waterL: number;
  steps: number;
  adherence: AdherenceRanges;
}

/** ערכי יעדים לעריכה, בלי שדות הרשומה */
export type TargetValues = Omit<TargetVersion, keyof BaseRecord | 'effectiveFrom'>;

/** שלב (4.1) */
export interface Phase extends BaseRecord {
  type: PhaseType;
  startDate: ISODate;
  endDate: ISODate | null;
  calories: number;
  /** יעד קצב שינוי משקל בק"ג לשבוע (שלילי = ירידה) */
  weeklyRateKg: number;
  /** שינויי יעד קלורי בתוך השלב (4.1, R-NUT-3) */
  calorieChanges?: { from: ISODate; calories: number }[];
}

export type PhaseInput = Pick<Phase, 'type' | 'startDate' | 'endDate' | 'calories' | 'weeklyRateKg'>;

export interface DayPlan {
  dayType: DayType;
  templateId: string | null;
}

/** גרסת תוכנית שבועית (4.1, R-VER). days[0] = ראשון */
export interface WeekPlanVersion extends BaseRecord {
  effectiveFrom: ISODate;
  days: DayPlan[];
}

export interface TemplateSlot {
  /** מזהה משפחה (נספח ג'), או קבוצה כמו 'core' */
  family: string;
  priority: SlotPriority;
  sets: number;
}

/** תבנית יום (4.2) */
export interface DayTemplate extends BaseRecord {
  name: string;
  kind: 'training' | 'recovery';
  slots: TemplateSlot[];
}

/** יעדי יום (📸 ב-DayLog, R-NUT-4) */
export interface DayTargets {
  calories: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  waterL: number | null;
  steps: number | null;
  adherence: AdherenceRanges | null;
  /** משקל הייחוס שממנו חושב המאקרו (R-NUT-2) */
  referenceWeightKg: number | null;
  calorieSource: 'phase' | 'targets' | null;
}

/** DayLog (4.3). בשלב 1 רק היעדים וסוג היום; שאר השדות בשלב 3 */
export interface DayLog extends BaseRecord {
  date: ISODate;
  dayType: DayType; // 📸
  targets: DayTargets; // 📸
  morningWeightKg?: number | null;
  steps?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  energy?: number | null;
  focus?: number | null;
  doms?: number | null;
  /** ציון התאוששות ידני, דורס את המחושב (R-REC-1) */
  manualRecovery?: number | null;
  waterMl?: number | null;
  /** "רשמתי את כל מה שאכלתי היום" (R-NUT-3) */
  foodComplete?: boolean;
  [extra: string]: unknown;
}

export type SupplementTiming = 'morning' | 'preWorkout' | 'night';

export interface Supplement extends BaseRecord {
  name: string;
  dose: string;
  timing: SupplementTiming;
  active: boolean;
}

export interface SupplementLog extends BaseRecord {
  date: ISODate;
  supplementId: string;
  name: string; // 📸
  dose: string; // 📸
  taken: boolean;
}

/** שקילה או מדידה עם משקל (למשקל הייחוס) */
export interface WeighIn {
  date: ISODate;
  weightKg: number;
}

// ===== שלב 2: תרגילים, פציעות ואימונים (4.2) =====

export type ExerciseStatus = 'red' | 'yellow' | 'green';
export type MeasureType = 'reps' | 'time' | 'repsLoad';

export interface FamilyLevel {
  family: string;
  level: number;
}

export interface Exercise extends BaseRecord {
  name: string;
  families: FamilyLevel[];
  /** לאינדקס: מזהי המשפחות */
  familyIds: string[];
  /** null למשפחות בלי סטטוס (יציבה, לסת, מוביליטי) */
  status: ExerciseStatus | null;
  category: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** ציוד שכולו נדרש */
  equipment: string[];
  locations: LocationId[];
  measure: MeasureType;
  unilateral: boolean;
  targetMin: number;
  targetMax: number;
  secondsPerSet: number;
  restSec: number;
  tempo: string;
  cues: string[];
  safety: string;
  custom: boolean;
  /** עומס נוכחי (משקולת או גומייה), אחרי R-PRG-5 */
  currentLoad?: string | null;
  /** באימון הבא מתחילים מהקצה התחתון (R-PRG-4, R-PRG-5, R-PRG-7) */
  restartAtMin?: boolean;
}

export type InjuryStatus = 'active' | 'recovering' | 'healed';

export interface Injury extends BaseRecord {
  area: string;
  pain: number;
  status: InjuryStatus;
  startDate: ISODate;
  healedDate: ISODate | null;
  notes: string;
  blockedExercises: string[];
  blockedFamilies: string[];
  blockedMuscles: string[];
}

export type WorkoutStatus = 'planned' | 'inProgress' | 'completed' | 'skipped';

export interface Workout extends BaseRecord {
  date: ISODate;
  /** 'test' = מבחן פתיחה */
  kind: 'regular' | 'test';
  dayType: DayType | null; // 📸
  templateName: string | null; // 📸
  location: LocationId;
  isDeload: boolean; // 📸
  recoveryScore: number | null; // 📸
  status: WorkoutStatus;
  startedAt: string | null;
  endedAt: string | null;
  blockMinutes: Record<string, number>;
  feeling: number | null;
  notes: string;
  /** סוף המנוחה הנוכחית (טיימר לפי שעה, 3.6) */
  restEndsAt?: number | null;
  /** מבנה האימון שנבנה (בלוקים וזמנים), תמונת מצב */
  plan?: unknown;
}

export interface WorkoutExercise extends BaseRecord {
  workoutId: string;
  exerciseId: string;
  exerciseName: string; // 📸
  family: string;
  level: number; // 📸
  statusAtTime: ExerciseStatus | null; // 📸
  role: 'work' | 'technique' | 'warmup';
  targetSets: number;
  targetMin: number;
  targetMax: number;
  tempo: string;
  targetToday: string;
  order: number;
  /** ערך היעד לסט (חזרות או שניות) */
  targetValue?: number;
  priority?: string;
  rpeTarget?: string | null;
  restSec?: number;
  note?: string | null;
}

export type Side = 'right' | 'left' | 'none';

export interface SetLog extends BaseRecord {
  workoutExerciseId: string;
  setNumber: number;
  side: Side;
  reps: number | null;
  seconds: number | null;
  load: string | null;
  rpe: number | null;
}

// ===== שלב 4: תזונה (4.3, 4.4) =====

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type PantryCategory = 'protein' | 'carbs' | 'fats' | 'produce' | 'other';
export type StockStatus = 'in' | 'low' | 'out';

export interface PantryItem extends BaseRecord {
  name: string;
  category: PantryCategory;
  stock: StockStatus;
  /** ערכים ל-100 גרם */
  per100: Nutrients;
  barcode: string | null;
  source: 'manual' | 'off';
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'postWorkout';

export interface MealIngredient {
  pantryItemId: string;
  grams: number;
}

export interface Meal extends BaseRecord {
  name: string;
  type: MealType;
  photoId: string | null;
  instructions: string;
  ingredients: MealIngredient[];
  inWeeklyMenu: boolean;
}

export type FoodLogKind = 'meal' | 'pantry' | 'quick';

/** מה נאכל. הערכים נשמרים ברגע הרישום (📸) */
export interface FoodLog extends BaseRecord {
  date: ISODate;
  kind: FoodLogKind;
  refId: string | null;
  name: string; // 📸
  /** מכפיל מנה (ארוחה) או גרמים (פריט). במהיר: 1 */
  amount: number;
  kcal: number; // 📸
  protein: number; // 📸
  carbs: number; // 📸
  fat: number; // 📸
}

export interface ShoppingItem extends BaseRecord {
  name: string;
  category: PantryCategory;
  bought: boolean;
  /** לפריט אוטומטי: מזהה פריט המזווה. ידני: null */
  autoKey: string | null;
}

export type SuggestionType =
  | 'promote' | 'advance' | 'regress' | 'tempo' | 'load' | 'stayOrEasier'
  | 'calories' | 'deloadEarly' | 'deloadPostpone' | 'recoverySwap' | 'missedWorkout' | 'volume' | 'photoCleanup';

export interface Suggestion extends BaseRecord {
  type: SuggestionType;
  /** היום שבו נוצרה ההצעה (או היום שעליו היא חלה) */
  date: ISODate;
  refId: string | null;
  payload: Record<string, unknown>;
  title: string;
  /** למה, עם המספרים */
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt: string | null;
  /** לבחירה בין שתי אפשרויות (למשל R-PRG-7) */
  choice?: string | null;
}
