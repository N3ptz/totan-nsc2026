"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { childrenApi, authApi, type Child } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { targetHeightCm } from "@/components/patient/utils";

export default function NewPatientPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const th = lang === "th";

  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Child | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    dateOfBirth: "",
    sex: "" as "M" | "F" | "",
    ethnicity: "Asian",
    heightCm: "",
    weightKg: "",
    fatherHeightCm: "",
    motherHeightCm: "",
    clinicalNotes: "",
    parentEmail: "",
  });

  const [parentLookup, setParentLookup] = useState<
    "idle" | "checking" | "found" | "not_found" | "wrong_role"
  >("idle");
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleParentEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setForm(f => ({ ...f, parentEmail: email }));
    setParentId(undefined);

    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (!email) { setParentLookup("idle"); return; }

    setParentLookup("checking");
    lookupTimer.current = setTimeout(async () => {
      try {
        const { data } = await authApi.findByEmail(email);
        if (!data) { setParentLookup("not_found"); return; }
        if (data.role !== "parent") { setParentLookup("wrong_role"); return; }
        setParentId(data.id);
        setParentLookup("found");
      } catch {
        setParentLookup("not_found");
      }
    }, 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sex) { setError(th ? "กรุณาเลือกเพศ" : "Please select sex"); return; }
    if (!form.fatherHeightCm || !form.motherHeightCm) {
      setError(th ? "กรุณากรอกส่วนสูงบิดาและมารดา" : "Please enter both parent heights");
      return;
    }
    setSaving(true); setError("");
    try {
      const { data } = await childrenApi.create({
        name: form.name,
        dateOfBirth: form.dateOfBirth,
        sex: form.sex as "M" | "F",
        parentId: parentId as any,
        ethnicity: form.ethnicity || "Asian",
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        fatherHeightCm: Number(form.fatherHeightCm),
        motherHeightCm: Number(form.motherHeightCm),
        clinicalNotes: form.clinicalNotes || undefined,
      });
      setCreated(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? (th ? "เกิดข้อผิดพลาด" : "Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  /* ── Success state ── */
  if (created) {
    return (
      <div className="min-h-screen bg-bg relative overflow-hidden">
        <div className="fixed top-[-10%] right-[-6%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-[0.12] animate-aurora pointer-events-none"
          style={{ background: "rgb(var(--aurora-5))" }} />

        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="glass-strong rounded-3xl p-10 w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white text-2xl"
              style={{ background: "linear-gradient(135deg,rgb(var(--aurora-5)),rgb(var(--aurora-1)))", boxShadow: "0 10px 30px rgb(var(--success)/0.3)" }}>
              ✓
            </div>
            <h2 className="font-display text-xl font-bold text-ink mb-1">
              {th ? "เพิ่มผู้ป่วยสำเร็จ" : "Patient Added"}
            </h2>
            <p className="font-body text-sm text-muted mb-6">
              {th ? `${created.name} ถูกบันทึกในระบบแล้ว` : `${created.name} has been saved.`}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => { setCreated(null); setForm({ name: "", dateOfBirth: "", sex: "", ethnicity: "Asian", heightCm: "", weightKg: "", fatherHeightCm: "", motherHeightCm: "", clinicalNotes: "", parentEmail: "" }); setParentId(undefined); setParentLookup("idle"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold border border-border text-muted hover:bg-border/30 transition-all">
                {th ? "+ เพิ่มอีก" : "+ Add Another"}
              </button>
              <Link href="/dashboard/patients"
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-white text-center transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }}>
                {th ? "ดูรายชื่อ →" : "View List →"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ── */
  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed top-[-10%] right-[-6%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-1))" }} />
      <div className="fixed bottom-[-10%] left-[20%] w-[480px] h-[480px] rounded-full blur-[150px] opacity-[0.09] animate-aurora-slow pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 pl-16 lg:pl-8 pr-8 py-5 glass border-b border-border/50">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/patients"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:border-border/80 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">
              {th ? "เพิ่มผู้ป่วยใหม่" : "Add New Patient"}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {th ? "กรอกข้อมูลพื้นฐานของผู้ป่วย" : "Enter patient's basic information"}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="relative z-10 p-8">

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-body mb-5"
            style={{ background: "rgb(var(--danger)/0.1)", color: "rgb(var(--danger))", border: "1px solid rgb(var(--danger)/0.25)" }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── 2-column grid ── */}
        <div className="grid grid-cols-2 gap-6 items-stretch">

          {/* ── คอลัมน์ซ้าย: ข้อมูลพื้นฐาน ── */}
          <section className="glass rounded-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgb(var(--primary)/0.12)" }}>
                <svg style={{ width: 16, height: 16, color: "rgb(var(--primary))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h2 className="font-display text-sm font-bold text-ink">
                {th ? "ข้อมูลพื้นฐาน" : "Basic Information"}
              </h2>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {/* ชื่อ */}
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  {th ? "ชื่อ-นามสกุล" : "Full Name"} <span className="text-danger">*</span>
                </label>
                <input required value={form.name} onChange={set("name")}
                  placeholder={th ? "เด็กชายสมชาย ใจดี" : "John Smith"}
                  className="input-base" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                    {th ? "วันเกิด" : "Date of Birth"} <span className="text-danger">*</span>
                  </label>
                  <input required type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")}
                    max={new Date().toISOString().split("T")[0]}
                    className="input-base" />
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                    {th ? "เพศ" : "Sex"} <span className="text-danger">*</span>
                  </label>
                  <div className="flex gap-2 h-[46px]">
                    {(["M", "F"] as const).map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(f => ({ ...f, sex: s }))}
                        className={`flex-1 rounded-xl border text-sm font-body font-semibold transition-all ${
                          form.sex === s ? "text-white border-transparent" : "text-muted border-border hover:border-primary/40 hover:text-ink"
                        }`}
                        style={form.sex === s ? {
                          background: s === "M"
                            ? "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))"
                            : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))"
                        } : undefined}>
                        {s === "M" ? (th ? "♂ ชาย" : "♂ Male") : (th ? "♀ หญิง" : "♀ Female")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                    {th ? "ส่วนสูง (ซม.)" : "Height (cm)"}
                  </label>
                  <input type="number" min="30" max="250" step="0.1"
                    value={form.heightCm} onChange={set("heightCm")}
                    placeholder="120.0" className="input-base" />
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                    {th ? "น้ำหนัก (กก.)" : "Weight (kg)"}
                  </label>
                  <input type="number" min="1" max="200" step="0.1"
                    value={form.weightKg} onChange={set("weightKg")}
                    placeholder="25.0" className="input-base" />
                </div>
              </div>

              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  {th ? "เชื้อชาติ" : "Ethnicity"}
                </label>
                <select value={form.ethnicity} onChange={set("ethnicity")} className="input-base">
                  <option value="Asian">{th ? "เอเชีย" : "Asian"}</option>
                  <option value="Caucasian">{th ? "คอเคเชียน" : "Caucasian"}</option>
                  <option value="African_American">{th ? "แอฟริกัน-อเมริกัน" : "African American"}</option>
                  <option value="Hispanic">{th ? "ฮิสแปนิก" : "Hispanic"}</option>
                  <option value="Other">{th ? "อื่นๆ" : "Other"}</option>
                </select>
              </div>

              {/* Parent email lookup */}
              <div>
                <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                  {th ? "อีเมลผู้ปกครอง" : "Parent Email"}
                  <span className="ml-2 normal-case text-[10px] font-normal text-muted/60">
                    {th ? "ไม่บังคับ — link ทันที" : "Optional — auto-link"}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={form.parentEmail}
                    onChange={handleParentEmailChange}
                    placeholder={th ? "parent@example.com" : "parent@example.com"}
                    className={`input-base pr-10 ${
                      parentLookup === "found" ? "border-success/50 focus:ring-success/15" :
                      parentLookup === "not_found" || parentLookup === "wrong_role" ? "border-danger/50 focus:ring-danger/15" : ""
                    }`}
                  />
                  {/* Status indicator */}
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
                {/* Feedback message */}
                {parentLookup === "found" && (
                  <p className="font-body text-xs text-success mt-1">
                    {th ? "✓ พบผู้ปกครอง — จะ link อัตโนมัติหลังบันทึก" : "✓ Parent found — will be linked on save"}
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

            </div>
          </section>

          {/* ── คอลัมน์ขวา: ส่วนสูงพ่อแม่ + หมายเหตุ ── */}
          <div className="flex flex-col gap-5">

            {/* ส่วนสูงบิดา-มารดา */}
            <section className="glass rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgb(var(--accent)/0.12)" }}>
                  <svg style={{ width: 16, height: 16, color: "rgb(var(--accent))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-ink">
                    {th ? "ส่วนสูงบิดา-มารดา" : "Parental Height"}
                  </h2>
                  <p className="font-body text-[11px] text-muted">
                    {th ? "ใช้คำนวณ Target Height" : "Used to calculate target height"}
                    <span className="ml-1 text-danger font-semibold">*</span>
                  </p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                      {th ? "ส่วนสูงบิดา (ซม.)" : "Father Ht. (cm)"}
                      <span className="ml-1 text-danger">*</span>
                    </label>
                    <input type="number" min="100" max="250" step="0.1"
                      value={form.fatherHeightCm} onChange={set("fatherHeightCm")}
                      placeholder="170.0" className="input-base" />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted mb-1.5 uppercase tracking-wide">
                      {th ? "ส่วนสูงมารดา (ซม.)" : "Mother Ht. (cm)"}
                      <span className="ml-1 text-danger">*</span>
                    </label>
                    <input type="number" min="100" max="250" step="0.1"
                      value={form.motherHeightCm} onChange={set("motherHeightCm")}
                      placeholder="158.0" className="input-base" />
                  </div>
                </div>

                {/* Target height preview */}
                {form.fatherHeightCm && form.motherHeightCm && form.sex && (
                  <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "rgb(var(--primary)/0.08)", border: "1px solid rgb(var(--primary)/0.2)" }}>
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="font-body text-[11px] text-primary font-semibold">
                        {th ? "Target Height (Tanner-Whitehouse)" : "Target Height (Tanner-Whitehouse)"}
                      </p>
                      <p className="font-display text-base font-bold text-ink">
                        {targetHeightCm(form.sex, form.fatherHeightCm, form.motherHeightCm)?.toFixed(1)} cm
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* หมายเหตุทางคลินิก */}
            <section className="glass rounded-2xl overflow-hidden flex flex-col flex-1">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgb(var(--warning)/0.12)" }}>
                  <svg style={{ width: 16, height: 16, color: "rgb(var(--warning))" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-sm font-bold text-ink">
                    {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
                  </h2>
                  <p className="font-body text-[11px] text-muted">
                    {th ? "ไม่บังคับ" : "Optional"}
                  </p>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <textarea
                  value={form.clinicalNotes}
                  onChange={set("clinicalNotes")}
                  placeholder={th ? "ประวัติโรคประจำตัว, ยาที่ใช้, อาการที่พบ..." : "Medical history, medications, presenting symptoms..."}
                  className="flex-1 w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none font-body min-h-[120px]"
                />
              </div>
            </section>

          </div>
        </div>

        {/* ── Submit — outside grid, centered ── */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/dashboard/patients"
            className="px-8 py-3 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/30 transition-all">
            {th ? "ยกเลิก" : "Cancel"}
          </Link>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-10 py-3 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:translate-y-0"
            style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 20px rgb(var(--primary)/0.35)" }}>
            {saving ? (
              <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{th ? "กำลังบันทึก..." : "Saving..."}</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{th ? "บันทึกผู้ป่วย" : "Save Patient"}</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
