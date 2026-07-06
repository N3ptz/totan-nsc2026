"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { childrenApi, assessmentsApi, authApi, type Child, type Assessment } from "@/lib/api";
import { fmtYearsMonths, targetHeightCm } from "@/components/patient/utils";

// ── Helpers ───────────────────────────────────────────────
function calcAgeAtDate(dob: string, date: string) {
  const b = new Date(dob), d = new Date(date);
  const totalMonths =
    (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, totalMonths };
}

function fmtTh(d: string) {
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── Risk info ─────────────────────────────────────────────
const RISK: Record<string, { th: string; en: string; thDesc: string; enDesc: string; col: string; bg: string }> = {
  normal: {
    th: "ปกติ", en: "Normal",
    thDesc: "อายุกระดูกอยู่ในเกณฑ์ปกติ สอดคล้องกับอายุตามปฏิทิน พัฒนาการเจริญเติบโตเป็นไปตามมาตรฐาน",
    enDesc: "Bone age is within normal limits, consistent with chronological age.",
    col: "#166534", bg: "#f0fdf4",
  },
  short_stature: {
    th: "เตี้ยกว่าเกณฑ์", en: "Short Stature",
    thDesc: "ส่วนสูงต่ำกว่าเกณฑ์มาตรฐาน แนะนำให้ติดตามการเจริญเติบโตอย่างใกล้ชิด และพิจารณาการตรวจเพิ่มเติม",
    enDesc: "Height below standard. Recommend close monitoring and further evaluation.",
    col: "#92400e", bg: "#fffbeb",
  },
  tall_stature: {
    th: "สูงกว่าเกณฑ์", en: "Tall Stature",
    thDesc: "ส่วนสูงสูงกว่าเกณฑ์มาตรฐาน ควรติดตามพัฒนาการต่อเนื่อง และประเมินสาเหตุที่เป็นไปได้",
    enDesc: "Height above standard. Recommend continued monitoring and assessment.",
    col: "#1e40af", bg: "#eff6ff",
  },
  advanced: {
    th: "อายุกระดูกมาก", en: "Bone Age Advanced",
    thDesc: "อายุกระดูกมากกว่าอายุตามปฏิทิน (Advanced) อาจบ่งชี้ถึงการเจริญเติบโตที่เร็วกว่าปกติ หรือสภาวะที่เกี่ยวข้องกับฮอร์โมน แนะนำปรึกษาผู้เชี่ยวชาญ",
    enDesc: "Bone age is advanced. May indicate accelerated growth or endocrine conditions. Clinical correlation recommended.",
    col: "#991b1b", bg: "#fef2f2",
  },
  delayed: {
    th: "อายุกระดูกน้อย", en: "Bone Age Delayed",
    thDesc: "อายุกระดูกน้อยกว่าอายุตามปฏิทิน (Delayed) อาจบ่งชี้ถึงพัฒนาการล่าช้า หรือสภาวะที่ต้องได้รับการตรวจสอบเพิ่มเติม",
    enDesc: "Bone age is delayed. May indicate delayed development requiring further evaluation.",
    col: "#92400e", bg: "#fffbeb",
  },
};

// ── SVG Growth Chart (print-safe) ─────────────────────────
function GrowthChartPrint({ assessments }: { assessments: Assessment[] }) {
  const done = assessments
    .filter(a => a.heightCm && a.status === "completed")
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .slice(-5); // เอา 5 ครั้งล่าสุดพอ — กราฟไม่รก

  if (done.length < 2) return (
    <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "11px" }}>
      ต้องมีผลการประเมิน 2 ครั้งขึ้นไปจึงจะแสดงกราฟได้
    </div>
  );

  const W = 360, H = 150, PX = 38, PY = 14, iW = W - PX * 2, iH = H - PY - 20;
  const hs = done.map(a => Number(a.heightCm));
  const pad = (Math.max(...hs) - Math.min(...hs)) * 0.2 || 4;
  const minH = Math.floor(Math.min(...hs) - pad), maxH = Math.ceil(Math.max(...hs) + pad);
  const ds = done.map(a => +new Date(a.createdAt));
  const minD = Math.min(...ds), maxD = Math.max(...ds);
  const px = (d: number) => maxD === minD ? PX + iW / 2 : PX + ((d - minD) / (maxD - minD)) * iW;
  const py = (h: number) => maxH === minH ? PY + iH / 2 : PY + iH - ((h - minH) / (maxH - minH)) * iH;
  const pts = done.map(a => ({ x: px(+new Date(a.createdAt)), y: py(Number(a.heightCm)), d: a.createdAt }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
      <defs>
        <linearGradient id="hg-print" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PY + f * iH;
        return (
          <g key={f}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e5e7eb" strokeWidth="0.7" strokeDasharray="3 3" />
            <text x={PX - 3} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {Math.round(maxH - f * (maxH - minH))}
            </text>
          </g>
        );
      })}
      {pts.map((p, i) => i > 0 && (
        <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="7.5" fill="#9ca3af">
          {new Date(p.d).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })}
        </text>
      ))}
      <path d={`${path} L${last.x} ${PY + iH} L${pts[0].x} ${PY + iH}Z`} fill="url(#hg-print)" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#2563eb" stroke="white" strokeWidth="1.5" />)}
    </svg>
  );
}

