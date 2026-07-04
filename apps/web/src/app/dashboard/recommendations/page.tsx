"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recommendationsApi, type Recommendation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function RecommendationsPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const th = lang === "th";

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    recommendationsApi.mine()
      .then(({ data }) => setRecs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const markRead = async (rec: Recommendation) => {
    if (rec.isRead) return;
    // optimistic update — ถ้า fail ค่อยคืนค่า
    setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, isRead: true } : r));
    try {
      await recommendationsApi.markRead(rec.id);
    } catch {
      setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, isRead: false } : r));
      setReadError(true);
      setTimeout(() => setReadError(false), 3000);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  const unread = recs.filter(r => !r.isRead).length;

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-6%] w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.12] animate-aurora pointer-events-none"
        style={{ background: "rgb(var(--accent))" }} />

      <header className="sticky top-0 z-30 pl-16 lg:pl-8 pr-8 py-5 glass border-b border-border/50">
        <h1 className="font-display text-xl font-bold text-ink">{th ? "คำแนะนำจากแพทย์" : "Recommendations"}</h1>
        <p className="text-xs text-muted mt-0.5">
          {recs.length} {th ? "รายการ" : "items"}
          {unread > 0 && <span className="text-warning font-semibold"> · {unread} {th ? "ยังไม่อ่าน" : "unread"}</span>}
        </p>
      </header>

      <div className="relative z-10 p-8 space-y-4 max-w-3xl">
        {readError && (
          <div className="rounded-xl bg-danger/8 border border-danger/25 px-4 py-2.5 text-xs font-body font-semibold text-danger flex items-center gap-2 animate-rise">
            <svg className="w-4 h-4 flex-shrink-0" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {th ? "ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่" : "Could not update status, please try again"}
          </div>
        )}
        {recs.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <div className="text-5xl mb-3 animate-float-soft inline-block">💬</div>
            <p className="font-body font-semibold text-ink text-sm">
              {th ? "ยังไม่มีคำแนะนำจากแพทย์" : "No recommendations yet"}
            </p>
            <p className="font-body text-xs text-muted mt-1">
              {th ? "เมื่อแพทย์ส่งคำแนะนำ จะปรากฏที่นี่" : "Recommendations from your doctor will appear here"}
            </p>
          </div>
        ) : (
          recs.map(rec => (
            <button key={rec.id} onClick={() => markRead(rec)}
              className={`w-full text-left glass rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${
                rec.isRead ? "opacity-75" : ""
              }`}
              style={!rec.isRead ? { borderLeft: "3px solid rgb(var(--primary))" } : undefined}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🩺</span>
                <span className="font-body text-xs text-muted">
                  {new Date(rec.createdAt).toLocaleDateString(th ? "th-TH" : "en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
                {!rec.isRead ? (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {th ? "ใหม่" : "New"}
                  </span>
                ) : (
                  <span className="ml-auto text-[11px] font-body text-muted">
                    {th ? "อ่านแล้ว" : "Read"}
                  </span>
                )}
              </div>
              {rec.content ? (
                <p className="font-body text-sm text-ink leading-relaxed whitespace-pre-wrap">{rec.content}</p>
              ) : (
                <p className="font-body text-sm text-muted leading-relaxed italic">
                  {th ? "แพทย์ส่งผลการประเมินและนัดติดตามให้ท่านแล้ว" : "Your doctor sent the assessment result and a follow-up appointment."}
                </p>
              )}
              {rec.followUpDate && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: "rgb(var(--warning)/0.08)", border: "1px solid rgb(var(--warning)/0.25)" }}>
                  <span className="text-base leading-none">📅</span>
                  <div className="text-left">
                    <p className="font-body text-[11px] font-semibold text-warning leading-none">
                      {th ? "นัดติดตามครั้งถัดไป" : "Next follow-up"}
                    </p>
                    <p className="font-body text-xs font-semibold text-ink mt-0.5">
                      {new Date(rec.followUpDate).toLocaleDateString(th ? "th-TH" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                      {rec.followUpTime && <span className="text-muted font-normal"> · {rec.followUpTime} {th ? "น." : ""}</span>}
                    </p>
                  </div>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
