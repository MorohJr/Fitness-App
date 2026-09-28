// לשוניות משנה בתזונה
const TABS = [
  { to: '/nutrition', label: 'יומן' },
  { to: '/nutrition/pantry', label: 'מזווה' },
  { to: '/nutrition/meals', label: 'ארוחות' },
  { to: '/nutrition/shopping', label: 'קניות' },
  { to: '/nutrition/supplements', label: 'תוספים' }
];

export function NutritionTabs({ active }: { active: string }) {
  return (
    <nav class="tabs" aria-label="תזונה">
      {TABS.map((t) => (
        <a key={t.to} href={`#${t.to}`} aria-current={t.to === active ? 'page' : undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
