"use client";

import { useRef, useState } from "react";
import { childrenApi, authApi, type Child } from "@/lib/api";

export function ChildSettingsPanel({
  child, onClose, onSaved, lang,
}: {
  child: Child; onClose: () => void; onSaved: (c: Child) => void; lang: string;
}) {
  const th = lang === "th";
  const [exiting, setExiting] = useState(false);
  const handleClose = () => { setExiting(true); setTimeout(onClose, 260); };
  const [form, setForm] = useState({
    name:           child.name,
    dateOfBirth:    child.dateOfBirth.slice(0, 10),
    ethnicity:      child.ethnicity ?? "",
    heightCm:       child.heightCm       ? String(child.heightCm)       : "",
    weightKg:       child.weightKg       ? String(child.weightKg)       : "",
    fatherHeightCm: child.fatherHeightCm ? String(child.fatherHeightCm) : "",
    motherHeightCm: child.motherHeightCm ? String(child.motherHeightCm) : "",
    clinicalNotes:  child.clinicalNotes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // ── เชื่อมผู้ปกครองภายหลัง (เหมือนหน้าเพิ่มผู้ป่วย) ──
  const [parentEmail, setParentEmail] = useState("");
  const [parentLookup, setParentLookup] = useState<
    "idle" | "checking" | "found" | "not_found" | "wrong_role"
  >("idle");
  const [newParentId, setNewParentId] = useState<string | undefined>(undefined);
  const [unlink, setUnlink] = useState(false);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleParentEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setParentEmail(email);
    setNewParentId(undefined);

    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!email) { setParentLookup("idle"); return; }

    setParentLookup("checking");
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await authApi.findByEmail(email);
        if (!data) { setParentLookup("not_found"); return; }
        if (data.role !== "parent") { setParentLookup("wrong_role"); return; }
        setNewParentId(data.id);
        setParentLookup("found");
      } catch {
        setParentLookup("not_found");
      }
    }, 600);
  };

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
        heightCm:       form.heightCm       ? Number(form.heightCm)       : undefined,
        weightKg:       form.weightKg       ? Number(form.weightKg)       : undefined,
        fatherHeightCm: form.fatherHeightCm ? Number(form.fatherHeightCm) : undefined,
        motherHeightCm: form.motherHeightCm ? Number(form.motherHeightCm) : undefined,
        clinicalNotes: form.clinicalNotes || undefined,
      };
      if (newParentId) payload.parentId = newParentId;
      else if (unlink) payload.parentId = null;
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
      <div className={`panel-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]${exiting ? " panel-backdrop--out" : ""}`} onClick={handleClose} />
      <div className={`panel-sheet fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong border-l border-border/60 flex flex-col overflow-hidden${exiting ? " panel-sheet--out" : ""}`}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 flex-shrink-0">
          <button onClick={handleClose}
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

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-body text-danger"
              style={{ background: "rgb(var(--danger)/0.1)", border: "1px solid rgb(var(--danger)/0.2)" }}>
              {error}
            </div>
          )}

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
                  <input type="text" value={form.ethnicity} onChange={set("ethnicity")} placeholder="Thai" className="input-base" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "การวัดล่าสุด" : "Latest Measurements"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ส่วนสูง (cm)" : "Height (cm)"}
                </label>
                <input type="number" min="30" max="250" step="0.1"
                  value={form.heightCm} onChange={set("heightCm")} placeholder="120.0" className="input-base" />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "น้ำหนัก (kg)" : "Weight (kg)"}
                </label>
                <input type="number" min="1" max="200" step="0.1"
                  value={form.weightKg} onChange={set("weightKg")} placeholder="25.0" className="input-base" />
              </div>
            </div>
          </div>

          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "ข้อมูลครอบครัว" : "Family Data"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ส่วนสูงบิดา (cm)" : "Father Height (cm)"}
                </label>
                <input type="number" min="100" max="250" step="0.1"
                  value={form.fatherHeightCm} onChange={set("fatherHeightCm")} placeholder="170.0" className="input-base" />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5">
                  {th ? "ส่วนสูงมารดา (cm)" : "Mother Height (cm)"}
                </label>
                <input type="number" min="100" max="250" step="0.1"
                  value={form.motherHeightCm} onChange={set("motherHeightCm")} placeholder="158.0" className="input-base" />
              </div>
            </div>
          </div>

          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "ผู้ปกครอง" : "Parent Link"}
            </p>

            {/* สถานะปัจจุบัน */}
            {child.parentId && !unlink && !newParentId && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-3"
                style={{ background: "rgb(var(--success)/0.08)", border: "1px solid rgb(var(--success)/0.25)" }}>
                <p className="font-body text-xs text-success font-semibold">
                  {th ? "✓ เชื่อมกับผู้ปกครองแล้ว" : "✓ Linked to a parent"}
                </p>
                <button type="button" onClick={() => setUnlink(true)}
                  className="font-body text-xs font-semibold text-danger hover:underline flex-shrink-0">
                  {th ? "ยกเลิกการเชื่อม" : "Unlink"}
                </button>
              </div>
            )}
            {unlink && !newParentId && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-3"
                style={{ background: "rgb(var(--danger)/0.08)", border: "1px solid rgb(var(--danger)/0.25)" }}>
                <p className="font-body text-xs text-danger font-semibold">
                  {th ? "จะยกเลิกการเชื่อมเมื่อกดบันทึก" : "Will be unlinked on save"}
                </p>
                <button type="button" onClick={() => setUnlink(false)}
                  className="font-body text-xs font-semibold text-muted hover:underline flex-shrink-0">
                  {th ? "เลิกทำ" : "Undo"}
                </button>
              </div>
            )}

            {/* กรอกอีเมลเพื่อเชื่อม/เปลี่ยนผู้ปกครอง */}
            <label className="block font-body text-xs font-semibold text-muted mb-1.5">
              {child.parentId
                ? (th ? "เปลี่ยนผู้ปกครอง (กรอกอีเมล)" : "Change parent (enter email)")
                : (th ? "อีเมลผู้ปกครอง" : "Parent Email")}
            </label>
            <div className="relative">
              <input
                type="email"
                value={parentEmail}
                onChange={handleParentEmailChange}
                placeholder="parent@example.com"
                className={`input-base pr-10 ${
                  parentLookup === "found" ? "border-success/50 focus:ring-success/15" :
                  parentLookup === "not_found" || parentLookup === "wrong_role" ? "border-danger/50 focus:ring-danger/15" : ""
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {parentLookup === "checking" && (
                  <svg className="w-4 h-4 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {parentLookup === "found" && (
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {(parentLookup === "not_found" || parentLookup === "wrong_role") && (
                  <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {parentLookup === "found" && (
              <p className="font-body text-xs text-success mt-1">
                {th ? "✓ พบผู้ปกครอง — จะเชื่อมเมื่อกดบันทึก" : "✓ Parent found — will be linked on save"}
              </p>
            )}
            {parentLookup === "not_found" && (
              <p className="font-body text-xs text-danger mt-1">
                {th ? "ไม่พบผู้ใช้ด้วยอีเมลนี้" : "No user found with this email"}
              </p>
            )}
            {parentLookup === "wrong_role" && (
              <p className="font-body text-xs text-danger mt-1">
                {th ? "ผู้ใช้นี้ไม่ใช่ผู้ปกครอง" : "This user is not registered as a parent"}
              </p>
            )}
          </div>

          <div>
            <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
              {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
            </p>
            <textarea value={form.clinicalNotes} onChange={set("clinicalNotes")} rows={4}
              placeholder={th ? "ข้อสังเกต, อาการ, ยาที่ใช้..." : "Observations, symptoms, medications..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none font-body" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/50 flex gap-2 flex-shrink-0">
          <button onClick={handleClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/30 transition-all">
            {th ? "ยกเลิก" : "Cancel"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.3)" }}>
            {saving
              ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{th ? "กำลังบันทึก..." : "Saving..."}</>
              : (th ? "บันทึก" : "Save")}
          </button>
        </div>
      </div>
    </>
  );
}
