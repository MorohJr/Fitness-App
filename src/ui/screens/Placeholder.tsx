export function Placeholder({ title, stage }: { title: string; stage: number }) {
  return (
    <div>
      <h1>{title}</h1>
      <div class="card">
        <p>המסך הזה נבנה בשלב {stage}.</p>
        <p class="muted small">בינתיים אפשר להגדיר פרופיל, יעדים, שלבים ותוכנית שבועית בלשונית ההגדרות.</p>
      </div>
    </div>
  );
}
