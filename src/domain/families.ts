// משפחות תרגילים (נספח ג') ונתוני ברירת מחדל לכל משפחה
export type Category = 'push' | 'pull' | 'legs' | 'core' | 'posture' | 'mobility';
/** strength = יש סולם וסטטוס. pool = רשימה לבלוקי הגמישות, בלי סטטוס */
export type FamilyKind = 'strength' | 'pool';
/** תפקיד טיפוסי, קובע טווח ומנוחה ברירת מחדל (נספח ג') */
export type FamilyRole = 'main' | 'secondary' | 'accessory' | 'core';

export interface FamilyMeta {
  name: string;
  category: Category;
  kind: FamilyKind;
  role: FamilyRole;
}

export const FAMILY_META = {
  horizontalPush: { name: 'דחיקה אופקית', category: 'push', kind: 'strength', role: 'main' },
  verticalPush: { name: 'דחיקה אנכית', category: 'push', kind: 'strength', role: 'main' },
  dips: { name: 'מקבילים', category: 'push', kind: 'strength', role: 'secondary' },
  verticalPull: { name: 'משיכה אנכית', category: 'pull', kind: 'strength', role: 'main' },
  horizontalPull: { name: 'משיכה אופקית', category: 'pull', kind: 'strength', role: 'main' },
  squat: { name: 'סקוואט', category: 'legs', kind: 'strength', role: 'main' },
  singleLeg: { name: 'רגל אחת', category: 'legs', kind: 'strength', role: 'main' },
  hipHinge: { name: 'ציר ירך', category: 'legs', kind: 'strength', role: 'main' },
  hamstring: { name: 'ירך אחורית', category: 'legs', kind: 'strength', role: 'main' },
  calves: { name: 'תאומים', category: 'legs', kind: 'strength', role: 'accessory' },
  coreFront: { name: 'ליבה קדמית', category: 'core', kind: 'strength', role: 'core' },
  coreSide: { name: 'ליבה צידית', category: 'core', kind: 'strength', role: 'core' },
  plank: { name: 'פלאנק', category: 'core', kind: 'strength', role: 'core' },
  triceps: { name: 'טרייספס', category: 'push', kind: 'strength', role: 'accessory' },
  biceps: { name: 'בייספס', category: 'pull', kind: 'strength', role: 'secondary' },
  grip: { name: 'אחיזה', category: 'pull', kind: 'strength', role: 'accessory' },
  scapula: { name: 'שכמות וכתף אחורית', category: 'pull', kind: 'strength', role: 'accessory' },
  posture: { name: 'יציבה וצוואר', category: 'posture', kind: 'pool', role: 'accessory' },
  jaw: { name: 'לסת ופנים', category: 'posture', kind: 'pool', role: 'accessory' },
  mobility: { name: 'מוביליטי', category: 'mobility', kind: 'pool', role: 'accessory' },
  stretch: { name: 'מתיחות סטטיות', category: 'mobility', kind: 'pool', role: 'accessory' }
} as const satisfies Record<string, FamilyMeta>;

export type FamilyId = keyof typeof FAMILY_META;
export const FAMILY_IDS = Object.keys(FAMILY_META) as FamilyId[];
export const STRENGTH_FAMILIES = FAMILY_IDS.filter((f) => FAMILY_META[f].kind === 'strength');

/** שם המשפחה בעברית (תואם לשימוש הקודם) */
export const FAMILIES: Record<FamilyId, string> = Object.fromEntries(FAMILY_IDS.map((f) => [f, FAMILY_META[f].name])) as Record<FamilyId, string>;

export const CATEGORY_LABELS: Record<Category, string> = {
  push: 'דחיקה',
  pull: 'משיכה',
  legs: 'רגליים',
  core: 'ליבה',
  posture: 'יציבה, צוואר ופנים',
  mobility: 'מוביליטי'
};

/** מנוחה ברירת מחדל לפי תפקיד (נספח ג') */
export const REST_BY_ROLE: Record<FamilyRole, number> = { main: 120, secondary: 90, accessory: 60, core: 60 };
