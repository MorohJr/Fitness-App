// הוראות קיצור הדרך של Apple Health (נספח א')
import { BackLink } from '../../components/Fields';

export function HealthShortcutScreen() {
  return (
    <div>
      <BackLink />
      <h1>קיצור דרך ל-Health</h1>
      <p class="small muted">
        קיצור הדרך קורא צעדים ושינה מאפליקציית Health, ומעתיק אותם ללוח בפורמט שהאפליקציה מבינה. אחר כך לוחצים כאן "הדבק מ-Health". בלי Apple Watch, האייפון סופר צעדים לבד. שינה קיימת רק אם הגדרת באייפון לוח זמני שינה (Health ← שינה).
      </p>
      <div class="card">
        <h2>בנייה (פעם אחת, כ-5 דקות)</h2>
        <ol class="cues">
          <li>פתח את אפליקציית <b>קיצורים</b> (Shortcuts), לחץ <b>+</b> וקרא לקיצור <b>FITAPP</b>.</li>
          <li>הוסף פעולה <b>מצא דגימות בריאות</b> (Find Health Samples): סוג <b>צעדים</b>, תאריך התחלה <b>היום</b>.</li>
          <li>הוסף <b>חשב סטטיסטיקה</b> (Calculate Statistics): <b>סכום</b> (Sum) של הדגימות. קרא לתוצאה "צעדים".</li>
          <li>הוסף שוב <b>מצא דגימות בריאות</b>: סוג <b>ניתוח שינה</b> (Sleep Analysis), ערך <b>ישן</b> (Asleep), תאריך התחלה <b>ב-1 הימים האחרונים</b>.</li>
          <li>הוסף <b>קבל פרטים של דגימות בריאות</b> (Get Details): <b>משך</b> (Duration), ואז <b>חשב סטטיסטיקה ← סכום</b>.</li>
          <li>הוסף <b>חישוב</b> (Calculate): התוצאה חלקי 3600 (משך הוא בשניות), ו<b>עגל מספר</b> לספרה אחת אחרי הנקודה. קרא לתוצאה "שינה".</li>
          <li>הוסף <b>תאריך נוכחי</b> ואז <b>עצב תאריך</b> (Format Date) בפורמט מותאם: <span class="en">yyyy-MM-dd</span>.</li>
          <li>הוסף <b>טקסט</b> עם התוכן הזה (המשתנים נבחרים מהרשימה):</li>
        </ol>
        <pre class="card en" style={{ background: 'var(--surface-2)', whiteSpace: 'pre-wrap', fontSize: '.85rem' }}>FITAPP;date=[תאריך מעוצב];steps=[צעדים];sleep=[שינה]</pre>
        <ol class="cues" start={9}>
          <li>הוסף <b>העתק ללוח</b> (Copy to Clipboard).</li>
          <li>שמור. אפשר להוסיף את הקיצור למסך הבית או לווידג'ט.</li>
        </ol>
      </div>
      <div class="card">
        <h2>שימוש כל בוקר</h2>
        <ol class="cues">
          <li>הרץ את הקיצור FITAPP.</li>
          <li>פתח את האפליקציה, לשונית <b>היום</b>, ולחץ <b>הדבק מ-Health</b>. באייפון יופיע אישור "הדבק".</li>
          <li>אם התאריך לא של היום, או שהפורמט שגוי, תופיע הודעה ולא יישמר כלום.</li>
        </ol>
        <p class="small muted">בלי לוח זמני שינה, הקיצור יעביר רק צעדים, ואת השינה מזינים ידנית.</p>
      </div>
    </div>
  );
}