// ── SVG FAH vs TH Chart (print-safe) ─────────────────────
function FahThChartPrint({ assessments }: { assessments: Assessment[] }) {
  const done = assessments
    .filter(a => a.finalAdultHeightCm && a.status === "completed")
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .slice(-5); // เอา 5 ครั้งล่าสุดพอ — กราฟไม่รก

  if (done.length < 2) return (
    <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "11px" }}>
      ต้องมีผลการประเมิน 2 ครั้งขึ้นไปจึงจะแสดงกราฟได้
    </div>
  );

  const W = 360, H = 150, PX = 38, PY = 14, iW = W - PX * 2, iH = H - PY - 20;
  const fah = done.map(a => Number(a.finalAdultHeightCm));
  const th = done.filter(a => a.targetHeightCm).map(a => Number(a.targetHeightCm));
  const all = [...fah, ...th];
  const pad = (Math.max(...all) - Math.min(...all)) * 0.15 || 3;
  const minH = Math.floor(Math.min(...all) - pad), maxH = Math.ceil(Math.max(...all) + pad);
  const ds = done.map(a => +new Date(a.createdAt));
  const minD = Math.min(...ds), maxD = Math.max(...ds);
  const px = (d: number) => maxD === minD ? PX + iW / 2 : PX + ((d - minD) / (maxD - minD)) * iW;
  const py = (h: number) => maxH === minH ? PY + iH / 2 : PY + iH - ((h - minH) / (maxH - minH)) * iH;
  const fahPts = done.map(a => ({ x: px(+new Date(a.createdAt)), y: py(Number(a.finalAdultHeightCm)) }));
  const thPts = done.filter(a => a.targetHeightCm).map(a => ({ x: px(+new Date(a.createdAt)), y: py(Number(a.targetHeightCm)) }));
  const fahPath = fahPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const thPath = thPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%" }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = PY + f * iH;
        return (
          <g key={f}>
            <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e5e7eb" strokeWidth="0.7" strokeDasharray="3 3" />
            <text x={PX - 3} y={y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">
              {Math.round(maxH - f * (maxH - minH))}
            </text>
          </g>
        );
      })}
      {thPts.length >= 2 && <path d={thPath} fill="none" stroke="#d97706" strokeWidth="1.8" strokeDasharray="6 3" strokeLinecap="round" />}
      {fahPts.length >= 2 && <path d={fahPath} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />}
      {fahPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#7c3aed" stroke="white" strokeWidth="1.5" />)}
      {thPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#d97706" stroke="white" strokeWidth="1.2" />)}
    </svg>
  );
}

