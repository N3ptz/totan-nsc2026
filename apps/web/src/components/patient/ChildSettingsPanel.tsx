"use client";

import { useState } from "react";
import { childrenApi, type Child } from "@/lib/api";

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
