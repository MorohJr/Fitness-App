// מאגר התרגילים ההתחלתי (נספח ג'). מזהים קבועים, כדי שאפשר יהיה לעדכן את המאגר בעתיד
import type { Exercise, LocationId, MeasureType } from '../../domain/types';
import { FAMILY_META, REST_BY_ROLE, type FamilyId } from '../../domain/families';
import type { MuscleId } from '../../domain/muscles';

export type SeedExercise = Omit<Exercise, 'createdAt' | 'updatedAt' | 'deletedAt'>;

interface Def {
  id: string;
  name: string;
  fam: [FamilyId, number][];
  measure?: MeasureType;
  uni?: boolean;
  eq?: string[];
  loc?: LocationId[];
  pm: MuscleId[];
  sm?: MuscleId[];
  range?: [number, number];
  tempo?: string;
  cues: string[];
  safety: string;
}

// ציוד (מזהים מהפרופיל, 4.1)
const ELEV = 'elevated';
const BAR = 'pullup-bar';
const PAR = 'parallel-bars';
const DB = 'dumbbells-10';
const SLD = 'sliders';

const DEFS: Def[] = [
  // ===== דחיקה אופקית =====
  { id: 'ex-wall-push-up', name: 'Wall Push-up', fam: [['horizontalPush', 1]], pm: ['chest'], sm: ['triceps', 'shoulders'],
    cues: ['גוף בקו ישר מהראש לעקבים', 'ידיים ברוחב כתפיים, בגובה החזה', 'מרפקים בזווית של כ-45° מהגוף'], safety: 'אל תשקיע את הגב התחתון' },
  { id: 'ex-incline-push-up', name: 'Incline Push-up', fam: [['horizontalPush', 2]], eq: [ELEV], pm: ['chest'], sm: ['triceps', 'shoulders', 'core'],
    cues: ['ידיים על משטח יציב בגובה המותניים', 'בטן וישבן מכווצים', 'חזה יורד עד המשטח'], safety: 'ודא שהמשטח לא זז' },
  { id: 'ex-knee-push-up', name: 'Knee Push-up', fam: [['horizontalPush', 3]], pm: ['chest'], sm: ['triceps', 'shoulders'],
    cues: ['קו ישר מהברכיים לראש', 'חזה יורד עד כמה ס"מ מהרצפה', 'דוחפים את הרצפה ממך בעלייה'], safety: 'שים משהו רך מתחת לברכיים' },
  { id: 'ex-push-up', name: 'Push-up', fam: [['horizontalPush', 4]], pm: ['chest'], sm: ['triceps', 'shoulders', 'core'],
    cues: ['גוף כמו קרש, ישבן מכווץ', 'מרפקים 30–45° מהגוף', 'טווח מלא: חזה כמעט נוגע ברצפה'], safety: 'אל תפיל את הראש קדימה' },
  { id: 'ex-diamond-push-up', name: 'Diamond Push-up', fam: [['horizontalPush', 5], ['triceps', 2]], pm: ['triceps', 'chest'], sm: ['shoulders'],
    cues: ['אגודלים ואצבעות מורות יוצרים יהלום מתחת לחזה', 'מרפקים צמודים לגוף', 'יורדים לאט'], safety: 'אם כואב במרפקים או בשורש כף היד, הרחב מעט את הידיים' },
  { id: 'ex-decline-push-up', name: 'Decline Push-up', fam: [['horizontalPush', 6]], eq: [ELEV], pm: ['chest', 'shoulders'], sm: ['triceps', 'core'],
    cues: ['רגליים על משטח מוגבה', 'גוף ישר, בלי לשבור באגן', 'ראש בקו הגוף'], safety: 'התחל עם משטח נמוך' },
  { id: 'ex-archer-push-up', name: 'Archer Push-up', fam: [['horizontalPush', 7]], uni: true, pm: ['chest'], sm: ['triceps', 'shoulders', 'core'],
    cues: ['ידיים רחבות מאוד', 'יורדים לצד אחד, היד השנייה ישרה', 'מחליפים צד כל חזרה או כל סט'], safety: 'היד הישרה לא נועלת את המרפק בכוח' },

  // ===== דחיקה אנכית =====
  { id: 'ex-pike-push-up', name: 'Pike Push-up', fam: [['verticalPush', 1]], pm: ['shoulders'], sm: ['triceps', 'upperBack'],
    cues: ['אגן גבוה, גוף בצורת V הפוכה', 'הראש יורד קדימה בין הידיים, לא ישר למטה', 'מרפקים לא נפתחים לצדדים'], safety: 'ראש לא נוחת על הרצפה, עצור לפני' },
  { id: 'ex-elevated-pike-push-up', name: 'Elevated Pike Push-up', fam: [['verticalPush', 2]], eq: [ELEV], pm: ['shoulders'], sm: ['triceps', 'upperBack', 'core'],
    cues: ['רגליים על משטח מוגבה', 'אגן מעל הכתפיים', 'יורדים לאט, דוחפים חזק'], safety: 'משטח יציב שלא מחליק' },
  { id: 'ex-wall-handstand-hold', name: 'Wall Handstand Hold', fam: [['verticalPush', 3]], measure: 'time', pm: ['shoulders'], sm: ['triceps', 'core', 'upperBack'],
    cues: ['בטן אל הקיר (הליכה עם הרגליים על הקיר)', 'ידיים דוחפות את הרצפה, אוזניים בין הזרועות', 'גוף ישר וצלעות פנימה'], safety: 'תרגל ירידה בטוחה לפני שמחזיקים זמן' },

  // ===== מקבילים =====
  { id: 'ex-bench-dip', name: 'Bench Dip', fam: [['dips', 1], ['triceps', 1]], eq: [ELEV], pm: ['triceps'], sm: ['chest', 'shoulders'],
    cues: ['ידיים על קצה המשטח, אצבעות קדימה', 'גב קרוב למשטח', 'יורדים עד מרפק ב-90°'], safety: 'לא לרדת עמוק מדי אם הכתף הקדמית נמתחת בכאב' },
  { id: 'ex-negative-dip', name: 'Negative Dip', fam: [['dips', 2]], eq: [PAR], pm: ['chest', 'triceps'], sm: ['shoulders'],
    cues: ['קופצים לעמידה על ידיים ישרות', 'יורדים לאט במשך 3–5 שניות', 'כתפיים למטה, רחוק מהאוזניים'], safety: 'עצור כשהכתף מתחילה לבלוט קדימה' },
  { id: 'ex-parallel-bar-dip', name: 'Parallel Bar Dip', fam: [['dips', 3]], eq: [PAR], pm: ['chest', 'triceps'], sm: ['shoulders'],
    cues: ['נטייה קלה קדימה', 'יורדים עד מרפק ב-90°', 'דוחפים עד נעילה עדינה'], safety: 'בלי קפיצות בתחתית' },

  // ===== משיכה אנכית =====
  { id: 'ex-dead-hang', name: 'Dead Hang', fam: [['verticalPull', 1], ['grip', 1]], measure: 'time', eq: [BAR], pm: ['forearms'], sm: ['back', 'shoulders'],
    cues: ['אחיזה מלאה, אגודל סביב המוט', 'כתפיים פעילות, לא "תלויות" על המפרקים', 'נשימה רגועה'], safety: 'לרדת בשליטה, לא ליפול' },
  { id: 'ex-scapular-pull-up', name: 'Scapular Pull-up', fam: [['verticalPull', 2]], eq: [BAR], pm: ['back', 'upperBack'], sm: ['forearms'],
    cues: ['ידיים ישרות לאורך כל התנועה', 'מושכים את השכמות למטה ופנימה', 'עלייה של כמה ס"מ בלבד'], safety: 'תנועה קטנה ונקייה, בלי תנופה' },
  { id: 'ex-negative-pull-up', name: 'Negative Pull-up', fam: [['verticalPull', 3]], eq: [BAR], pm: ['back'], sm: ['biceps', 'forearms'],
    cues: ['מתחילים עם סנטר מעל המוט (קפיצה או מדרגה)', 'יורדים לאט במשך 3–5 שניות', 'עד ידיים ישרות'], safety: 'אל תשחרר בבת אחת בתחתית' },
  { id: 'ex-chin-up', name: 'Chin-up', fam: [['verticalPull', 4]], eq: [BAR], pm: ['back', 'biceps'], sm: ['forearms'],
    cues: ['אחיזה הפוכה (כפות אליך) ברוחב כתפיים', 'מתחילים משכמות', 'סנטר מעל המוט'], safety: 'בלי קיפינג, בלי נדנוד' },
  { id: 'ex-pull-up', name: 'Pull-up', fam: [['verticalPull', 5]], eq: [BAR], pm: ['back'], sm: ['biceps', 'forearms', 'upperBack'],
    cues: ['אחיזה רגילה, מעט רחבה מהכתפיים', 'מרפקים יורדים לכיוון הצלעות', 'חזה אל המוט'], safety: 'ירידה מלאה בשליטה' },
  { id: 'ex-wide-pull-up', name: 'Wide Pull-up', fam: [['verticalPull', 6]], eq: [BAR], pm: ['back'], sm: ['upperBack', 'biceps'],
    cues: ['אחיזה רחבה פי 1.5 מהכתפיים', 'מושכים את המרפקים למטה ואחורה', 'עצירה קצרה למעלה'], safety: 'אם הכתף מציקה, צמצם את הרוחב' },

  // ===== משיכה אופקית =====
  { id: 'ex-high-incline-row', name: 'High Incline Row', fam: [['horizontalPull', 1]], eq: [PAR], pm: ['back', 'upperBack'], sm: ['biceps'],
    cues: ['גוף כמעט עומד, נשען אחורה', 'גוף ישר כמו קרש', 'חזה אל המוט, שכמות נסגרות'], safety: 'עקבים יציבים, שלא יחליקו' },
  { id: 'ex-australian-row', name: 'Australian Row', fam: [['horizontalPull', 2]], eq: [PAR], pm: ['back', 'upperBack'], sm: ['biceps', 'core'],
    cues: ['מתחת למוט בגובה המותניים', 'גוף ישר, עקבים על הרצפה', 'מושכים את החזה למוט'], safety: 'אגן לא צונח' },
  { id: 'ex-dumbbell-row', name: 'Dumbbell Row', fam: [['horizontalPull', 2]], measure: 'repsLoad', uni: true, eq: [DB], pm: ['back', 'upperBack'], sm: ['biceps'],
    cues: ['גב ישר, רכון קדימה, יד תומכת על ברך או משטח', 'מושכים את המשקולת לכיוון המותן', 'שכמה נסגרת למעלה'], safety: 'בלי לסובב את הגו' },
  { id: 'ex-feet-elevated-row', name: 'Feet-elevated Row', fam: [['horizontalPull', 3]], eq: [PAR], pm: ['back', 'upperBack'], sm: ['biceps', 'core'],
    cues: ['רגליים על משטח מוגבה, גוף מקביל לרצפה', 'חזה אל המוט', 'עצירה של שנייה למעלה'], safety: 'משטח יציב לרגליים' },
  { id: 'ex-archer-row', name: 'Archer Row', fam: [['horizontalPull', 4]], uni: true, eq: [PAR], pm: ['back', 'upperBack'], sm: ['biceps', 'core'],
    cues: ['ידיים רחבות', 'מושכים לצד אחד, היד השנייה ישרה', 'גוף לא מסתובב'], safety: 'היד הישרה לא נועלת בכוח' },

  // ===== סקוואט =====
  { id: 'ex-bodyweight-squat', name: 'Bodyweight Squat', fam: [['squat', 1]], pm: ['quads', 'glutes'], sm: ['core'],
    cues: ['רגליים ברוחב כתפיים', 'ברכיים בכיוון האצבעות', 'יורדים עד ירך מקבילה לרצפה או מתחת'], safety: 'עקבים לא מתרוממים' },
  { id: 'ex-split-squat', name: 'Split Squat', fam: [['squat', 2]], uni: true, pm: ['quads', 'glutes'], sm: ['adductors', 'core'],
    cues: ['צעד ארוך, משקל על הרגל הקדמית', 'ברך אחורית יורדת לכיוון הרצפה', 'גו זקוף'], safety: 'ברך קדמית לא קורסת פנימה' },
  { id: 'ex-bulgarian-split-squat', name: 'Bulgarian Split Squat', fam: [['squat', 3]], uni: true, eq: [ELEV], pm: ['quads', 'glutes'], sm: ['adductors', 'core'],
    cues: ['כף רגל אחורית על משטח מוגבה', 'רגל קדמית רחוק מספיק', 'יורדים ישר למטה'], safety: 'התחל בלי משקל ומצא את המרחק הנכון' },
  { id: 'ex-db-bulgarian-split-squat', name: 'Dumbbell Bulgarian Split Squat', fam: [['squat', 4]], measure: 'repsLoad', uni: true, eq: [ELEV, DB], pm: ['quads', 'glutes'], sm: ['adductors', 'forearms'],
    cues: ['משקולת בכל יד, ידיים לצדדים', 'אותה טכניקה כמו בלי משקל', 'שליטה בירידה'], safety: 'כשהאחיזה נגמרת, הסט נגמר' },

  // ===== רגל אחת =====
  { id: 'ex-step-up', name: 'Step-up', fam: [['singleLeg', 1]], uni: true, eq: [ELEV], pm: ['quads', 'glutes'], sm: ['calves'],
    cues: ['כל כף הרגל על המשטח', 'עולים בכוח הרגל העליונה, לא בדחיפה מהתחתונה', 'יורדים לאט'], safety: 'משטח יציב, בגובה הברך או מתחת' },
  { id: 'ex-assisted-pistol-squat', name: 'Assisted Pistol Squat', fam: [['singleLeg', 2]], uni: true, pm: ['quads', 'glutes'], sm: ['core', 'calves'],
    cues: ['אוחזים במשקוף או בעמוד לעזרה', 'רגל חופשית ישרה קדימה', 'יורדים לאט כמה שאפשר'], safety: 'עזרה בידיים, לא משיכה חזקה' },
  { id: 'ex-box-pistol-squat', name: 'Box Pistol Squat', fam: [['singleLeg', 3]], uni: true, eq: [ELEV], pm: ['quads', 'glutes'], sm: ['core', 'calves'],
    cues: ['יורדים על רגל אחת עד ישיבה על המשטח', 'נגיעה קלה, לא נפילה', 'קמים בלי תנופה'], safety: 'מתחילים ממשטח גבוה ומנמיכים' },
  { id: 'ex-shrimp-squat', name: 'Shrimp Squat', fam: [['singleLeg', 4]], uni: true, pm: ['quads', 'glutes'], sm: ['core'],
    cues: ['אוחזים ברגל האחורית מאחורה', 'ברך אחורית יורדת לרצפה', 'גו נוטה מעט קדימה'], safety: 'שים משהו רך מתחת לברך' },

  // ===== ציר ירך =====
  { id: 'ex-glute-bridge', name: 'Glute Bridge', fam: [['hipHinge', 1]], pm: ['glutes'], sm: ['hamstrings', 'lowerBack'],
    cues: ['שכיבה על הגב, ברכיים כפופות', 'דוחפים דרך העקבים', 'עצירה למעלה עם ישבן מכווץ'], safety: 'לא מקשתים את הגב התחתון למעלה' },
  { id: 'ex-single-leg-glute-bridge', name: 'Single-leg Glute Bridge', fam: [['hipHinge', 2]], uni: true, pm: ['glutes'], sm: ['hamstrings'],
    cues: ['רגל אחת באוויר', 'אגן ישר, לא נוטה לצד', 'עצירה של שנייה למעלה'], safety: 'אם יש התכווצות בירך האחורית, קרב את העקב' },
  { id: 'ex-db-romanian-deadlift', name: 'Dumbbell Romanian Deadlift', fam: [['hipHinge', 3]], measure: 'repsLoad', eq: [DB], pm: ['hamstrings', 'glutes'], sm: ['lowerBack', 'forearms'],
    cues: ['גב ישר, ברכיים כפופות מעט', 'אגן זז אחורה, משקולות צמודות לרגליים', 'יורדים עד מתיחה בירך האחורית'], safety: 'גב לא מתעגל. עוצרים לפני שזה קורה' },
  { id: 'ex-single-leg-rdl', name: 'Single-leg Romanian Deadlift', fam: [['hipHinge', 4]], measure: 'repsLoad', uni: true, pm: ['hamstrings', 'glutes'], sm: ['core', 'lowerBack'],
    cues: ['עמידה על רגל אחת, ברך רכה', 'גו ורגל חופשית זזים יחד כמו מוט', 'אגן ישר, לא נפתח לצד'], safety: 'אפשר עם משקולת או בלי. שיווי משקל לפני משקל' },

  // ===== ירך אחורית =====
  { id: 'ex-slider-leg-curl', name: 'Slider Leg Curl', fam: [['hamstring', 1]], eq: [SLD], pm: ['hamstrings'], sm: ['glutes'],
    cues: ['שכיבה על הגב, עקבים על סליידרים או מגבת', 'אגן למעלה לאורך כל הסט', 'מושכים עקבים לישבן ומחזירים לאט'], safety: 'אם יש התכווצות, קצר את הטווח' },
  { id: 'ex-single-leg-slider-curl', name: 'Single-leg Slider Leg Curl', fam: [['hamstring', 2]], uni: true, eq: [SLD], pm: ['hamstrings'], sm: ['glutes'],
    cues: ['רגל אחת על הסליידר, השנייה באוויר', 'אגן גבוה ויציב', 'חזרה איטית'], safety: 'עצור לפני התכווצות' },
  { id: 'ex-nordic-curl-negative', name: 'Nordic Curl Negative', fam: [['hamstring', 3]], pm: ['hamstrings'], sm: ['glutes', 'calves'],
    cues: ['עמידת ברכיים, עקבים מקובעים (מתחת לספה או ספסל)', 'גוף ישר מהברכיים לראש', 'נופלים קדימה הכי לאט שאפשר, ידיים תופסות בסוף'], safety: 'מאמץ גבוה לירך האחורית, מתחילים בסטים קצרים' },

  // ===== תאומים =====
  { id: 'ex-calf-raise', name: 'Calf Raise', fam: [['calves', 1]], pm: ['calves'],
    cues: ['על קצה מדרגה אם אפשר', 'עלייה מלאה על קצות האצבעות', 'ירידה איטית עד מתיחה'], safety: 'יד על קיר לשיווי משקל' },
  { id: 'ex-single-leg-calf-raise', name: 'Single-leg Calf Raise', fam: [['calves', 2]], uni: true, pm: ['calves'],
    cues: ['רגל אחת, טווח מלא', 'עצירה של שנייה למעלה', 'ירידה של 3 שניות'], safety: 'יד על קיר לשיווי משקל' },
  { id: 'ex-weighted-single-leg-calf-raise', name: 'Weighted Single-leg Calf Raise', fam: [['calves', 3]], measure: 'repsLoad', uni: true, eq: [DB], pm: ['calves'], sm: ['forearms'],
    cues: ['משקולת ביד של אותו צד', 'טווח מלא', 'שליטה בירידה'], safety: 'יד חופשית על קיר' },

  // ===== ליבה קדמית =====
  { id: 'ex-dead-bug', name: 'Dead Bug', fam: [['coreFront', 1]], pm: ['core'], sm: ['obliques'],
    cues: ['גב תחתון צמוד לרצפה כל הזמן', 'יד ורגל נגדיות נפתחות לאט', 'נושפים בזמן הפתיחה'], safety: 'אם הגב מתרומם, קצר את הטווח' },
  { id: 'ex-hollow-hold', name: 'Hollow Hold', fam: [['coreFront', 2]], measure: 'time', pm: ['core'], sm: ['obliques'],
    cues: ['גב תחתון צמוד לרצפה', 'כתפיים ורגליים מורמות', 'ידיים ורגליים ארוכות ככל שמצליחים לשמור על הגב'], safety: 'כפוף ברכיים כדי להקל' },
  { id: 'ex-hanging-knee-raise', name: 'Hanging Knee Raise', fam: [['coreFront', 3]], eq: [BAR], pm: ['core'], sm: ['forearms', 'obliques'],
    cues: ['תלייה פעילה, בלי נדנוד', 'מרימים ברכיים ומגלגלים את האגן', 'ירידה בשליטה'], safety: 'עוצרים את התנופה לפני החזרה הבאה' },
  { id: 'ex-hanging-leg-raise', name: 'Hanging Leg Raise', fam: [['coreFront', 4]], eq: [BAR], pm: ['core'], sm: ['forearms', 'obliques'],
    cues: ['רגליים ישרות', 'מרימים עד מקביל לרצפה או יותר', 'בלי תנופה'], safety: 'אם הגב התחתון מציק, חזור לברכיים' },

  // ===== ליבה צידית =====
  { id: 'ex-side-plank', name: 'Side Plank', fam: [['coreSide', 1]], measure: 'time', uni: true, pm: ['obliques'], sm: ['core', 'shoulders'],
    cues: ['מרפק מתחת לכתף', 'גוף בקו ישר', 'אגן גבוה'], safety: 'אפשר על הברכיים כדי להקל' },
  { id: 'ex-side-plank-hip-dip', name: 'Side Plank with Hip Dip', fam: [['coreSide', 2]], uni: true, pm: ['obliques'], sm: ['core'],
    cues: ['מפלאנק צידי מורידים אגן לרצפה', 'מרימים גבוה מקו הגוף', 'קצב איטי'], safety: 'כתף יציבה' },
  { id: 'ex-copenhagen-plank', name: 'Copenhagen Plank', fam: [['coreSide', 3]], measure: 'time', uni: true, eq: [ELEV], pm: ['adductors', 'obliques'], sm: ['core'],
    cues: ['רגל עליונה על משטח (ברך לגרסה קלה, קרסול לקשה)', 'גוף ישר', 'רגל תחתונה חופשית'], safety: 'התחל בגרסת הברך, מאמץ חזק למפשעה' },

  // ===== פלאנק =====
  { id: 'ex-plank', name: 'Plank', fam: [['plank', 1]], measure: 'time', pm: ['core'], sm: ['shoulders', 'glutes'],
    cues: ['מרפקים מתחת לכתפיים', 'ישבן ובטן מכווצים', 'גוף ישר, לא אגן גבוה'], safety: 'עוצרים כשהגב התחתון שוקע' },
  { id: 'ex-rkc-plank', name: 'RKC Plank', fam: [['plank', 2]], measure: 'time', pm: ['core'], sm: ['glutes', 'shoulders'],
    cues: ['פלאנק עם כיווץ מקסימלי של כל הגוף', 'מושכים מרפקים לכיוון הרגליים (בלי לזוז)', 'זמן קצר, מאמץ גבוה'], safety: 'נשימה קצרה ומבוקרת, לא עוצרים נשימה' },
  { id: 'ex-long-lever-plank', name: 'Long-lever Plank', fam: [['plank', 3]], measure: 'time', pm: ['core'], sm: ['shoulders'],
    cues: ['מרפקים לפני הכתפיים (מנוף ארוך)', 'גוף ישר', 'אגן לא צונח'], safety: 'קרב את המרפקים אם הגב שוקע' },

  // ===== טרייספס (Bench Dip ו-Diamond Push-up כבר למעלה) =====
  { id: 'ex-db-overhead-extension', name: 'Dumbbell Overhead Extension', fam: [['triceps', 3]], measure: 'repsLoad', eq: [DB], pm: ['triceps'], sm: ['core'],
    cues: ['משקולת אחת בשתי ידיים מעל הראש', 'מרפקים מצביעים קדימה', 'יורדים מאחורי הראש ומיישרים'], safety: 'צלעות פנימה, לא מקשתים את הגב' },

  // ===== בייספס =====
  { id: 'ex-db-curl', name: 'Dumbbell Curl', fam: [['biceps', 1]], measure: 'repsLoad', eq: [DB], pm: ['biceps'], sm: ['forearms'],
    cues: ['מרפקים צמודים לגוף', 'עלייה בלי תנופה', 'ירידה של 3 שניות'], safety: 'גב ישר, בלי לזרוק לאחור' },
  { id: 'ex-hammer-curl', name: 'Hammer Curl', fam: [['biceps', 2]], measure: 'repsLoad', eq: [DB], pm: ['biceps', 'forearms'],
    cues: ['כפות ידיים פונות זו לזו', 'מרפקים קבועים', 'שליטה בירידה'], safety: 'בלי תנופה' },
  { id: 'ex-chin-up-top-hold', name: 'Chin-up Top Hold', fam: [['biceps', 3]], measure: 'time', eq: [BAR], pm: ['biceps', 'back'], sm: ['forearms'],
    cues: ['אחיזה הפוכה, סנטר מעל המוט', 'מחזיקים בלי לרדת', 'כתפיים למטה'], safety: 'יורדים לאט בסוף, לא נופלים' },

  // ===== אחיזה (Dead Hang כבר למעלה) =====
  { id: 'ex-single-arm-assisted-hang', name: 'Single-arm Assisted Hang', fam: [['grip', 2]], measure: 'time', uni: true, eq: [BAR], pm: ['forearms'], sm: ['back'],
    cues: ['יד אחת על המוט, השנייה עוזרת מעט (על היד או על מגבת)', 'כתף פעילה', 'מחליפים צד'], safety: 'בלי תלייה פסיבית על הכתף' },
  { id: 'ex-towel-hang', name: 'Towel Hang', fam: [['grip', 3]], measure: 'time', eq: [BAR], pm: ['forearms'], sm: ['back'],
    cues: ['שתי מגבות מעל המוט, אחיזה בהן', 'כתפיים פעילות', 'נשימה רגועה'], safety: 'בדוק שהמגבות חזקות ולא מחליקות' },

  // ===== שכמות וכתף אחורית =====
  { id: 'ex-scapular-push-up', name: 'Scapular Push-up', fam: [['scapula', 1]], pm: ['upperBack'], sm: ['chest', 'core'],
    cues: ['עמידת שכיבת סמיכה, ידיים ישרות', 'השכמות מתקרבות ואז נפתחות', 'תנועה רק בשכמות'], safety: 'מרפקים ישרים כל הזמן' },
  { id: 'ex-prone-ytw', name: 'Prone Y-T-W', fam: [['scapula', 2]], pm: ['upperBack'], sm: ['lowerBack'],
    cues: ['שכיבה על הבטן, מצח על מגבת', 'מרימים ידיים בצורת Y, אחר כך T, אחר כך W', 'אגודלים למעלה, עצירה בכל אות'], safety: 'צוואר ארוך, לא מרימים את הראש' },
  { id: 'ex-db-reverse-fly', name: 'Dumbbell Reverse Fly', fam: [['scapula', 3]], measure: 'repsLoad', eq: [DB], pm: ['upperBack'], sm: ['shoulders'],
    cues: ['רכון קדימה, גב ישר', 'פותחים ידיים לצדדים עם מרפק רך', 'עצירה למעלה, שכמות נסגרות'], safety: 'משקל קל, בלי תנופה' },

  // ===== יציבה וצוואר (בלי סטטוס) =====
  { id: 'ex-chin-tuck', name: 'Chin Tuck', fam: [['posture', 1]], pm: ['neck'], range: [10, 15], tempo: "החזקה 3 שנ'",
    cues: ['מושכים את הסנטר אחורה (סנטר כפול)', 'מבט קדימה, לא למטה', 'החזקה של 3 שניות'], safety: 'תנועה עדינה' },
  { id: 'ex-wall-angel', name: 'Wall Angel', fam: [['posture', 2]], pm: ['upperBack'], sm: ['shoulders'], range: [8, 12],
    cues: ['גב, ראש וידיים צמודים לקיר', 'מחליקים ידיים למעלה ולמטה', 'צלעות פנימה'], safety: 'רק בטווח שבו הידיים נשארות על הקיר' },
  { id: 'ex-neck-isometrics', name: 'Neck Isometrics', fam: [['posture', 3]], measure: 'time', pm: ['neck'], range: [10, 15],
    cues: ['יד דוחפת את הראש, הצוואר מתנגד', 'קדימה, אחורה, לשני הצדדים', 'עוצמה בינונית, בלי תנועה'], safety: 'לא לדחוף חזק. בלי כאב' },
  { id: 'ex-thoracic-extension', name: 'Thoracic Extension', fam: [['posture', 4]], pm: ['upperBack'], range: [8, 12],
    cues: ['על מגבת מגולגלת או קצה כיסא', 'ידיים מאחורי הראש', 'פותחים את החזה אחורה'], safety: 'לא לקמר את הגב התחתון' },

  // ===== לסת ופנים =====
  { id: 'ex-mewing', name: 'Mewing', fam: [['jaw', 1]], measure: 'time', pm: ['neck'], range: [120, 180], tempo: 'החזקה',
    cues: ['כל הלשון צמודה לחך העליון', 'שפתיים סגורות, שיניים נוגעות קלות', 'נשימה מהאף'], safety: 'לא ללחוץ שיניים' },

  // ===== מוביליטי =====
  { id: 'ex-cat-cow', name: 'Cat-Cow', fam: [['mobility', 1]], pm: ['lowerBack'], sm: ['upperBack'], range: [8, 12],
    cues: ['עמידת שש', 'מקמרים ומעגלים את הגב לאט', 'נשימה עם התנועה'], safety: 'טווח נוח' },
  { id: 'ex-worlds-greatest-stretch', name: "World's Greatest Stretch", fam: [['mobility', 2]], uni: true, pm: ['glutes'], sm: ['upperBack', 'hamstrings'], range: [4, 6],
    cues: ["לאנג' עמוק, יד על הרצפה", 'מרפק לכיוון הרצפה, ואז סיבוב עם יד לתקרה', 'מחליפים צד'], safety: 'ברך אחורית על משהו רך' },
  { id: 'ex-90-90-hip-switch', name: '90/90 Hip Switch', fam: [['mobility', 3]], pm: ['glutes'], sm: ['adductors'], range: [8, 12],
    cues: ['ישיבה עם שתי ברכיים ב-90°', 'מעבירים את הברכיים לצד השני', 'גו זקוף'], safety: 'ידיים מאחור לעזרה בהתחלה' },
  { id: 'ex-deep-squat-hold', name: 'Deep Squat Hold', fam: [['mobility', 4]], measure: 'time', pm: ['glutes'], sm: ['calves', 'adductors'], range: [30, 60],
    cues: ['סקוואט עמוק, עקבים על הרצפה', 'מרפקים דוחפים ברכיים החוצה', 'גו זקוף'], safety: 'אפשר לאחוז במשהו לשיווי משקל' },
  { id: 'ex-thread-the-needle', name: 'Thread the Needle', fam: [['mobility', 5]], uni: true, pm: ['upperBack'], sm: ['shoulders'], range: [6, 10],
    cues: ['עמידת שש', 'יד אחת עוברת מתחת לגוף', 'חוזרת ונפתחת לתקרה'], safety: 'תנועה איטית' },
  { id: 'ex-shoulder-dislocates', name: 'Shoulder Dislocates', fam: [['mobility', 6]], pm: ['shoulders'], sm: ['upperBack'], range: [10, 15],
    cues: ['מגבת או גומייה באחיזה רחבה', 'מעבירים מעל הראש לאחור וחזרה', 'ידיים ישרות'], safety: 'אחיזה רחבה מספיק כדי שלא יכאב' }
];

