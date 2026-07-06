"use client";

import { useEffect, useState } from "react";

/* คู่มือการใช้งานฉบับย่อบนหน้า login/register — แยกขั้นตอนตามบทบาท */
const GUIDE = {
  doctor: {
    icon: "👨‍⚕️",
    title: { th: "สำหรับแพทย์", en: "For Doctors" },
    steps: {
      th: [
        "สมัครบัญชีบทบาท “แพทย์” แล้วยืนยันรหัส OTP ที่ส่งไปทางอีเมล",
        "เพิ่มผู้ป่วยใหม่ — กรอกข้อมูลเด็กและส่วนสูงบิดา-มารดา (ใส่อีเมลผู้ปกครองเพื่อเชื่อมบัญชี หรือเชื่อมภายหลังได้ในตั้งค่าผู้ป่วย)",
        "อัปโหลดภาพ X-ray มือซ้ายของผู้ป่วย ระบบ AI จะประเมินอายุกระดูกให้อัตโนมัติ",
        "ดูผลประเมิน กราฟการเจริญเติบโต และคาดการณ์ความสูง แล้วส่งผลพร้อมวันนัดให้ผู้ปกครองทางอีเมล",
      ],
      en: [
        "Register as a “Doctor” and confirm the OTP code sent to your email",
        "Add a patient — fill in the child's details and parental heights (enter the parent's email to link accounts, or link later in patient settings)",
        "Upload a left-hand X-ray image; the AI estimates bone age automatically",
        "Review results, growth charts and height prediction, then send the report with a follow-up date to the parent by email",
      ],
    },
  },
  parent: {
    icon: "👨‍👩‍👧",
    title: { th: "สำหรับผู้ปกครอง", en: "For Parents" },
    steps: {
      th: [
        "สมัครบัญชีบทบาท “ผู้ปกครอง” แล้วยืนยันรหัส OTP ที่ส่งไปทางอีเมล",
        "แจ้งอีเมลที่สมัครให้แพทย์ประจำตัว เพื่อเชื่อมบัญชีกับข้อมูลบุตรหลาน",
        "เข้าดูผลประเมินอายุกระดูก กราฟการเจริญเติบโต และคำแนะนำจากแพทย์ได้ตลอดเวลา",
        "รับอีเมลแจ้งเตือนเมื่อแพทย์ส่งผลตรวจหรือนัดติดตามครั้งถัดไป",
      ],
      en: [
        "Register as a “Parent” and confirm the OTP code sent to your email",
        "Give your registered email to your doctor so they can link your child's records",
        "View bone-age results, growth charts and the doctor's recommendations anytime",
        "Get an email notification whenever the doctor sends results or schedules a follow-up",
      ],
    },
  },
} as const;

export function LoginHelpModal({ th, onClose }: { th: boolean; onClose: () => void }) {
  const [role, setRole] = useState<"doctor" | "parent">("doctor");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const g = GUIDE[role];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative glass-strong rounded-3xl w-full max-w-md p-7 animate-fade-up max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} aria-label={th ? "ปิด" : "Close"}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-border/40 transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="font-display text-lg font-bold text-ink mb-1">
          {th ? "คู่มือการใช้งาน" : "How to use Totan"}
        </h3>
        <p className="font-body text-xs text-muted mb-5">
          {th ? "เริ่มต้นกับโตทันใน 4 ขั้นตอน" : "Get started in 4 steps"}
        </p>

        {/* Role tabs */}
        <div className="flex gap-2 mb-5">
          {(Object.keys(GUIDE) as Array<keyof typeof GUIDE>).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-xl text-sm font-body font-semibold border transition-all ${
                role === r
                  ? "text-white border-transparent"
                  : "text-muted border-border hover:border-primary/40 hover:text-ink"
              }`}
              style={role === r
                ? { background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }
                : undefined}>
              {GUIDE[r].icon} {GUIDE[r].title[th ? "th" : "en"]}
            </button>
          ))}
        </div>

        <ol className="space-y-3">
          {g.steps[th ? "th" : "en"].map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white mt-0.5"
                style={{ background: "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }}>
                {i + 1}
              </span>
              <p className="font-body text-sm text-ink leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>

        <p className="font-body text-[11px] text-muted mt-5 leading-relaxed">
          {th
            ? "ผล AI เป็นเวอร์ชันทดลอง ใช้ประกอบการวินิจฉัยของแพทย์เท่านั้น ไม่ใช่คำวินิจฉัยทางการแพทย์"
            : "AI results are experimental and support—not replace—a physician's judgement."}
        </p>
      </div>
    </div>
  );
}
