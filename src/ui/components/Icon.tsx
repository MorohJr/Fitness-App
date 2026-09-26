// אייקונים בקו דק (SPEC 3.7)
const PATHS: Record<string, preact.JSX.Element> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>),
  today: (<><rect x="4" y="4" width="16" height="17" rx="3" /><path d="M8 2v4M16 2v4M8 11h8M8 15h5" /></>),
  workout: <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />,
  nutrition: (<><path d="M12 7c-3-3-8-1-8 4 0 5 4 10 6 10 1 0 1.3-.6 2-.6s1 .6 2 .6c2 0 6-5 6-10 0-5-5-7-8-4z" /><path d="M12 7c0-2 1-4 3-4" /></>),
  body: (<><path d="M3 17l5-5 4 3 8-8" /><path d="M15 7h5v5" /></>),
  settings: (<><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" /></>),
  gear: (<><path d="M4 9h16v6H4z" /><path d="M8 9V6M16 9V6M8 15v3M16 15v3" /></>),
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  phases: (<><path d="M3 20h18" /><path d="M5 20V12M10 20V8M15 20v-6M20 20V5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
  backup: (<><path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>),
  back: <path d="M9 6l6 6-6 6" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  steps: <path d="M7 14c-1.5 0-3-1.5-3-4s1-5 3-5 3 2.5 3 5-1.5 4-3 4zM6 18h3M17 19c1.5 0 3-1.5 3-4s-1-5-3-5-3 2.5-3 5 1.5 4 3 4z" />
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, label }: { name: IconName; label?: string }) {
  return (
    <svg class="ico" viewBox="0 0 24 24" aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      {PATHS[name]}
    </svg>
  );
}
