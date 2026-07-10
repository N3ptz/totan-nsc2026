"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Assessment } from "@/lib/api";
import { useUser } from "@/lib/user";
import { useI18n } from "@/lib/i18n";
import { AssessmentsSkeleton } from "@/components/Skeleton";

const riskConfig = {
  normal:        { label: "ปกติ",         color: "success", dot: "bg-success" },
  short_stature: { label: "เตี้ยกว่าเกณฑ์", color: "warning", dot: "bg-warning" },
  tall_stature:  { label: "สูงกว่าเกณฑ์", color: "primary", dot: "bg-primary"  },
  advanced:      { label: "อายุกระดูกมาก", color: "danger",  dot: "bg-danger"  },
  delayed:       { label: "อายุกระดูกน้อย",color: "warning", dot: "bg-warning" },
} as const;

const statusConfig = {
  pending:    { label: "รอดำเนินการ", cls: "badge-info"    },
  processing: { label: "กำลังวิเคราะห์", cls: "badge-warning" },
  completed:  { label: "เสร็จสิ้น",    cls: "badge-normal"  },
  failed:     { label: "ผิดพลาด",       cls: "badge-danger"  },
} as const;

export default function AssessmentsPage() {
  const { lang } = useI18n();
  const th = lang === "th";
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);

  // ผู้ใช้มาจาก context ของ layout — ไม่ยิง /auth/me ซ้ำ
  const { user } = useUser();
  useEffect(() => {
    if (!user) return;
    setIsDoctor(user.role === "doctor");
    setLoading(false);
  }, [user]);

  if (loading) return <AssessmentsSkeleton />;

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      {/* Ambient aurora */}
      <div className="fixed top-[-10%] right-[10%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />
      <div className="fixed bottom-[-12%] left-[24%] w-[480px] h-[480px] rounded-full blur-[150px] opacity-[0.1] animate-aurora-slow pointer-events-none"
        style={{ background: "rgb(var(--aurora-1))" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 pl-16 lg:pl-8 pr-4 sm:pr-8 py-5 glass border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{th ? "ผลการประเมิน" : "Assessments"}</h1>
            <p className="text-xs text-muted mt-0.5">{th ? "ประวัติการประเมินอายุกระดูกทั้งหมด" : "All bone age assessment history"}</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted">{th ? "กำลังโหลด..." : "Loading..."}</p>
          </div>
        ) : (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <span className="absolute inset-0 rounded-2xl animate-pulse-ring" style={{ background: "rgb(var(--primary)/0.25)" }} />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))", boxShadow: "0 10px 30px rgb(var(--primary)/0.35)" }}>
                <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4 15.3" />
                </svg>
              </div>
            </div>
            <p className="font-display font-bold text-ink text-lg">
              {th
                ? (isDoctor ? "เลือกผู้ป่วยก่อน" : "เลือกบุตรหลานก่อน")
                : (isDoctor ? "Select a patient first" : "Select a child first")}
            </p>
            <p className="text-sm text-muted mt-1 mb-5 max-w-sm mx-auto">
              {th
                ? (isDoctor
                    ? "ไปที่หน้ารายชื่อผู้ป่วยแล้วเลือกผู้ป่วยที่ต้องการดูผลการประเมิน"
                    : "ไปที่หน้าบุตรหลานแล้วเลือกเพื่อดูผลการประเมิน")
                : (isDoctor
                    ? "Go to the patients list and pick a patient to view their assessment results."
                    : "Go to your children list and pick a child to view their assessment results.")}
            </p>
            <Link href="/dashboard/patients"
              className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden"
              style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.35)" }}>
              <span className="shine relative z-10">
                {th
                  ? (isDoctor ? "ไปที่รายชื่อผู้ป่วย →" : "ไปที่บุตรหลาน →")
                  : (isDoctor ? "Go to patients →" : "Go to children →")}
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