// ── Small sub-components ──────────────────────────────────
function Row({ label, value, hi }: { label: string; value: string; hi?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "3.5px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 10, color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: hi ? 700 : 600, color: hi ? "#1d4ed8" : "#1e293b", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Metric({ label, value, sub, hi }: { label: string; value: string; sub?: string; hi?: boolean }) {
  return (
    <div style={{
      border: `1.5px solid ${hi ? "#93c5fd" : "#e2e8f0"}`,
      borderRadius: 8, padding: "7px 9px",
      background: hi ? "#eff6ff" : "#f8fafc",
    }}>
      <div style={{ fontSize: 8.5, color: "#94a3b8", lineHeight: 1.3, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: hi ? "#1d4ed8" : "#1e293b", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function PrintReportPage() {
  const { childId, assessmentId } = useParams<{ childId: string; assessmentId: string }>();
  const viewOnly = useSearchParams().get("view") === "1"; // เปิดจากลิงก์ในเมล → ดูอย่างเดียว ไม่ auto-print
  const [child, setChild]           = useState<Child | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [allA, setAllA]             = useState<Assessment[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("token")) { window.location.href = "/login"; return; }
    (async () => {
      try {
        const [{ data: c }, { data: a }, { data: all }, { data: me }] = await Promise.all([
          childrenApi.get(childId),
          assessmentsApi.get(assessmentId),
          assessmentsApi.listByChild(childId),
          authApi.me(),
        ]);
        setChild(c); setAssessment(a); setAllA(all);
        // ชื่อแพทย์ผู้ตรวจ — ใส่เฉพาะเมื่อคนเปิดรายงานเป็นแพทย์ (ผู้ปกครองเปิดดูได้แต่ช่องลายเซ็นเว้นว่าง)
        if (me.role === "doctor") {
          setDoctorName((me as any).profile?.fullName ?? me.email ?? "");
        }
      } catch {
        setErr("ไม่สามารถโหลดข้อมูลได้");
      } finally { setLoading(false); }
    })();
  }, [childId, assessmentId]);

  // Auto-print หลังจากรูปทุกรูปโหลดเสร็จจริงๆ (กันรายงานพิมพ์ออกมารูปหาย) — timeout 6 วิ กันค้าง
  useEffect(() => {
    if (viewOnly) return; // เปิดเพื่อดูเฉยๆ (ลิงก์ในเมลผู้ปกครอง) ไม่ต้อง auto-print
    if (loading || err || !child || !assessment) return;
    let cancelled = false;

    const waitImages = async () => {
      const imgs = Array.from(document.images);
      await Promise.race([
        Promise.all(
          imgs.map(img =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>(res => {
                  img.addEventListener("load", () => res(), { once: true });
                  img.addEventListener("error", () => res(), { once: true });
                }),
          ),
        ),
        new Promise<void>(res => setTimeout(res, 6000)),
      ]);
      // เผื่อ font/layout settle อีกนิด
      setTimeout(() => { if (!cancelled) window.print(); }, 300);
    };

    waitImages();
    return () => { cancelled = true; };
  }, [loading, err, child, assessment, viewOnly]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#2563eb", borderRadius: "50%", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#6b7280", fontSize: 13 }}>กำลังโหลดรายงาน...</p>
      </div>
    </div>
  );

  if (err || !child || !assessment) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <p style={{ color: "#ef4444", fontSize: 14 }}>{err || "ไม่พบข้อมูล"}</p>
    </div>
  );

  const isM       = child.sex === "M";
  const ageAt     = calcAgeAtDate(child.dateOfBirth, assessment.createdAt);
  const boneAge   = Number(assessment.boneAgeMonths ?? 0);
  const deviation = boneAge - ageAt.totalMonths;
  const isXMock   = !assessment.xrayImageUrl  || assessment.xrayImageUrl.startsWith("mock://");
  const isHMock   = !assessment.heatmapUrl    || assessment.heatmapUrl.startsWith("mock://");
  const riskInfo  = assessment.riskFlag ? RISK[assessment.riskFlag] : null;
  const today     = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
  const reportId  = assessment.id.slice(-8).toUpperCase();

  const targetHeight = targetHeightCm(child.sex, child.fatherHeightCm, child.motherHeightCm)?.toFixed(1) ?? null;

  const S: React.CSSProperties = { fontFamily: "'Sarabun','Noto Sans Thai',system-ui,sans-serif", fontSize: 12, color: "#1a1a1a", background: "white" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#f3f4f6}
        #report{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 16mm;box-shadow:0 4px 32px rgba(0,0,0,.14)}
        .print-footer{display:none}
        @media print{
          @page{size:A4;margin:12mm 14mm 15mm}
          html,body{background:white!important}
          *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
          #report{width:100%;margin:0;padding:0;box-shadow:none}
          .np{display:none!important}

          /* ── Pagination: ห้าม section ขาดกลางหน้า ── */
          .sec{break-inside:avoid;page-break-inside:avoid}
          .sec-hd{break-after:avoid;page-break-after:avoid}     /* หัวข้อต้องอยู่กับเนื้อหา */
          svg,img{break-inside:avoid;page-break-inside:avoid}
          .keep-with-next{break-after:avoid;page-break-after:avoid}

          /* running footer ทุกหน้า (อยู่ในขอบล่างของกระดาษ ไม่ทับเนื้อหา) */
          .print-footer{
            display:flex!important;justify-content:space-between;align-items:center;gap:8px;
            position:fixed;bottom:0;left:0;right:0;
            font-size:7.5px;color:#94a3b8;
            border-top:1px solid #e5e7eb;padding-top:3px;
          }
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Running footer — โผล่เฉพาะตอนพิมพ์ ทุกหน้า */}
      <div className="print-footer">
        <span>โตทัน · รายงานประเมินอายุกระดูก · Report ID {reportId}</span>
        <span>ผู้ป่วย: {child.name} · เอกสารทางการแพทย์ (ปกปิด)</span>
      </div>

      {/* ── Screen toolbar (hidden when printing) ── */}
      <div className="np" style={{ position: "fixed", inset: "0 0 auto", zIndex: 999, background: "#0f172a", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#38bdf8,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} fill="none" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>รายงานพร้อมพิมพ์</span>
            <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 10 }}>Report ID: {reportId} · {child.name}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "8px 18px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15 }} fill="none" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            พิมพ์ / Save as PDF
          </button>
          <button
            onClick={() => {
              // เปิดด้วย noopener → บางเบราว์เซอร์ปิดเองไม่ได้ จึง fallback กลับเข้าแอป
              window.close();
              setTimeout(() => { window.location.href = `/dashboard/patients/${childId}`; }, 150);
            }}
            style={{ padding: "8px 14px", background: "#334155", color: "#cbd5e1", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
            ✕ ปิด / กลับ
          </button>
        </div>
      </div>
      <div className="np" style={{ height: 52 }} />

      {/* ═══════════════════════════════════════ REPORT ═══════ */}
      <div id="report" style={S}>

        {/* ── Header bar ── */}
        <div className="sec keep-with-next" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 11, borderBottom: "2.5px solid #1e3a5f", marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(37,99,235,.35)" }}>
              <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#1e3a5f", letterSpacing: "-0.3px" }}>โตทัน · Totan</div>
              <div style={{ fontSize: 9.5, color: "#64748b" }}>ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโต</div>
              <div style={{ fontSize: 9.5, color: "#94a3b8" }}>AI-Powered Bone Age &amp; Growth Monitoring · Greulich &amp; Pyle Standard</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 9.5, color: "#64748b", lineHeight: 1.7 }}>
            <div>Mahidol University · NSC 2026</div>
            <div>Report ID: <span style={{ fontWeight: 700, color: "#1e3a5f" }}>{reportId}</span></div>
            <div>วันที่ออกรายงาน: {today}</div>
          </div>
        </div>

        {/* ── Title ── */}
        <div className="sec keep-with-next" style={{ textAlign: "center", paddingBottom: 12, borderBottom: "1px solid #e2e8f0", marginBottom: 13 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f", letterSpacing: "-0.2px" }}>รายงานผลการประเมินอายุกระดูก</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#475569", marginTop: 2 }}>Bone Age Assessment Report</div>
          <div style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 3 }}>
            วันที่ตรวจ / Date of Examination: {fmtTh(assessment.createdAt)}
          </div>
        </div>

        {/* ── Patient info + Exam info ── */}
        <div className="sec" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {/* Patient */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>ข้อมูลผู้ป่วย · Patient Information</span>
            </div>
            <div style={{ padding: "7px 11px" }}>
              <Row label="ชื่อ-นามสกุล / Name" value={child.name} hi />
              <Row label="รหัสผู้ป่วย / Patient ID (HN)" value={child.id.slice(0, 8).toUpperCase()} />
              <Row label="วันเกิด / Date of Birth" value={fmtTh(child.dateOfBirth)} />
              <Row label="อายุขณะตรวจ / Age at Exam" value={`${ageAt.years} ปี ${ageAt.months} เดือน  (${ageAt.years}y ${ageAt.months}m)`} />
              <Row label="เพศ / Sex" value={isM ? "ชาย (Male)" : "หญิง (Female)"} />
              <Row label="เชื้อชาติ / Ethnicity" value={child.ethnicity} />
            </div>
          </div>
          {/* Exam */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>ข้อมูลการตรวจ · Examination Info</span>
            </div>
            <div style={{ padding: "7px 11px" }}>
              <Row label="แพทย์ผู้ตรวจ / Physician" value={doctorName || "—"} hi />
              <Row label="วันที่ตรวจ / Date" value={fmtTh(assessment.createdAt)} />
              {child.fatherHeightCm ? <Row label="ส่วนสูงบิดา / Father Ht." value={`${child.fatherHeightCm} cm`} /> : null}
              {child.motherHeightCm ? <Row label="ส่วนสูงมารดา / Mother Ht." value={`${child.motherHeightCm} cm`} /> : null}
              {targetHeight ? <Row label="Target Height (คำนวณ)" value={`${targetHeight} cm`} hi /> : null}
              {assessment.nextFollowupDate
                ? <Row label="นัดติดตาม / Follow-up" value={fmtTh(String(assessment.nextFollowupDate))} />
                : null}
            </div>
          </div>
        </div>

        {/* ── X-ray + Heatmap ── */}
        <div className="sec" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {/* X-ray */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>ภาพ X-ray มือ · Hand Radiograph</span>
            </div>
            <div style={{ background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 170 }}>
              {!isXMock
                ? <img src={assessment.xrayImageUrl} alt="X-ray" style={{ maxHeight: 170, maxWidth: "100%", objectFit: "contain" }} />
                : <div style={{ textAlign: "center", color: "#475569", padding: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🦴</div>
                    <div style={{ fontSize: 10 }}>ไม่มีภาพ X-ray</div>
                  </div>}
            </div>
          </div>
          {/* Heatmap */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Heatmap (Grad-CAM) · AI Focus Area</span>
              {assessment.confidence
                ? <span style={{ fontSize: 10, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: 99 }}>
                    AI {Math.round(+assessment.confidence * 100)}%
                  </span>
                : null}
            </div>
            <div style={{ background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 170, position: "relative" }}>
              {!isHMock
                ? <img src={assessment.heatmapUrl} alt="Heatmap" style={{ maxHeight: 170, maxWidth: "100%", objectFit: "contain" }} />
                : <>
                    <div style={{ position: "absolute", width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle,#ef4444 0%,#eab308 40%,#22c55e 70%,transparent 100%)", opacity: .65 }} />
                    <div style={{ position: "absolute", width: 70, height: 70, borderRadius: "50%", background: "radial-gradient(circle,white 0%,#ef4444 60%,transparent 100%)", opacity: .45 }} />
                    <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "rgba(255,255,255,.35)" }}>ภาพจำลอง (Simulated)</div>
                  </>}
            </div>
          </div>
        </div>

        {/* ── Analysis Results ── */}
        <div className="sec" style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>ผลการวิเคราะห์ · Analysis Results</span>
          </div>
          <div style={{ padding: "10px 11px" }}>
            {/* Row 1 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 7 }}>
              <Metric label="อายุกระดูก / Bone Age" value={fmtYearsMonths(boneAge, true)} sub={fmtYearsMonths(boneAge, false)} hi />
              <Metric label="อายุปฏิทิน / Chronological Age" value={`${ageAt.years} ปี ${ageAt.months} เดือน`} sub={`${ageAt.years}y ${ageAt.months}m`} />
              <Metric
                label="ส่วนเบี่ยงเบน / Deviation"
                value={`${deviation >= 0 ? "+" : ""}${Math.round(deviation)} เดือน`}
                sub={deviation >= 0 ? "มากกว่าอายุปฏิทิน" : "น้อยกว่าอายุปฏิทิน"}
              />
              <Metric label="ความมั่นใจ AI / Confidence" value={assessment.confidence ? `${Math.round(+assessment.confidence*100)}%` : "—"} />
            </div>
            {/* Row 2 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 7 }}>
              <Metric label="ส่วนสูง / Height" value={assessment.heightCm ? `${assessment.heightCm} cm` : "—"} sub={assessment.heightPercentile ? `Percentile P${Math.round(+assessment.heightPercentile)}` : undefined} />
              <Metric label="น้ำหนัก / Weight" value={assessment.weightKg ? `${assessment.weightKg} kg` : "—"} sub={assessment.weightPercentile ? `P${Math.round(+assessment.weightPercentile)}` : undefined} />
              <Metric label="BMI (kg/m²)" value={assessment.bmi ? `${assessment.bmi}` : "—"} sub={assessment.bmiPercentile ? `P${Math.round(+assessment.bmiPercentile)}` : undefined} />
              <Metric label="Height SD Score (Z)" value={assessment.heightSdScore ? `${+assessment.heightSdScore>=0?"+":""}${assessment.heightSdScore}` : "—"} />
            </div>
            {/* Row 3 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
              <Metric label="ส่วนสูงที่AIพยากรณ์ (FAH)" value={assessment.finalAdultHeightCm ? `${assessment.finalAdultHeightCm} cm` : "—"} sub="Final Adult Height" hi />
              <Metric label="ส่วนสูงเป้าหมาย (TH)" value={assessment.targetHeightCm ? `${assessment.targetHeightCm} cm` : (targetHeight ? `${targetHeight} cm` : "—")} sub="Target Height" />
              <div />
              <div />
            </div>
          </div>
        </div>

        {/* ── Risk Interpretation ── */}
        {riskInfo && (
          <div className="sec" style={{ border: `1.5px solid ${riskInfo.col}45`, borderRadius: 9, overflow: "hidden", marginBottom: 12, background: riskInfo.bg }}>
            <div style={{ padding: "6px 11px", borderBottom: `1px solid ${riskInfo.col}28`, display: "flex", alignItems: "center", gap: 8, background: `${riskInfo.bg}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>ผลการแปลผล · Clinical Interpretation</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: riskInfo.col, background: `${riskInfo.col}20`, padding: "2px 9px", borderRadius: 99, border: `1px solid ${riskInfo.col}40` }}>
                {riskInfo.th} / {riskInfo.en}
              </span>
            </div>
            <div style={{ padding: "9px 11px" }}>
              <p style={{ fontSize: 11.5, color: "#374151", lineHeight: 1.65, marginBottom: 4 }}>{riskInfo.thDesc}</p>
              <p style={{ fontSize: 10.5, color: "#6b7280", lineHeight: 1.55 }}>{riskInfo.enDesc}</p>
              {assessment.clinicalNotes && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>หมายเหตุทางคลินิก / Clinical Notes: </span>
                  <span style={{ fontSize: 11.5, color: "#374151" }}>{assessment.clinicalNotes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Growth Charts ── */}
        <div className="sec" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>กราฟพัฒนาการส่วนสูง · Height Growth Chart</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" /></svg>
                <span style={{ fontSize: 8.5, color: "#64748b" }}>ส่วนสูงจริง (cm)</span>
              </div>
            </div>
            <div style={{ padding: "8px 10px 10px" }}>
              <GrowthChartPrint assessments={allA} />
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, overflow: "hidden" }}>
            <div style={{ padding: "6px 11px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>กราฟ FAH vs TH</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" /></svg>
                  <span style={{ fontSize: 8.5, color: "#64748b" }}>FAH</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" /></svg>
                  <span style={{ fontSize: 8.5, color: "#64748b" }}>TH</span>
                </div>
              </div>
            </div>
            <div style={{ padding: "8px 10px 10px" }}>
              <FahThChartPrint assessments={allA} />
            </div>
          </div>
        </div>

        {/* ── Follow-up box ── */}
        {(assessment.nextFollowupDate || assessment.followupNotes) && (
          <div className="sec" style={{ border: "1px solid #fde68a", borderRadius: 9, overflow: "hidden", marginBottom: 12, background: "#fffbeb" }}>
            <div style={{ padding: "6px 11px", background: "#fef9c3", borderBottom: "1px solid #fde68a" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em" }}>นัดติดตามผล · Follow-up Plan</span>
            </div>
            <div style={{ padding: "8px 11px" }}>
              {assessment.nextFollowupDate && (
                <p style={{ fontSize: 11.5, color: "#374151" }}>
                  <span style={{ fontWeight: 700 }}>วันนัดครั้งถัดไป: </span>{fmtTh(String(assessment.nextFollowupDate))}
                </p>
              )}
              {assessment.followupNotes && (
                <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                  <span style={{ fontWeight: 700 }}>คำแนะนำ: </span>{assessment.followupNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── ส่วนท้าย: ลายเซ็น + คำเตือน (จับกลุ่มไม่ให้แยกหน้า) ── */}
        <div className="sec">
        {/* ── Signature ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 13px" }}>
            <p style={{ fontSize: 9.5, color: "#94a3b8", marginBottom: 28 }}>ลายมือชื่อแพทย์ผู้ตรวจ / Physician Signature</p>
            <div style={{ borderTop: "1.5px solid #cbd5e1", paddingTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{doctorName || "________________________________"}</p>
              <p style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>แพทย์ผู้ตรวจ / Attending Physician</p>
              <p style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>วันที่ / Date: {today}</p>
            </div>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: "10px 13px" }}>
            <p style={{ fontSize: 9.5, color: "#94a3b8", marginBottom: 6 }}>ข้อมูลระบบ / System Information</p>
            <div style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.9 }}>
              <div>ระบบ: โตทัน AI Bone Age Assessment</div>
              <div>มาตรฐาน: Greulich &amp; Pyle Atlas (GP Method)</div>
              <div>เกณฑ์อ้างอิง: Thai Growth References 2564</div>
              <div>Report ID: <span style={{ fontWeight: 700, color: "#1e293b" }}>{reportId}</span></div>
            </div>
          </div>
        </div>

        {/* ── Mock notice ── */}
        {assessment.isMock && (
          <div style={{ border: "1.5px solid #fbbf24", background: "#fffbeb", borderRadius: 9, padding: "8px 12px", marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: "#92400e", fontWeight: 700, textAlign: "center" }}>
              ⚠ ผลในรายงานฉบับนี้มาจากระบบจำลอง (Mock AI) เพื่อการสาธิตเท่านั้น — ไม่ใช่ผลวิเคราะห์จากโมเดล AI จริง
            </p>
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div style={{ borderTop: "1.5px solid #e2e8f0", paddingTop: 10 }}>
          <p style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", lineHeight: 1.65 }}>
            <span style={{ fontWeight: 700 }}>⚠ คำเตือน:</span> รายงานนี้ผลิตโดยระบบปัญญาประดิษฐ์ (AI) โตทัน และ<span style={{ fontWeight: 700 }}>ต้องได้รับการตรวจสอบ ยืนยัน และลงนามโดยแพทย์ที่ได้รับใบอนุญาตเท่านั้น</span>
            ก่อนนำไปใช้ประกอบการตัดสินใจทางการแพทย์ ผู้พัฒนาระบบไม่รับผิดชอบต่อความเสียหายที่เกิดจากการใช้รายงานนี้โดยไม่ผ่านการรับรองจากแพทย์
          </p>
          <p style={{ fontSize: 8.5, color: "#b0bec5", textAlign: "center", marginTop: 3 }}>
            WARNING: This AI-generated report must be reviewed and countersigned by a licensed physician before any clinical use. The developers disclaim liability for harm resulting from unsupervised use.
          </p>
          <p style={{ fontSize: 8.5, color: "#cbd5e1", textAlign: "center", marginTop: 5 }}>
            © 2026 โตทัน · Mahidol University · NSC Competition — All rights reserved
          </p>
        </div>
        </div>
      </div>
    </>
  );
}
