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
  [extra: string]: unknown;
}

/** שקילה או מדידה עם משקל (למשקל הייחוס) */
export interface WeighIn {
  date: ISODate;
  weightKg: number;
}
