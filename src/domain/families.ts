// משפחות תרגילים (נספח ג'). המאגר המלא נבנה בשלב 2
export const FAMILIES = {
  horizontalPush: 'דחיקה אופקית',
  verticalPush: 'דחיקה אנכית',
  dips: 'מקבילים',
  verticalPull: 'משיכה אנכית',
  horizontalPull: 'משיכה אופקית',
  squat: 'סקוואט',
  singleLeg: 'רגל אחת',
  hipHinge: 'ציר ירך',
  hamstring: 'ירך אחורית',
  calves: 'תאומים',
  coreFront: 'ליבה (קדמית)',
  coreSide: 'ליבה (צידית ויציבה)',
  plank: 'פלאנק',
  triceps: 'טרייספס',
  biceps: 'בייספס',
  grip: 'אחיזה',
  scapula: 'שכמות וכתף אחורית',
  posture: 'יציבה וצוואר',
  jaw: 'לסת ופנים',
  mobility: 'מוביליטי',
  // קבוצה: כל אחת ממשפחות הליבה. איך בוחרים ביניהן ייקבע בשלב 2
  core: 'ליבה'
} as const;

export type FamilyId = keyof typeof FAMILIES;
