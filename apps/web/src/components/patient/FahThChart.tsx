"use client";

import type { Assessment } from "@/lib/api";

export function FahThChart({ assessments, lang }: { assessments: Assessment[]; lang: string }) {
  const th = lang === "th";
  const data = assessments
    .filter(a => a.status === "completed" && a.finalAdultHeightCm)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-5);

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgb(var(--accent)/0.1)" }}>
        <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="font-body text-sm text-muted">
        {th ? "ยังไม่มีข้อมูล FAH / TH" : "No FAH / TH data yet"}
      </p>
    </div>
  );

  const W = 480; const H = 180; const PX = 44; const PY = 20; const PR = 48;
  const iW = W - PX - PR; const iH = H - PY - 22;

  const fahVals = data.map(a => Number(a.finalAdultHeightCm));
  const thVals  = data.filter(a => a.targetHeightCm).map(a => Number(a.targetHeightCm));
  const allVals = [...fahVals, ...thVals];
  const padding = (Math.max(...allVals) - Math.min(...allVals)) * 0.2 || 4;
  const minV = Math.floor(Math.min(...allVals) - padding);
  const maxV = Math.ceil(Math.max(...allVals) + padding);

  const dates = data.map(a => new Date(a.createdAt).getTime());
  const minD = Math.min(...dates); const maxD = Math.max(...dates);

  const px = (d: number) => maxD === minD ? PX + iW / 2 : PX + ((d - minD) / (maxD - minD)) * iW;
  const py = (v: number) => maxV === minV ? PY + iH / 2 : PY + iH - ((v - minV) / (maxV - minV)) * iH;

  const fahPts = data.map(a => ({ x: px(new Date(a.createdAt).getTime()), y: py(Number(a.finalAdultHeightCm)), v: Number(a.finalAdultHeightCm), d: a.createdAt }));
  const thPts  = data.filter(a => a.targetHeightCm).map(a => ({ x: px(new Date(a.createdAt).getTime()), y: py(Number(a.targetHeightCm)), v: Number(a.targetHeightCm) }));
  const thConst = thPts.length > 0 ? thPts[0].v : null;

  const fahPath = fahPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const thPath  = thPts.length > 1 ? thPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") : null;

  const lastFah = fahPts[fahPts.length - 1];

  // ── Label collision: เช็คกล่องข้อความสองป้ายจริง ๆ ไม่ใช่แค่จับมุมคนละฝั่ง ──
  // (ป้ายใช้ font 12px — ประมาณความกว้างคงที่พอสำหรับกันชน เพราะ SSR วัด SVG จริงไม่ได้)
  const TH_LABEL_W = 86, FAH_LABEL_W = 100, LABEL_H = 14;
  const fahLabelY = Math.max(PY + 8, lastFah.y - 10);
  let thLabelY = thPts.length > 0 ? Math.max(PY + 8, thPts[0].y - 6) : 0;
  if (thPts.length > 0) {
    const thBoxRight = PX + 4 + TH_LABEL_W;            // TH ป้ายชิดซ้าย ยื่นไปขวา
    const fahBoxLeft = lastFah.x - 6 - FAH_LABEL_W;    // FAH anchored end ยื่นมาซ้าย
    const xOverlap = fahBoxLeft < thBoxRight;
    if (xOverlap && Math.abs(fahLabelY - thLabelY) < LABEL_H) {
      // ชนกัน (FAH ≈ TH และจุดล่าสุดอยู่ใกล้ฝั่งซ้าย) — ย้าย TH ลงใต้เส้นแทน
      thLabelY = Math.min(PY + iH - 4, thPts[0].y + 14);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 rounded-full" style={{ background: "rgb(var(--accent))" }} />
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "rgb(var(--accent))" }} />
          <span className="font-body text-xs font-semibold" style={{ color: "rgb(var(--accent))" }}>
            FAH — {th ? "ส่วนสูงที่คาดการณ์ (ผู้ใหญ่)" : "Final Adult Height"}
          </span>
        </div>
        {thConst && (
          <div className="flex items-center gap-1.5">
            <svg width="24" height="4"><line x1="0" y1="2" x2="24" y2="2" stroke="rgb(var(--warning))" strokeWidth="2" strokeDasharray="4 2"/></svg>
            <span className="font-body text-xs font-semibold" style={{ color: "rgb(var(--warning))" }}>
              TH — {th ? "ส่วนสูงเป้าหมาย" : "Target Height"} ({thConst} cm)
            </span>
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
          <defs>
            <linearGradient id="fahgrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = PY + f * iH;
            const val = Math.round(maxV - f * (maxV - minV));
            return (
              <g key={f}>
                <line x1={PX} y1={y} x2={PX + iW} y2={y} stroke="rgb(var(--border))" strokeWidth="0.8" strokeDasharray="4 4" />
                <text x={PX - 5} y={y + 4} textAnchor="end" fontSize="11" fill="rgb(var(--muted))">{val}</text>
              </g>
            );
          })}

          {fahPts.length > 1 && (
            <path d={`${fahPath} L ${lastFah.x} ${PY + iH} L ${fahPts[0].x} ${PY + iH} Z`} fill="url(#fahgrad2)" />
          )}

          {thPath && <path d={thPath} fill="none" stroke="rgb(var(--warning))" strokeWidth="2.2" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" />}
          {thPts.length === 1 && (
            <line x1={PX} y1={thPts[0].y} x2={PX + iW} y2={thPts[0].y}
              stroke="rgb(var(--warning))" strokeWidth="2" strokeDasharray="6 3" />
          )}

          <path d={fahPath} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {fahPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="rgb(var(--accent))" stroke="rgb(var(--surface))" strokeWidth="2" />
          ))}
          {thPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="rgb(var(--warning))" stroke="rgb(var(--surface))" strokeWidth="2" />
          ))}

          {/* TH label: ชิดซ้ายบนเส้นอ้างอิง — ถ้ากล่องชนกับป้าย FAH (เช็คด้านบน) จะย้ายลงใต้เส้น */}
          {thConst && (
            <text x={PX + 4} y={thLabelY} textAnchor="start" fontSize="12" fontWeight="700" fill="rgb(var(--warning))">
              TH {thConst} cm
            </text>
          )}

          {/* FAH label: always at the most recent point (the clinically relevant value),
              anchored "end" with a left-hand offset so it never clips past the right edge. */}
          {lastFah && (
            <text x={lastFah.x - 6} y={fahLabelY} textAnchor="end" fontSize="12" fontWeight="700" fill="rgb(var(--accent))">
              FAH {lastFah.v} cm
            </text>
          )}

          {fahPts.map((p, i) => (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="10.5" fill="rgb(var(--muted))">
              {new Date(p.d).toLocaleDateString(th ? "th-TH" : "en-US", { month: "short", year: "2-digit" })}
            </text>
          ))}

          {/* หน่วยแกนตั้ง — ใช้ "cm" (สัญลักษณ์ SI ไม่มีพหูพจน์/ไม่แปล) ให้ตรงกับส่วนอื่นของแอป */}
          <text x={10} y={PY + iH / 2} textAnchor="middle" fontSize="10" fill="rgb(var(--muted))" transform={`rotate(-90, 10, ${PY + iH / 2})`}>
            cm
          </text>
        </svg>
      </div>
    </div>
  );
}