// ===== ברירות מחדל לפי נספח ג' =====
function defaultRange(fam: FamilyId, measure: MeasureType): [number, number] {
  const role = FAMILY_META[fam].role;
  if (measure === 'time') return role === 'core' ? [30, 60] : [20, 45];
  if (fam === 'singleLeg') return [8, 12];
  if (role === 'main') return [6, 12];
  return [10, 15];
}

export function buildSeedExercises(): SeedExercise[] {
  return DEFS.map((d) => {
    const fam0 = d.fam[0][0];
    const meta = FAMILY_META[fam0];
    const measure = d.measure ?? 'reps';
    const [min, max] = d.range ?? defaultRange(fam0, measure);
    const tempo = d.tempo ?? (measure === 'time' ? 'החזקה' : '3-1-1-0');
    // זמן לסט: בהחזקה = הקצה העליון. בחזרות = ממוצע הטווח × 5 שניות (קצב 3-1-1-0)
    const secondsPerSet = measure === 'time' ? max : Math.round(((min + max) / 2) * 5);
    return {
      id: d.id,
      name: d.name,
      families: d.fam.map(([family, level]) => ({ family, level })),
      familyIds: d.fam.map(([f]) => f),
      status: meta.kind === 'strength' ? 'red' : null,
      category: meta.category,
      primaryMuscles: d.pm,
      secondaryMuscles: d.sm ?? [],
      equipment: d.eq ?? [],
      locations: d.loc ?? ['home', 'outdoor'],
      measure,
      unilateral: !!d.uni,
      targetMin: min,
      targetMax: max,
      secondsPerSet,
      restSec: REST_BY_ROLE[meta.role],
      tempo,
      cues: d.cues,
      safety: d.safety,
      custom: false
    };
  });
}

