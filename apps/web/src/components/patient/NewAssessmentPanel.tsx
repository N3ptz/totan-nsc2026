"use client";

import { useState, useRef } from "react";
import { assessmentsApi, type Child, type Assessment } from "@/lib/api";

export function NewAssessmentPanel({
  child, onClose, onSaved, lang,
}: {
  child: Child; onClose: () => void; onSaved: (a: Assessment) => void; lang: string;
}) {
  const th = lang === "th";
  const [form, setForm] = useState({ heightCm: "", weightKg: "", clinicalNotes: "" });
  const [saving, setSaving] = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [xrayPreview, setXrayPreview] = useState<string | null>(null);
  const [xrayFile, setXrayFile] = useState<File | null>(null);
  const [exiting, setExiting] = useState(false);
  const handleClose = () => { setExiting(true); setTimeout(onClose, 260); };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setXrayFile(file);
    setXrayPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!xrayFile) { setError(th ? "กรุณาเลือกภาพ X-ray" : "Please select an X-ray image"); return; }
    setSaving(true); setError("");
    try {
      setSavingStep(th ? "กำลังอัปโหลดภาพ..." : "Uploading image...");
      const { data: uploaded } = await assessmentsApi.uploadXray(xrayFile);

      setSavingStep(th ? "กำลังบันทึก..." : "Saving...");
      const { data } = await assessmentsApi.create({
        childId: child.id,
        xrayImageUrl: uploaded.xrayImageUrl,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        clinicalNotes: form.clinicalNotes || undefined,
      });
      onSaved(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? (th ? "เกิดข้อผิดพลาด" : "Something went wrong"));
    } finally {
      setSaving(false);
      setSavingStep("");
    }
  };

  return (
    <>
      <div className={`panel-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]${exiting ? " panel-backdrop--out" : ""}`} onClick={handleClose} />

      <div data-side-panel className={`panel-sheet fixed right-0 top-0 bottom-0 z-50 w-full max-w-md glass-strong border-l border-border/60 flex flex-col overflow-hidden${exiting ? " panel-sheet--out" : ""}`}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
          <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-border/40 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div>
            <h3 className="font-display text-base font-bold text-ink">{th ? "สร้างการประเมินใหม่" : "New Assessment"}</h3>
            <p className="font-body text-xs text-muted">{child.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm font-body text-danger"
              style={{ background: "rgb(var(--danger)/0.1)", border: "1px solid rgb(var(--danger)/0.2)" }}>
              {error}
            </div>
          )}

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
                <img src={xrayPreview} alt="X-ray preview" className="w-full h-48 object-contain bg-ink/20 rounded-2xl" />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                {th ? "ส่วนสูง (cm)" : "Height (cm)"}
              </label>
              <input type="number" min="30" max="250" step="0.1" value={form.heightCm} onChange={set("heightCm")}
                placeholder={child.heightCm ? String(child.heightCm) : "120.0"} className="input-base" />
            </div>
            <div>
              <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                {th ? "น้ำหนัก (kg)" : "Weight (kg)"}
              </label>
              <input type="number" min="1" max="200" step="0.1" value={form.weightKg} onChange={set("weightKg")}
                placeholder={child.weightKg ? String(child.weightKg) : "25.0"} className="input-base" />
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
              {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
            </label>
            <textarea value={form.clinicalNotes} onChange={set("clinicalNotes")} rows={3}
              placeholder={th ? "ข้อสังเกต, อาการ, ยาที่ใช้..." : "Observations, symptoms, medications..."}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none font-body" />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-border/50 flex gap-3 flex-shrink-0">
          <button onClick={handleClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/30 transition-all disabled:opacity-40">
            {th ? "ยกเลิก" : "Cancel"}
          </button>
          <button onClick={handleSubmit as any} disabled={saving}
            className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.3)" }}>
            {saving ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{savingStep || (th ? "กำลังบันทึก..." : "Saving...")}</>
            ) : (
              <>{th ? "ส่งประเมิน AI →" : "Submit for AI Analysis →"}</>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
