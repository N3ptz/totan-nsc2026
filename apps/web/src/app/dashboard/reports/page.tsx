"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, childrenApi, assessmentsApi, type Child, type Assessment } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { fmtYearsMonths } from "@/components/patient/utils";

const RISK_LABEL: Record<string, { th: string; en: string; cls: string }> = {
  normal:        { th: "ปกติ",           en: "Normal",        cls: "bg-success/10 text-success" },
  short_stature: { th: "เตี้ยกว่าเกณฑ์", en: "Short Stature", cls: "bg-warning/10 text-warning" },
  tall_stature:  { th: "สูงกว่าเกณฑ์",  en: "Tall Stature",  cls: "bg-primary/10 text-primary" },
  advanced:      { th: "อายุกระดูกมาก",  en: "Advanced",      cls: "bg-danger/10 text-danger"   },
  delayed:       { th: "อายุกระดูกน้อย", en: "Delayed",       cls: "bg-warning/10 text-warning" },
};

interface ReportRow {
  child: Child;
  assessment: Assessment;
}

export default function ReportsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const th = lang === "th";

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    (async () => {
      try {
        await authApi.me();
        const { data: kids } = await childrenApi.list();
        const results = await Promise.allSettled(kids.map(k => assessmentsApi.listByChild(k.id)));
        const all: ReportRow[] = [];
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return;
          for (const a of r.value.data) {
            if (a.status === "completed") all.push({ child: kids[i], assessment: a });
          }
        });
        all.sort((a, b) => +new Date(b.assessment.createdAt) - +new Date(a.assessment.createdAt));
        setRows(all);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-6%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--aurora-3))" }} />

      <header className="sticky top-0 z-30 pl-16 lg:pl-8 pr-8 py-5 glass border-b border-border/50">
        <h1 className="font-display text-xl font-bold text-ink">{th ? "รายงาน PDF" : "PDF Reports"}</h1>
        <p className="text-xs text-muted mt-0.5">
          {th ? "ผลการประเมินที่เสร็จสิ้น พร้อมพิมพ์เป็นรายงาน" : "Completed assessments ready to print"}
        </p>
      </header>

      <div className="relative z-10 p-8">
        {rows.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-5xl mb-3 animate-float-soft inline-block">📄</div>
            <p className="font-body font-semibold text-ink text-sm">
              {th ? "ยังไม่มีผลการประเมินที่เสร็จสิ้น" : "No completed assessments yet"}
            </p>
            <p className="font-body text-xs text-muted mt-1">
              {th ? "สร้างการประเมินจากหน้าผู้ป่วยก่อน" : "Create an assessment from a patient page first"}
            </p>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_130px_140px_130px_180px] gap-4 px-6 py-3 bg-bg2/40 border-b border-border/50 text-[11px] font-semibold text-muted uppercase tracking-wide">
              <span>{th ? "ผู้ป่วย" : "Patient"}</span>
              <span>{th ? "วันที่ตรวจ" : "Exam Date"}</span>
              <span>{th ? "อายุกระดูก" : "Bone Age"}</span>
              <span>{th ? "ผลแปล" : "Risk"}</span>
              <span></span>
            </div>
            <div className="divide-y divide-border/40">
              {rows.map(({ child, assessment: a }) => {
                const boneAge = Number(a.boneAgeMonths ?? 0);
                const risk = a.riskFlag ? RISK_LABEL[a.riskFlag] : null;
                return (
                  <div key={a.id}
                    className="grid grid-cols-[1fr_130px_140px_130px_180px] gap-4 items-center px-6 py-3.5 hover:bg-primary/[0.04] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                        style={{ background: child.sex === "M" ? "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))" }}>
                        {child.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body font-semibold text-ink text-sm truncate">{child.name}</p>
                        {a.isMock && (
                          <span className="font-body text-[10px] text-warning">{th ? "ผลจำลอง" : "Simulated"}</span>
                        )}
                      </div>
                    </div>
                    <span className="font-body text-sm text-muted">
                      {new Date(a.createdAt).toLocaleDateString(th ? "th-TH" : "en-US")}
                    </span>
                    <span className="font-body text-sm font-medium text-ink">
                      {boneAge ? fmtYearsMonths(boneAge, th) : "—"}
                    </span>
                    <span>
                      {risk && (
                        <span className={`inline-flex w-fit items-center text-[11px] font-body font-semibold px-2.5 py-1 rounded-full ${risk.cls}`}>
                          {th ? risk.th : risk.en}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/patients/${child.id}`}
                        className="text-[11px] font-body font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        {th ? "ดูประวัติ" : "History"}
                      </Link>
                      <button
                        onClick={() => window.open(`/print/${child.id}/${a.id}`, "_blank", "noopener,noreferrer")}
                        className="text-[11px] font-body font-semibold px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                        {th ? "พิมพ์รายงาน" : "Print"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
