"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { childrenApi, assessmentsApi, type Child, type Assessment } from "@/lib/api";
import type { AxiosResponse } from "axios";
import { useI18n } from "@/lib/i18n";

// ── Helpers ───────────────────────────────────────────────
function calcAge(dob: string) {
  const b = new Date(dob); const n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  if (n.getMonth() - b.getMonth() < 0 || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--;
  return y;
}
function calcAgeMonths(dob: string) {
  const b = new Date(dob); const n = new Date();
  return (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
}
function fmtDate(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

const RISK_LABEL: Record<string, { th: string; en: string; color: string }> = {
  normal:        { th: "ปกติ",           en: "Normal",        color: "success" },
  short_stature: { th: "เตี้ยกว่าเกณฑ์", en: "Short Stature", color: "warning" },
  tall_stature:  { th: "สูงกว่าเกณฑ์",  en: "Tall Stature",  color: "primary" },
  advanced:      { th: "อายุกระดูกมาก",  en: "Advanced",      color: "danger"  },
  delayed:       { th: "อายุกระดูกน้อย", en: "Delayed",       color: "warning" },
};

// ── Growth Chart (SVG) ────────────────────────────────────
function GrowthChart({ assessments, lang }: { assessments: Assessment[]; lang: string }) {
  const th = lang === "th";
  const completed = assessments
    .filter(a => a.heightCm && a.status === "completed")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (completed.length < 2) return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="text-3xl mb-2">📈</span>
      <p className="font-body text-sm text-muted">
        {th ? "ต้องมีผลการประเมิน 2 ครั้งขึ้นไปจึงจะแสดงกราฟได้" : "Need at least 2 completed assessments to show chart"}
      </p>
    </div>
  );

  const W = 480; const H = 180; const PX = 44; const PY = 20;
  const iW = W - PX * 2; const iH = H - PY - 22;

  const heights = completed.map(a => Number(a.heightCm));
  const padding = (Math.max(...heights) - Math.min(...heights)) * 0.2 || 4;
  const minH = Math.floor(Math.min(...heights) - padding);
  const maxH = Math.ceil(Math.max(...heights) + padding);
  const dates = completed.map(a => new Date(a.createdAt).getTime());
  const minD = Math.min(...dates); const maxD = Math.max(...dates);

  const px = (d: number) => maxD === minD ? PX + iW / 2 : PX + ((d - minD) / (maxD - minD)) * iW;
  const py = (h: number) => maxH === minH ? PY + iH / 2 : PY + iH - ((h - minH) / (maxH - minH)) * iH;

  const points = completed.map(a => ({ x: px(new Date(a.createdAt).getTime()), y: py(Number(a.heightCm)), h: Number(a.heightCm), d: a.createdAt }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const last = points[points.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-0.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
        <span className="font-body text-xs font-semibold" style={{ color: "rgb(var(--primary))" }}>
          {th ? "ส่วนสูงจริง (ซม.)" : "Actual Height (cm)"}
        </span>
      </div>
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
          <defs>
            <linearGradient id="hgrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = PY + f * iH;
            const val = Math.round(maxH - f * (maxH - minH));
            return (
              <g key={f}>
                <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="rgb(var(--border))" strokeWidth="0.8" strokeDasharray="4 4" />
                <text x={PX - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="rgb(var(--muted))">{val}</text>
              </g>
            );
          })}

          <path d={`${path} L ${last.x} ${PY + iH} L ${points[0].x} ${PY + iH} Z`} fill="url(#hgrad)" />
          <path d={path} fill="none" stroke="rgb(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="rgb(var(--primary))" stroke="rgb(var(--surface))" strokeWidth="2" />
          ))}
          {points.length > 0 && (() => {
            const mid = points[Math.floor((points.length - 1) / 2)];
            const next = points[Math.floor((points.length - 1) / 2) + 1] ?? mid;
            const mx = (mid.x + next.x) / 2;
            const my = (mid.y + next.y) / 2;
            return <text x={mx} y={my - 10} textAnchor="middle" fontSize="11" fill="rgb(var(--primary))" fontWeight="700">{mid.h} cm</text>;
          })()}

          {points.map((p, i) => (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgb(var(--muted))">
              {new Date(p.d).toLocaleDateString(th ? "th-TH" : "en-US", { month: "short", year: "2-digit" })}
            </text>
          ))}

          <text x={10} y={PY + iH / 2} textAnchor="middle" fontSize="8" fill="rgb(var(--muted))" transform={`rotate(-90, 10, ${PY + iH / 2})`}>
            {th ? "ซม." : "cm"}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── FAH vs TH Chart ───────────────────────────────────────
function FahThChart({ assessments, lang }: { assessments: Assessment[]; lang: string }) {
  const th = lang === "th";
  const data = assessments
    .filter(a => a.status === "completed" && a.finalAdultHeightCm)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (data.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="text-3xl mb-2">📊</span>
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
  const lastTh  = thPts[thPts.length - 1];

  return (
    <div className="space-y-3">
      {/* Legend chips */}
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

      {/* Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
          <defs>
            <linearGradient id="fahgrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => {
            const y = PY + f * iH;
            const val = Math.round(maxV - f * (maxV - minV));
            return (
              <g key={f}>
                <line x1={PX} y1={y} x2={PX + iW} y2={y} stroke="rgb(var(--border))" strokeWidth="0.8" strokeDasharray="4 4" />
                <text x={PX - 5} y={y + 3.5} textAnchor="end" fontSize="9" fill="rgb(var(--muted))">{val}</text>
              </g>
            );
          })}

          {/* FAH fill */}
          {fahPts.length > 1 && (
            <path d={`${fahPath} L ${lastFah.x} ${PY + iH} L ${fahPts[0].x} ${PY + iH} Z`} fill="url(#fahgrad2)" />
          )}

          {/* TH line */}
          {thPath && <path d={thPath} fill="none" stroke="rgb(var(--warning))" strokeWidth="2.2" strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" />}
          {thPts.length === 1 && (
            <line x1={PX} y1={thPts[0].y} x2={PX + iW} y2={thPts[0].y}
              stroke="rgb(var(--warning))" strokeWidth="2" strokeDasharray="6 3" />
          )}

          {/* FAH line */}
          <path d={fahPath} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Mid-line labels */}
          {fahPts.length > 0 && (() => {
            const mid = fahPts[Math.floor(fahPts.length / 2)];
            return <text x={mid.x} y={mid.y + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgb(var(--accent))">FAH</text>;
          })()}
          {thPts.length > 1 && (() => {
            const mid = thPts[Math.floor(thPts.length / 2)];
            return <text x={mid.x} y={mid.y + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgb(var(--warning))">TH</text>;
          })()}
          {thPts.length === 1 && (
            <text x={thPts[0].x} y={thPts[0].y + 16} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgb(var(--warning))">TH</text>
          )}

          {/* FAH points */}
          {fahPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4.5" fill="rgb(var(--accent))" stroke="rgb(var(--surface))" strokeWidth="2" />
          ))}
          {/* FAH mid-line value */}
          {fahPts.length > 0 && (() => {
            const mid = fahPts[Math.floor((fahPts.length - 1) / 2)];
            const next = fahPts[Math.floor((fahPts.length - 1) / 2) + 1] ?? mid;
            const mx = (mid.x + next.x) / 2;
            const my = (mid.y + next.y) / 2;
            return <text x={mx} y={my - 10} textAnchor="middle" fontSize="11" fill="rgb(var(--accent))" fontWeight="700">{mid.v} cm</text>;
          })()}

          {/* TH points */}
          {thPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="rgb(var(--warning))" stroke="rgb(var(--surface))" strokeWidth="2" />
          ))}
          {/* TH mid-line value */}
          {thPts.length > 0 && (() => {
            const mid = thPts[Math.floor((thPts.length - 1) / 2)];
            const next = thPts[Math.floor((thPts.length - 1) / 2) + 1] ?? mid;
            const mx = (mid.x + next.x) / 2;
            const my = (mid.y + next.y) / 2;
            return <text x={mx} y={my + 18} textAnchor="middle" fontSize="11" fill="rgb(var(--warning))" fontWeight="700">{mid.v} cm</text>;
          })()}
          {/* TH horizontal line value (single point) */}
          {thPts.length === 1 && (() => {
            const mx = PX + iW / 2;
            return <text x={mx} y={thPts[0].y + 18} textAnchor="middle" fontSize="11" fill="rgb(var(--warning))" fontWeight="700">{thPts[0].v} cm</text>;
          })()}

          {/* X-axis labels */}
          {fahPts.map((p, i) => (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="rgb(var(--muted))">
              {new Date(p.d).toLocaleDateString(th ? "th-TH" : "en-US", { month: "short", year: "2-digit" })}
            </text>
          ))}

          {/* Y-axis label */}
          <text x={10} y={PY + iH / 2} textAnchor="middle" fontSize="8" fill="rgb(var(--muted))" transform={`rotate(-90, 10, ${PY + iH / 2})`}>
            {th ? "ซม." : "cm"}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── New Assessment Panel ──────────────────────────────────
function NewAssessmentPanel({
  child, onClose, onSaved, lang,
}: {
  child: Child; onClose: () => void; onSaved: (a: Assessment) => void; lang: string;
}) {
  const th = lang === "th";
  const [form, setForm] = useState({ heightCm: "", weightKg: "", clinicalNotes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [xrayPreview, setXrayPreview] = useState<string | null>(null);
  const [xrayBase64, setXrayBase64] = useState<string>("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setXrayPreview(result);
      setXrayBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!xrayBase64) { setError(th ? "กรุณาเลือกภาพ X-ray" : "Please select an X-ray image"); return; }
    setSaving(true); setError("");
    try {
      const { data } = await assessmentsApi.create({
        childId: child.id,
        xrayImageUrl: xrayBase64,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        clinicalNotes: form.clinicalNotes || undefined,
      });
      onSaved(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? (th ? "เกิดข้อผิดพลาด" : "Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong border-l border-border/60 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-border/40 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div>
            <h3 className="font-display text-base font-bold text-ink">{th ? "สร้างการประเมินใหม่" : "New Assessment"}</h3>
            <p className="font-body text-xs text-muted">{child.name}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-body text-danger"
              style={{ background: "rgb(var(--danger)/0.1)", border: "1px solid rgb(var(--danger)/0.2)" }}>
              {error}
            </div>
          )}

          {/* X-ray upload */}
          <div>
            <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
              {th ? "ภาพ X-ray มือซ้าย" : "Left Hand X-ray"} <span className="text-danger">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden ${
                xrayPreview ? "border-primary/40" : "border-border hover:border-primary/40"
              }`}
              style={{ minHeight: 160 }}>
              {xrayPreview ? (
                <img src={xrayPreview} alt="X-ray preview" className="w-full h-48 object-contain bg-black/80 rounded-2xl" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-muted">
                  <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="font-body text-sm">{th ? "คลิกเพื่อเลือกภาพ" : "Click to select image"}</span>
                  <span className="font-body text-xs opacity-60">JPEG, PNG, DICOM</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Height + Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                {th ? "ส่วนสูง (ซม.)" : "Height (cm)"}
              </label>
              <input type="number" min="30" max="250" step="0.1" value={form.heightCm} onChange={set("heightCm")}
                placeholder={child.heightCm ? String(child.heightCm) : "120.0"} className="input-base" />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                {th ? "น้ำหนัก (กก.)" : "Weight (kg)"}
              </label>
              <input type="number" min="1" max="200" step="0.1" value={form.weightKg} onChange={set("weightKg")}
                placeholder={child.weightKg ? String(child.weightKg) : "25.0"} className="input-base" />
            </div>
          </div>

          {/* Clinical notes */}
          <div>
            <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
              {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
            </label>
            <textarea value={form.clinicalNotes} onChange={set("clinicalNotes")} rows={3}
              placeholder={th ? "ข้อสังเกต, อาการ, ยาที่ใช้..." : "Observations, symptoms, medications..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none font-body" />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50">
          <button onClick={handleSubmit as any} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.3)" }}>
            {saving ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{th ? "กำลังบันทึก..." : "Saving..."}</>
            ) : (
              <>{th ? "ส่งประเมิน AI →" : "Submit for AI Analysis →"}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Child Settings Panel ──────────────────────────────────
function ChildSettingsPanel({
  child, onClose, onSaved, lang,
}: {
  child: Child; onClose: () => void; onSaved: (c: Child) => void; lang: string;
}) {
  const th = lang === "th";
  const [form, setForm] = useState({
    name:           child.name,
    dateOfBirth:    child.dateOfBirth.slice(0, 10),
    ethnicity:      child.ethnicity ?? "",
    heightCm:       child.heightCm   ? String(child.heightCm)        : "",
    weightKg:       child.weightKg   ? String(child.weightKg)        : "",
    fatherHeightCm: child.fatherHeightCm ? String(child.fatherHeightCm) : "",
    motherHeightCm: child.motherHeightCm ? String(child.motherHeightCm) : "",
    clinicalNotes:  child.clinicalNotes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError(th ? "กรุณาระบุชื่อ" : "Name is required"); return; }
    setSaving(true); setError("");
    try {
      const payload: Record<string, any> = {
        name:        form.name.trim(),
        dateOfBirth: form.dateOfBirth,
        ethnicity:   form.ethnicity || undefined,
        heightCm:    form.heightCm       ? Number(form.heightCm)       : undefined,
        weightKg:    form.weightKg       ? Number(form.weightKg)       : undefined,
        fatherHeightCm: form.fatherHeightCm ? Number(form.fatherHeightCm) : undefined,
        motherHeightCm: form.motherHeightCm ? Number(form.motherHeightCm) : undefined,
        clinicalNotes: form.clinicalNotes || undefined,
      };
      const { data } = await childrenApi.update(child.id, payload);
      onSaved(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? (th ? "เกิดข้อผิดพลาด" : "Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong border-l border-border/60 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 flex-shrink-0">
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-border/40 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h3 className="font-display text-base font-bold text-ink">{th ? "ตั้งค่าข้อมูลผู้ป่วย" : "Patient Settings"}</h3>
            <p className="font-body text-xs text-muted">{child.name}</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-body text-danger"
              style={{ background: "rgb(var(--danger)/0.1)", border: "1px solid rgb(var(--danger)/0.2)" }}>
              {error}
            </div>
          )}

          {/* Section: ข้อมูลพื้นฐาน */}
          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "ข้อมูลพื้นฐาน" : "Basic Info"}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ชื่อ-นามสกุล" : "Full Name"} <span className="text-danger">*</span>
                </label>
                <input type="text" value={form.name} onChange={set("name")} className="input-base" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                    {th ? "วันเกิด" : "Date of Birth"}
                  </label>
                  <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} className="input-base" />
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                    {th ? "เชื้อชาติ" : "Ethnicity"}
                  </label>
                  <input type="text" value={form.ethnicity} onChange={set("ethnicity")}
                    placeholder="Thai" className="input-base" />
                </div>
              </div>
            </div>
          </div>

          {/* Section: การวัด */}
          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "การวัดล่าสุด" : "Latest Measurements"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ส่วนสูง (ซม.)" : "Height (cm)"}
                </label>
                <input type="number" min="30" max="250" step="0.1"
                  value={form.heightCm} onChange={set("heightCm")} placeholder="120.0" className="input-base" />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "น้ำหนัก (กก.)" : "Weight (kg)"}
                </label>
                <input type="number" min="1" max="200" step="0.1"
                  value={form.weightKg} onChange={set("weightKg")} placeholder="25.0" className="input-base" />
              </div>
            </div>
          </div>

          {/* Section: ข้อมูลครอบครัว */}
          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "ข้อมูลครอบครัว" : "Family Data"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ส่วนสูงบิดา (ซม.)" : "Father Height (cm)"}
                </label>
                <input type="number" min="100" max="250" step="0.1"
                  value={form.fatherHeightCm} onChange={set("fatherHeightCm")} placeholder="170.0" className="input-base" />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ส่วนสูงมารดา (ซม.)" : "Mother Height (cm)"}
                </label>
                <input type="number" min="100" max="250" step="0.1"
                  value={form.motherHeightCm} onChange={set("motherHeightCm")} placeholder="158.0" className="input-base" />
              </div>
            </div>
          </div>

          {/* Section: หมายเหตุ */}
          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
            </p>
            <textarea value={form.clinicalNotes} onChange={set("clinicalNotes")} rows={4}
              placeholder={th ? "ข้อสังเกต, อาการ, ยาที่ใช้..." : "Observations, symptoms, medications..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none font-body" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/30 transition-all">
            {th ? "ยกเลิก" : "Cancel"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.3)" }}>
            {saving
              ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{th ? "กำลังบันทึก..." : "Saving..."}</>
              : (th ? "บันทึก" : "Save")}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Assessment Detail Panel ───────────────────────────────
function AssessmentDetailPanel({
  assessment, child, chronAgeMonths, onClose, lang,
}: {
  assessment: Assessment; child: Child; chronAgeMonths: number; onClose: () => void; lang: string;
}) {
  const th = lang === "th";
  const boneAge = Number(assessment.boneAgeMonths ?? 0);
  const deviation = boneAge - chronAgeMonths;
  const isMock = !assessment.heatmapUrl || assessment.heatmapUrl.startsWith("mock://");

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: th ? "อายุกระดูก" : "Bone Age",
      value: `${Math.floor(boneAge / 12)} ${th ? "ปี" : "y"} ${boneAge % 12} ${th ? "เดือน" : "m"}`, highlight: true },
    { label: th ? "ส่วนเบี่ยงเบน" : "Deviation",
      value: `${deviation >= 0 ? "+" : ""}${deviation} ${th ? "เดือน" : "mo"}` },
    { label: th ? "ความมั่นใจ AI" : "AI Confidence",
      value: assessment.confidence ? `${Math.round(Number(assessment.confidence) * 100)}%` : "—" },
    { label: th ? "ส่วนสูง" : "Height",
      value: assessment.heightCm ? `${assessment.heightCm} cm` : "—" },
    { label: th ? "น้ำหนัก" : "Weight",
      value: assessment.weightKg ? `${assessment.weightKg} kg` : "—" },
    { label: "BMI",
      value: assessment.bmi ? `${assessment.bmi}` : "—" },
    { label: th ? "เปอร์เซนไทล์ส่วนสูง" : "Height Percentile",
      value: assessment.heightPercentile ? `P${Math.round(Number(assessment.heightPercentile))}` : "—" },
    { label: th ? "เปอร์เซนไทล์น้ำหนัก" : "Weight Percentile",
      value: assessment.weightPercentile ? `P${Math.round(Number(assessment.weightPercentile))}` : "—" },
    { label: th ? "เปอร์เซนไทล์ BMI" : "BMI Percentile",
      value: assessment.bmiPercentile ? `P${Math.round(Number(assessment.bmiPercentile))}` : "—" },
    { label: "Height SD (Z-score)",
      value: assessment.heightSdScore ? `${Number(assessment.heightSdScore) >= 0 ? "+" : ""}${assessment.heightSdScore}` : "—" },
    { label: th ? "ส่วนสูงที่คาดการณ์ (FAH)" : "Final Adult Height",
      value: assessment.finalAdultHeightCm ? `${assessment.finalAdultHeightCm} cm` : "—", highlight: true },
    { label: th ? "ส่วนสูงเป้าหมาย (TH)" : "Target Height",
      value: assessment.targetHeightCm ? `${assessment.targetHeightCm} cm` : "—" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg glass-strong border-l border-border/60 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 flex-shrink-0">
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-border/40 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-bold text-ink">
              {th ? "รายละเอียดการประเมิน" : "Assessment Detail"}
            </h3>
            <p className="font-body text-xs text-muted truncate">
              {new Date(assessment.createdAt).toLocaleDateString(th ? "th-TH" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {assessment.riskFlag && RISK_LABEL[assessment.riskFlag] && (
            <span className={`text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-${RISK_LABEL[assessment.riskFlag].color}/10 text-${RISK_LABEL[assessment.riskFlag].color} flex-shrink-0`}>
              {th ? RISK_LABEL[assessment.riskFlag].th : RISK_LABEL[assessment.riskFlag].en}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Images */}
          <div className="grid grid-cols-2 gap-3">
            {/* X-ray */}
            <div className="space-y-1.5">
              <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                {th ? "ภาพ X-ray" : "X-ray Image"}
              </p>
              <div className="rounded-xl overflow-hidden bg-black/80 aspect-square flex items-center justify-center border border-border/30">
                {assessment.xrayImageUrl && !assessment.xrayImageUrl.startsWith("mock://") ? (
                  <img src={assessment.xrayImageUrl} alt="X-ray" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted/40">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
                    </svg>
                    <span className="font-body text-[10px]">No image</span>
                  </div>
                )}
              </div>
            </div>

            {/* Heatmap */}
            <div className="space-y-1.5">
              <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                {th ? "Heatmap (Grad-CAM)" : "Heatmap (Grad-CAM)"}
              </p>
              <div className="rounded-xl overflow-hidden aspect-square flex items-center justify-center border border-border/30 relative"
                style={{ background: isMock ? "linear-gradient(135deg,#0a0a14,#111)" : "black" }}>
                {isMock ? (
                  <>
                    {/* Mock heatmap visualization */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full opacity-70"
                        style={{ background: "radial-gradient(circle, rgb(239,68,68) 0%, rgb(234,179,8) 40%, rgb(34,197,94) 70%, transparent 100%)" }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full opacity-50"
                        style={{ background: "radial-gradient(circle, rgb(255,255,255) 0%, rgb(239,68,68) 60%, transparent 100%)" }} />
                    </div>
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <span className="font-body text-[9px] text-white/40">{th ? "ภาพจำลอง" : "Simulated"}</span>
                    </div>
                  </>
                ) : (
                  <img src={assessment.heatmapUrl} alt="Heatmap" className="w-full h-full object-contain" />
                )}
              </div>
            </div>
          </div>

          {/* Metrics table */}
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/40"
              style={{ background: "rgb(var(--surface))" }}>
              <p className="font-display text-xs font-bold text-ink">
                {th ? "ข้อมูลเชิงลึก" : "Detailed Metrics"}
              </p>
            </div>
            <div className="divide-y divide-border/30">
              {rows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.02]">
                  <span className="font-body text-xs text-muted">{row.label}</span>
                  <span className={`font-body text-xs font-semibold tabular-nums ${row.highlight ? "text-primary" : "text-ink"}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical notes */}
          {assessment.clinicalNotes && (
            <div className="rounded-xl border border-border/40 p-4 space-y-1">
              <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
              </p>
              <p className="font-body text-sm text-ink leading-relaxed">{assessment.clinicalNotes}</p>
            </div>
          )}

          {/* Follow-up */}
          {assessment.nextFollowupDate && (
            <div className="rounded-xl border border-warning/30 p-4 space-y-1"
              style={{ background: "rgb(var(--warning)/0.05)" }}>
              <p className="font-body text-[11px] font-semibold text-warning uppercase tracking-wide">
                {th ? "นัดติดตามผล" : "Follow-up"}
              </p>
              <p className="font-body text-sm text-ink">
                {new Date(String(assessment.nextFollowupDate)).toLocaleDateString(th ? "th-TH" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              {assessment.followupNotes && (
                <p className="font-body text-xs text-muted">{assessment.followupNotes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { lang } = useI18n();
  const th = lang === "th";

  const [child, setChild] = useState<Child | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u.role) setIsDoctor(u.role === "doctor");
    } catch {}
    (async () => {
      try {
        const [{ data: c }, { data: a }] = await Promise.all([
          childrenApi.get(id),
          assessmentsApi.listByChild(id),
        ]);
        setChild(c);
        setAssessments(a);
      } catch {
        router.replace("/dashboard/patients");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!child) return null;

  const age = calcAge(child.dateOfBirth);
  const ageMonths = calcAgeMonths(child.dateOfBirth);
  const latestCompleted = assessments.find(a => a.status === "completed");
  const nextFollowup = assessments.find(a => a.nextFollowupDate);
  const isM = child.sex === "M";

  const targetHeight = child.fatherHeightCm && child.motherHeightCm
    ? isM
      ? ((Number(child.fatherHeightCm) + Number(child.motherHeightCm) + 13) / 2).toFixed(1)
      : ((Number(child.fatherHeightCm) + Number(child.motherHeightCm) - 13) / 2).toFixed(1)
    : null;

  const deleteChild = async () => {
    setDeleting(true);
    try {
      await childrenApi.delete(id);
      router.replace("/dashboard/patients");
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const simulate = async (assessmentId: string) => {
    setSimulating(assessmentId);
    try {
      const { data } = await assessmentsApi.mockAiResult(assessmentId);
      setAssessments(prev => prev.map(a => a.id === assessmentId ? data : a));
    } catch {
      // Refresh from server in case DB updated but response failed (e.g. Redis down)
      const { data: refreshed } = await assessmentsApi.listByChild(id).catch(() => ({ data: null }));
      if (refreshed) setAssessments(refreshed);
    } finally { setSimulating(null); }
  };

  const statusCfg: Record<string, { label: string; cls: string }> = {
    pending:    { label: th ? "รอดำเนินการ"  : "Pending",    cls: "bg-primary/10 text-primary"  },
    processing: { label: th ? "กำลังวิเคราะห์": "Processing", cls: "bg-warning/10 text-warning"  },
    completed:  { label: th ? "เสร็จสิ้น"    : "Completed",  cls: "bg-success/10 text-success"  },
    failed:     { label: th ? "ผิดพลาด"      : "Failed",     cls: "bg-danger/10  text-danger"   },
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed top-[-10%] right-[-6%] w-[520px] h-[520px] rounded-full blur-[140px] opacity-[0.11] animate-aurora pointer-events-none"
        style={{ background: isM ? "rgb(var(--aurora-1))" : "rgb(var(--accent))" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 px-8 py-4 glass border-b border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:border-border/80 transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: isM ? "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))" }}>
              {child.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-ink truncate">{child.name}</h1>
              <p className="font-body text-xs text-muted">
                {age} {th ? "ปี" : "yrs"} · {isM ? (th ? "ชาย" : "Male") : (th ? "หญิง" : "Female")} · {child.ethnicity}
              </p>
            </div>
          </div>

          {isDoctor && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "linear-gradient(120deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.35)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {th ? "ประเมินใหม่" : "New Assessment"}
              </button>
              <button onClick={() => setShowSettings(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:border-border/80 transition-all"
                title={th ? "ตั้งค่าข้อมูลผู้ป่วย" : "Patient settings"}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <button onClick={() => setShowDeleteModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-danger/30 text-danger hover:bg-danger/8 transition-all"
                title={th ? "ลบข้อมูลผู้ป่วย" : "Delete patient"}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 p-8 space-y-6 max-w-5xl">

        {/* ── Info + Stats row ── */}
        <div className="grid grid-cols-3 gap-4">

          {/* Patient card */}
          <div className="col-span-1 glass rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-xs font-bold text-muted uppercase tracking-wide">
              {th ? "ข้อมูลผู้ป่วย" : "Patient Info"}
            </h2>
            <InfoRow label={th ? "วันเกิด" : "Date of Birth"} value={fmtDate(child.dateOfBirth, th ? "th-TH" : "en-US")} />
            <InfoRow label={th ? "อายุ" : "Age"} value={`${age} ${th ? "ปี" : "yrs"} ${ageMonths % 12} ${th ? "เดือน" : "mo"}`} />
            <InfoRow label={th ? "เพศ" : "Sex"} value={isM ? (th ? "ชาย" : "Male") : (th ? "หญิง" : "Female")} />
            <InfoRow label={th ? "เชื้อชาติ" : "Ethnicity"} value={child.ethnicity} />
            {child.fatherHeightCm && <InfoRow label={th ? "ส่วนสูงบิดา" : "Father Ht."} value={`${child.fatherHeightCm} cm`} />}
            {child.motherHeightCm && <InfoRow label={th ? "ส่วนสูงมารดา" : "Mother Ht."} value={`${child.motherHeightCm} cm`} />}
            {targetHeight && (
              <InfoRow label={th ? "Target Height" : "Target Ht."} value={`${targetHeight} cm`} highlight />
            )}
          </div>

          {/* Stats */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            <StatCard
              icon="🔬" color="primary"
              label={th ? "การประเมินทั้งหมด" : "Total Assessments"}
              value={String(assessments.length)}
              sub={assessments.filter(a => a.status === "COMPLETED").length + (th ? " เสร็จสิ้น" : " completed")}
            />
            <StatCard
              icon="🦴" color="accent"
              label={th ? "อายุกระดูกล่าสุด" : "Latest Bone Age"}
              value={latestCompleted?.boneAgeMonths
                ? `${Math.floor(Number(latestCompleted.boneAgeMonths) / 12)} ${th ? "ปี" : "y"} ${Number(latestCompleted.boneAgeMonths) % 12} ${th ? "เดือน" : "m"}`
                : "—"}
              sub={latestCompleted?.riskFlag
                ? (th ? RISK_LABEL[latestCompleted.riskFlag]?.th : RISK_LABEL[latestCompleted.riskFlag]?.en) ?? "—"
                : (th ? "รอผล AI" : "Awaiting AI")}
            />
            <StatCard
              icon="📏" color="success"
              label={th ? "ส่วนสูงล่าสุด" : "Latest Height"}
              value={latestCompleted?.heightCm ? `${latestCompleted.heightCm} cm` : (child.heightCm ? `${child.heightCm} cm` : "—")}
              sub={latestCompleted?.heightPercentile ? `P${Math.round(Number(latestCompleted.heightPercentile))}` : ""}
            />
            <StatCard
              icon="📅" color="warning"
              label={th ? "นัดติดตามผลครั้งถัดไป" : "Next Follow-up"}
              value={nextFollowup?.nextFollowupDate
                ? fmtDate(String(nextFollowup.nextFollowupDate), th ? "th-TH" : "en-US")
                : "—"}
              sub={nextFollowup?.followupNotes ?? ""}
            />
          </div>
        </div>

        {/* ── Growth Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h2 className="font-display text-sm font-bold text-ink">{th ? "กราฟพัฒนาการส่วนสูง" : "Height Growth Chart"}</h2>
              <p className="font-body text-[11px] text-muted mt-0.5">{th ? "ส่วนสูงจริงจากผลการประเมิน" : "Actual height from assessments"}</p>
            </div>
            <div className="p-5">
              <GrowthChart assessments={assessments} lang={lang} />
            </div>
          </section>

          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h2 className="font-display text-sm font-bold text-ink">{th ? "กราฟ FAH vs TH" : "FAH vs Target Height"}</h2>
              <p className="font-body text-[11px] text-muted mt-0.5">
                {th ? "ส่วนสูงคาดการณ์ผู้ใหญ่ เทียบกับส่วนสูงเป้าหมาย" : "Predicted adult height vs target height"}
              </p>
            </div>
            <div className="p-5">
              <FahThChart assessments={assessments} lang={lang} />
            </div>
          </section>
        </div>

        {/* ── Assessment History ── */}
        <section className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">{th ? "ประวัติการประเมิน" : "Assessment History"}</h2>
              <p className="font-body text-[11px] text-muted mt-0.5">{assessments.length} {th ? "รายการ" : "records"}</p>
            </div>
          </div>

          {assessments.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🔬</p>
              <p className="font-body font-semibold text-ink text-sm">{th ? "ยังไม่มีประวัติการประเมิน" : "No assessments yet"}</p>
              {isDoctor && (
                <button onClick={() => setShowNew(true)}
                  className="mt-4 text-sm font-body font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-colors">
                  {th ? "+ สร้างการประเมินแรก" : "+ Create first assessment"}
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {assessments.map((a, i) => {
                const cfg = statusCfg[a.status] ?? statusCfg.pending;
                const risk = a.riskFlag ? RISK_LABEL[a.riskFlag] : null;
                return (
                  <div key={a.id} className="px-6 py-4 hover:bg-primary/[0.03] transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Index + status dot */}
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                        <span className="font-body text-xs text-muted/50 w-5 text-center">{assessments.length - i}</span>
                        {i < assessments.length - 1 && <div className="w-px flex-1 bg-border/40 min-h-[24px]" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                          {risk && (
                            <span className={`inline-flex items-center text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-${risk.color}/10 text-${risk.color}`}>
                              {th ? risk.th : risk.en}
                            </span>
                          )}
                          {isDoctor && (a.status === "pending" || a.status === "failed") && (
                            <button
                              onClick={() => simulate(a.id)}
                              disabled={simulating === a.id}
                              className="inline-flex items-center gap-1 text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
                              {simulating === a.id ? (
                                <><svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{th ? "กำลัง..." : "Running..."}</>
                              ) : (
                                <><span>🤖</span>{th ? "จำลอง AI" : "Simulate AI"}</>
                              )}
                            </button>
                          )}
                          <span className="font-body text-xs text-muted ml-auto">
                            {fmtDate(a.createdAt, th ? "th-TH" : "en-US")}
                          </span>
                          {isDoctor && a.status === "completed" && (
                            <button
                              onClick={() => setSelectedAssessment(a)}
                              className="inline-flex items-center gap-1 text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {th ? "รายละเอียด" : "Details"}
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {a.heightCm && <MiniStat label={th ? "ส่วนสูง" : "Height"} value={`${a.heightCm} cm`} />}
                          {a.weightKg && <MiniStat label={th ? "น้ำหนัก" : "Weight"} value={`${a.weightKg} kg`} />}
                          {a.boneAgeMonths && (
                            <MiniStat label={th ? "อายุกระดูก" : "Bone Age"}
                              value={`${Math.floor(Number(a.boneAgeMonths) / 12)}y ${Number(a.boneAgeMonths) % 12}m`} />
                          )}
                          {a.confidence && <MiniStat label={th ? "ความมั่นใจ AI" : "Confidence"} value={`${Math.round(Number(a.confidence) * 100)}%`} />}
                          {a.heightPercentile && <MiniStat label="Percentile" value={`P${Math.round(Number(a.heightPercentile))}`} />}
                          {a.finalAdultHeightCm && <MiniStat label={th ? "ส่วนสูงคาดการณ์" : "Pred. Ht."} value={`${a.finalAdultHeightCm} cm`} />}
                        </div>

                        {a.clinicalNotes && (
                          <p className="font-body text-xs text-muted mt-2 bg-bg2/60 rounded-lg px-3 py-2">
                            {a.clinicalNotes}
                          </p>
                        )}
                        {a.nextFollowupDate && (
                          <p className="font-body text-xs text-warning mt-1.5">
                            📅 {th ? "นัดติดตาม:" : "Follow-up:"} {fmtDate(String(a.nextFollowupDate), th ? "th-TH" : "en-US")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirm modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgb(var(--danger)/0.12)" }}>
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  {th ? "ลบข้อมูลผู้ป่วย" : "Delete Patient"}
                </h3>
                <p className="font-body text-xs text-muted mt-0.5">
                  {th ? `"${child.name}"` : `"${child.name}"`}
                </p>
              </div>
            </div>
            <p className="font-body text-sm text-muted mb-5">
              {th
                ? "ข้อมูลทั้งหมดรวมถึงผลการประเมินจะถูกลบถาวร ไม่สามารถกู้คืนได้"
                : "All data including assessment history will be permanently deleted and cannot be recovered."}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/30 transition-all">
                {th ? "ยกเลิก" : "Cancel"}
              </button>
              <button onClick={deleteChild} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "rgb(var(--danger))" }}>
                {deleting
                  ? (th ? "กำลังลบ..." : "Deleting...")
                  : (th ? "ลบถาวร" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Assessment Panel */}
      {showNew && (
        <NewAssessmentPanel
          child={child}
          lang={lang}
          onClose={() => setShowNew(false)}
          onSaved={(a) => {
            setAssessments(prev => [a, ...prev]);
            setShowNew(false);
          }}
        />
      )}

      {/* Child Settings Panel */}
      {showSettings && (
        <ChildSettingsPanel
          child={child}
          lang={lang}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => {
            setChild(updated);
            setShowSettings(false);
          }}
        />
      )}

      {/* Assessment Detail Panel */}
      {selectedAssessment && (
        <AssessmentDetailPanel
          assessment={selectedAssessment}
          child={child}
          chronAgeMonths={ageMonths}
          onClose={() => setSelectedAssessment(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-body text-[11px] text-muted flex-shrink-0">{label}</span>
      <span className={`font-body text-xs font-semibold text-right ${highlight ? "text-primary" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function StatCard({ icon, color, label, value, sub }: { icon: string; color: string; label: string; value: string; sub: string }) {
  const colorMap: Record<string, string> = { primary: "text-primary", accent: "text-accent", success: "text-success", warning: "text-warning" };
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`font-display text-2xl font-bold tabular-nums ${colorMap[color] ?? "text-primary"}`}>{value}</span>
      </div>
      <p className="font-body text-xs font-semibold text-ink leading-tight">{label}</p>
      {sub && <p className="font-body text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg2/60 rounded-lg px-3 py-1.5">
      <p className="font-body text-[10px] text-muted">{label}</p>
      <p className="font-body text-xs font-semibold text-ink">{value}</p>
    </div>
  );
}