// ===== מתיחות סטטיות (R-DAY-4, נספח ג'). נוספות גם למאגר קיים =====
const STRETCH_DEFS: Def[] = [
  { id: 'ex-doorway-chest-stretch', name: 'Doorway Chest Stretch', fam: [['stretch', 1]], measure: 'time', uni: true, pm: ['chest'], sm: ['shoulders'], range: [30, 45], cues: ['אמה על משקוף, מרפק בגובה הכתף', 'צעד קדימה עד מתיחה בחזה', 'נשימה איטית'], safety: 'בלי כאב בכתף' },
  { id: 'ex-lat-stretch', name: 'Lat Stretch', fam: [['stretch', 2]], measure: 'time', uni: true, pm: ['back'], range: [30, 45], cues: ['אחיזה במוט או במשקוף', 'אגן אחורה והצידה', 'מרגישים מתיחה בצד הגב'], safety: 'תנועה רכה' },
  { id: 'ex-cross-body-shoulder', name: 'Cross-body Shoulder Stretch', fam: [['stretch', 3]], measure: 'time', uni: true, pm: ['shoulders'], sm: ['upperBack'], range: [30, 45], cues: ['יד ישרה על פני החזה', 'היד השנייה מקרבת מעל המרפק', 'כתף למטה'], safety: 'לא ללחוץ על המרפק' },
  { id: 'ex-overhead-triceps', name: 'Overhead Triceps Stretch', fam: [['stretch', 4]], measure: 'time', uni: true, pm: ['triceps'], range: [30, 45], cues: ['יד מאחורי הראש, מרפק למעלה', 'היד השנייה דוחפת את המרפק בעדינות', 'צלעות פנימה'], safety: 'בלי לקמר את הגב' },
  { id: 'ex-biceps-wall', name: 'Biceps Wall Stretch', fam: [['stretch', 5]], measure: 'time', uni: true, pm: ['biceps'], sm: ['chest'], range: [30, 45], cues: ['כף יד על הקיר מאחור, יד ישרה', 'מסובבים את הגוף החוצה', 'מתיחה לאורך היד'], safety: 'עדין, בלי כאב במרפק' },
  { id: 'ex-wrist-flexor', name: 'Wrist Flexor Stretch', fam: [['stretch', 6]], measure: 'time', uni: true, pm: ['forearms'], range: [30, 45], cues: ['יד ישרה קדימה, אצבעות למטה', 'היד השנייה מושכת את האצבעות אליך', 'ואז אצבעות למעלה'], safety: 'לחץ קל' },
  { id: 'ex-standing-quad', name: 'Standing Quad Stretch', fam: [['stretch', 7]], measure: 'time', uni: true, pm: ['quads'], range: [30, 45], cues: ['אוחזים בקרסול מאחור', 'ברכיים צמודות, אגן קדימה', 'יד על קיר לשיווי משקל'], safety: 'בלי למשוך את הברך הצידה' },
  { id: 'ex-seated-hamstring', name: 'Seated Hamstring Stretch', fam: [['stretch', 8]], measure: 'time', uni: true, pm: ['hamstrings'], sm: ['lowerBack'], range: [30, 45], cues: ['ישיבה, רגל אחת ישרה', 'גב ישר, נטייה מהאגן', 'לא לעגל את הגב'], safety: 'מתיחה, לא כאב' },
  { id: 'ex-pigeon-stretch', name: 'Pigeon Stretch', fam: [['stretch', 9]], measure: 'time', uni: true, pm: ['glutes'], sm: ['adductors'], range: [45, 60], cues: ['שוק קדמית לרוחב, רגל אחורית ישרה', 'אגן ישר', 'נושמים ומשחררים'], safety: 'אם הברך מציקה, קרב את העקב לאגן' },
  { id: 'ex-wall-calf', name: 'Wall Calf Stretch', fam: [['stretch', 10]], measure: 'time', uni: true, pm: ['calves'], range: [30, 45], cues: ['ידיים על קיר, רגל אחורית ישרה', 'עקב על הרצפה', 'ואז ברך מעט כפופה'], safety: 'עקב לא מתרומם' },
  { id: 'ex-butterfly', name: 'Butterfly Stretch', fam: [['stretch', 11]], measure: 'time', pm: ['adductors'], range: [30, 60], cues: ['כפות רגליים צמודות', 'גב ישר', 'ברכיים יורדות לבד'], safety: 'בלי ללחוץ על הברכיים' },
  { id: 'ex-childs-pose', name: "Child's Pose", fam: [['stretch', 12]], measure: 'time', pm: ['lowerBack'], sm: ['back', 'shoulders'], range: [45, 60], cues: ['ברכיים פתוחות, ישבן לעקבים', 'ידיים ארוכות קדימה', 'נשימה לתוך הגב'], safety: 'כרית מתחת לברכיים אם צריך' }
];
DEFS.push(...STRETCH_DEFS);
