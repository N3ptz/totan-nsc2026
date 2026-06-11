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

      <header className="sticky top-0 z-30 px-8 py-5 glass border-b border-border/50">
        <h1 className="font-display text-xl font-bold text-ink">{th ? "คำแนะนำจากแพทย์" : "Recommendations"}</h1>
        <p className="text-xs text-muted mt-0.5">
          {recs.length} {th ? "รายการ" : "items"}
          {unread > 0 && <span className="text-warning font-semibold"> · {unread} {th ? "ยังไม่อ่าน" : "unread"}</span>}
        </p>
      </header>

      <div className="relative z-10 p-8 space-y-4 max-w-3xl">
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
              <p className="font-body text-sm text-ink leading-relaxed whitespace-pre-wrap">{rec.content}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
