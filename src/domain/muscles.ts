// קבוצות שרירים. המסומנות major נספרות ליעד הנפח השבועי (R-GEN-3)
export const MUSCLES = {
  chest: { name: 'חזה', major: true },
  back: { name: 'גב', major: true },
  shoulders: { name: 'כתפיים', major: true },
  upperBack: { name: 'גב עליון וכתף אחורית', major: false },
  biceps: { name: 'בייספס', major: false },
  triceps: { name: 'טרייספס', major: false },
  forearms: { name: 'אמות', major: false },
  core: { name: 'בטן', major: false },
  obliques: { name: 'אלכסונים', major: false },
  lowerBack: { name: 'גב תחתון', major: false },
  quads: { name: 'ירך קדמית', major: true },
  hamstrings: { name: 'ירך אחורית', major: true },
  glutes: { name: 'ישבן', major: true },
  adductors: { name: 'מקרבים', major: false },
  calves: { name: 'שוקיים', major: false },
  neck: { name: 'צוואר', major: false }
} as const;

export type MuscleId = keyof typeof MUSCLES;
export const MUSCLE_IDS = Object.keys(MUSCLES) as MuscleId[];
