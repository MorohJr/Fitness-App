// הדמות (R-RANK-4): איור SVG שמצויר באפליקציה. מבנה הגוף לפי ציון הגוף, השרירים לפי ציון הכוח
const SKIN = '#f3c29b';
const SKIN_SHADE = '#e3a57d';
const INK = '#1a1a1a';

/** body: 1 עגלגל ← 5 חטוב (null = לא ידוע). strength: 1–5 */
export function Avatar({ body, strength, size = 120, label }: { body: number | null; strength: number; size?: number; label?: string }) {
  const f = body === null ? 0.5 : (5 - body) / 4; // שומן: 1 = הכי עגלגל
  const m = (strength - 1) / 4; // שריר
  const cx = 60;
  const r = (n: number) => Math.round(n * 10) / 10;

  // גו: כתפיים, בטן ומותניים
  const sw = r(19 + 9 * m + 4 * f); // חצי רוחב כתפיים
  const ww = r(13 + 11 * f); // חצי רוחב מותניים
  const bw = r(Math.max(ww + 1, 15 + 23 * f)); // חצי רוחב בטן
  const torso = `M${cx - sw} 56 C${cx - sw - 2} 68 ${cx - bw} 72 ${cx - bw} 86 C${cx - bw} 98 ${cx - ww - 1} 104 ${cx - ww} 108 L${cx + ww} 108 C${cx + ww + 1} 104 ${cx + bw} 98 ${cx + bw} 86 C${cx + bw} 72 ${cx + sw + 2} 68 ${cx + sw} 56 Q${cx} 49 ${cx - sw} 56 Z`;

  // ידיים ורגליים
  const arm = r(7 + 5 * m + 3 * f);
  // כף היד מחוץ לבטן, כדי שהידיים ייראו גם בדמות עגלגלה
  const armL = r(cx - Math.max(sw + 6, bw + arm / 2 + 3));
  const armR = r(cx + Math.max(sw + 6, bw + arm / 2 + 3));
  const leg = r(11 + 7 * f + 3 * m);
  const legGap = r(2 + 3 * f);
  const headR = r(17 + 2 * f);
  const cheek = r(2.5 + 3 * f);

  return (
    <svg viewBox="0 0 120 160" width={size} height={size * (160 / 120)} role="img" aria-label={label ?? 'הדמות'} style={{ display: 'block', opacity: body === null ? 0.55 : 1 }}>
      {/* צל */}
      <ellipse cx={cx} cy={154} rx={r(22 + 10 * f)} ry={3.5} fill="currentColor" opacity={0.12} />
      {/* רגליים ומכנסיים */}
      <rect x={r(cx - legGap / 2 - leg)} y={104} width={leg} height={44} rx={leg / 2} fill={SKIN} stroke={INK} stroke-width={2} />
      <rect x={r(cx + legGap / 2)} y={104} width={leg} height={44} rx={leg / 2} fill={SKIN} stroke={INK} stroke-width={2} />
      <path d={`M${r(cx - ww - 3)} 104 L${r(cx + ww + 3)} 104 L${r(cx + ww + 4)} 124 L${cx + 2} 124 L${cx} 116 L${cx - 2} 124 L${r(cx - ww - 4)} 124 Z`} fill="#2b2b2b" stroke={INK} stroke-width={2} stroke-linejoin="round" />
      {/* נעליים */}
      <ellipse cx={r(cx - legGap / 2 - leg / 2)} cy={149} rx={r(leg / 2 + 3)} ry={4} fill={INK} />
      <ellipse cx={r(cx + legGap / 2 + leg / 2)} cy={149} rx={r(leg / 2 + 3)} ry={4} fill={INK} />
      {/* גו בחולצה בצבע ההדגשה */}
      <path d={torso} fill="var(--accent)" stroke={INK} stroke-width={2} stroke-linejoin="round" />
      {/* בטן עגולה בדמות עגלגלה */}
      {f >= 0.4 && <ellipse cx={cx} cy={r(90 - 2 * f)} rx={r(bw - 1)} ry={r(12 + 9 * f)} fill="var(--accent)" stroke={INK} stroke-width={2} />}
      {/* קוביות בבטן: שומן נמוך ושריר */}
      {f < 0.3 && m >= 0.4 && (
        <g stroke={INK} stroke-width={1.2} opacity={0.45} stroke-linecap="round">
          <line x1={cx} y1={76} x2={cx} y2={102} />
          <line x1={cx - 7} y1={83} x2={cx + 7} y2={83} />
          <line x1={cx - 7} y1={91} x2={cx + 7} y2={91} />
        </g>
      )}
      {/* טבור בבטן עגולה */}
      {f >= 0.5 && <ellipse cx={cx} cy={90} rx={1.6} ry={2.2} fill={INK} opacity={0.5} />}
      {/* ידיים */}
      <line x1={cx - sw + 2} y1={60} x2={armL} y2={100} stroke={INK} stroke-width={arm + 4} stroke-linecap="round" />
      <line x1={cx - sw + 2} y1={60} x2={armL} y2={100} stroke={SKIN} stroke-width={arm} stroke-linecap="round" />
      <line x1={cx + sw - 2} y1={60} x2={armR} y2={100} stroke={INK} stroke-width={arm + 4} stroke-linecap="round" />
      <line x1={cx + sw - 2} y1={60} x2={armR} y2={100} stroke={SKIN} stroke-width={arm} stroke-linecap="round" />
      {m >= 0.5 && (
        <>
          <ellipse cx={r(cx - sw + 2 + (armL - (cx - sw + 2)) * 0.33)} cy={73} rx={r(arm / 2 + 2 * m)} ry={r(4 + 2 * m)} fill={SKIN} stroke={INK} stroke-width={1.5} />
          <ellipse cx={r(cx + sw - 2 + (armR - (cx + sw - 2)) * 0.33)} cy={73} rx={r(arm / 2 + 2 * m)} ry={r(4 + 2 * m)} fill={SKIN} stroke={INK} stroke-width={1.5} />
        </>
      )}
      {/* ראש */}
      <circle cx={cx} cy={32} r={headR} fill={SKIN} stroke={INK} stroke-width={2} />
      <path d={`M${r(cx - headR + 2)} 26 Q${cx} ${r(8 - f)} ${r(cx + headR - 2)} 26 Q${cx} 18 ${r(cx - headR + 2)} 26 Z`} fill="#3a2a20" />
      {/* סרט זיעה לשרירי */}
      {m >= 0.75 && <rect x={r(cx - headR + 1)} y={20} width={r(2 * headR - 2)} height={5} rx={2} fill="var(--accent)" stroke={INK} stroke-width={1.2} />}
      {/* פנים */}
      <circle cx={cx - 6} cy={33} r={2} fill={INK} />
      <circle cx={cx + 6} cy={33} r={2} fill={INK} />
      <circle cx={cx - 11} cy={39} r={cheek} fill="#ff8a8a" opacity={0.45} />
      <circle cx={cx + 11} cy={39} r={cheek} fill="#ff8a8a" opacity={0.45} />
      <path d={`M${cx - 5} 40 Q${cx} ${r(44 + 1.5 * m)} ${cx + 5} 40`} fill="none" stroke={INK} stroke-width={1.8} stroke-linecap="round" />
      {/* סנטר כפול קטן כשעגלגל */}
      {f >= 0.75 && <path d={`M${cx - 8} ${r(32 + headR - 1)} Q${cx} ${r(35 + headR)} ${cx + 8} ${r(32 + headR - 1)}`} fill="none" stroke={SKIN_SHADE} stroke-width={1.5} />}
    </svg>
  );
}
