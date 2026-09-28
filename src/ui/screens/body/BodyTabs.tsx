const TABS = [
  { to: '/body', label: 'מדידות' },
  { to: '/body/photos', label: 'תמונות' },
  { to: '/body/records', label: 'שיאים ואבני דרך' },
  { to: '/body/injuries', label: 'פציעות' }
];

export function BodyTabs({ active }: { active: string }) {
  return (
    <nav class="tabs" aria-label="גוף ושיאים">
      {TABS.map((t) => (
        <a key={t.to} href={`#${t.to}`} aria-current={t.to === active ? 'page' : undefined}>{t.label}</a>
      ))}
    </nav>
  );
}
