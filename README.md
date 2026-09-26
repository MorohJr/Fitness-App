# אפליקציית כושר אישית (PWA)

מקור האמת: [`SPEC.md`](SPEC.md). כל שינוי מתעדכן שם קודם.

## פקודות

```bash
npm install     # פעם אחת, מתקין את החבילות
npm test        # כל הבדיקות האוטומטיות
npm run dev     # הרצה מקומית לפיתוח
npm run build   # בנייה לתיקיית dist
```

## פרסום

כל `push` לענף `main` מריץ את הבדיקות, בונה ומפרסם ל-GitHub Pages (`.github/workflows/deploy.yml`).
הכתובת: `https://<שם-משתמש>.github.io/<שם-המאגר>/`

## מבנה

לפי SPEC 3.2: `src/domain` (לוגיקה וכללים), `src/data` (מסד נתונים וגיבוי), `src/ui` (מסכים), `tests` (בדיקות).
