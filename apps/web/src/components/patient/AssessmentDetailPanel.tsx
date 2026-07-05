"use client";

import { useState, useEffect } from "react";
import { assessmentsApi, type Assessment, type Child } from "@/lib/api";
import { RISK_LABEL } from "./utils";
import { classifyBoneAge } from "@/lib/boneAgeClassification";
import { classifyFahVsTargetHeight } from "@/lib/fahTargetHeight";

export function AssessmentDetailPanel({
  assessment, child, chronAgeMonths, onClose, onUpdated, lang, isDoctor,
}: {
  assessment: Assessment; child: Child; chronAgeMonths: number; onClose: () => void; onUpdated?: (a: Assessment) => void; lang: string; isDoctor: boolean;
}) {
  const th = lang === "th";
  const boneAge = Number(assessment.boneAgeMonths ?? 0);
  const deviation = boneAge - chronAgeMonths;
  const isMock = !assessment.heatmapUrl || assessment.heatmapUrl.startsWith("mock://");
  const growthPattern = boneAge > 0 ? classifyBoneAge(boneAge, chronAgeMonths) : null;
  const fahVsTh = assessment.finalAdultHeightCm && assessment.targetHeightCm
    ? classifyFahVsTargetHeight(Number(assessment.finalAdultHeightCm), Number(assessment.targetHeightCm))
    : null;

  const completed = assessment.status === "completed";
  const [notifiedAt, setNotifiedAt] = useState<string | null>(assessment.parentNotifiedAt ?? null);
  const [editing, setEditing] = useState(!assessment.parentNotifiedAt);
  const [fuDate, setFuDate] = useState(
    assessment.nextFollowupDate ? String(assessment.nextFollowupDate).slice(0, 10) : "",
  );
  const [fuTime, setFuTime] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sent" | "error">("idle");

  useEffect(() => {
    if (sendStatus !== "sent") return;
    const t = setTimeout(() => setSendStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [sendStatus]);

  const fmtSentAt = (s: string) =>
    new Date(s).toLocaleString(th ? "th-TH" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const sendToParent = async () => {
    if (!fuDate || !child.parentId) return;
    setSending(true); setSendStatus("idle");
    try {
      const { data } = await assessmentsApi.notifyParent(assessment.id, {
        followUpDate: fuDate,
        followUpTime: fuTime || undefined,
        note: note.trim() || undefined,
      });
      setNotifiedAt(data?.parentNotifiedAt ?? new Date().toISOString());
      setEditing(false);
      setSendStatus("sent");
      if (data) onUpdated?.(data);
    } catch {
      setSendStatus("error");
    } finally {
      setSending(false);
    }
  };

  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: th ? "อายุกระดูก" : "Bone Age",
      value: `${Math.floor(Math.round(boneAge) / 12)} ${th ? "ปี" : "y"} ${Math.round(boneAge) % 12} ${th ? "เดือน" : "m"}`, highlight: true },
    { label: th ? "ส่วนเบี่ยงเบน" : "Deviation",
      value: `${deviation >= 0 ? "+" : ""}${Math.round(deviation)} ${th ? "เดือน" : "mo"}` },
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
    { label: th ? "ส่วนสูงที่AIพยากรณ์ (FAH)" : "Final Adult Height",
      value: assessment.finalAdultHeightCm ? `${assessment.finalAdultHeightCm} cm` : "—", highlight: true },
    { label: th ? "ส่วนสูงเป้าหมาย (TH)" : "Target Height",
      value: assessment.targetHeightCm ? `${assessment.targetHeightCm} cm` : "—" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-full sm:max-w-lg glass-strong border-l border-border/60 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 flex-shrink-0">
          <button onClick={onClose}
            aria-label={lang === "th" ? "ปิดรายละเอียด" : "Close detail panel"}
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
          {assessment.isMock && (
            <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning flex-shrink-0">
              {th ? "ผลจำลอง" : "Simulated"}
            </span>
          )}
          {!assessment.isMock && assessment.aiProvider === "external_demo" && (
            <span
              className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent flex-shrink-0"
              title={th
                ? "อายุกระดูกมาจากโมเดล demo ของบุคคลที่สาม ยังไม่ผ่านการตรวจสอบความแม่นยำทางคลินิก"
                : "Bone age from a third-party demo model, not clinically validated"}
            >
              {th ? "AI ทดลอง (Demo ภายนอก)" : "Experimental AI (3rd-party demo)"}
            </span>
          )}
          {assessment.riskFlag && RISK_LABEL[assessment.riskFlag] && (
            <span className={`text-[11px] font-body font-semibold px-2.5 py-1 rounded-full ${RISK_LABEL[assessment.riskFlag].cls} flex-shrink-0`}>
              {th ? RISK_LABEL[assessment.riskFlag].th : RISK_LABEL[assessment.riskFlag].en}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Processing / pending state — show to everyone while AI is working */}
          {!completed && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-5 flex flex-col items-center gap-3 text-center">
              <div
                role="status"
                aria-live="polite"
                aria-label={th ? "AI กำลังวิเคราะห์ภาพ X-ray" : "AI is analysing the X-ray"}
                className="w-10 h-10 border-2 border-warning border-t-transparent rounded-full animate-spin"
              />
              <p className="font-body text-sm font-semibold text-warning">
                {th ? "AI กำลังวิเคราะห์ภาพ X-ray อยู่…" : "AI is analysing the X-ray…"}
              </p>
              <p className="font-body text-xs text-muted">
                {th ? "ผลการประเมินจะปรากฏที่นี่เมื่อ AI วิเคราะห์เสร็จสิ้น" : "Results will appear here once the AI analysis is complete."}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                {th ? "ภาพ X-ray" : "X-ray Image"}
              </p>
              <div className="rounded-xl overflow-hidden bg-ink/20 aspect-square flex items-center justify-center border border-border/30">
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

            {/* Heatmap — only show when completed */}
            {completed && (
              <div className="space-y-1.5">
                <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                  {th ? "Heatmap (Grad-CAM)" : "Heatmap (Grad-CAM)"}
                </p>
                <div className="rounded-xl overflow-hidden aspect-square flex items-center justify-center border border-border/30 relative"
                  style={{ background: isMock ? "linear-gradient(135deg,#0a0a14,#111)" : "black" }}>
                  {isMock ? (
                    <>
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
            )}
          </div>

          {/* Detailed metrics — only show when completed */}
          {completed && (
            <div className="rounded-xl border border-border/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/40" style={{ background: "rgb(var(--surface))" }}>
                <p className="font-display text-xs font-bold text-ink">
                  {th ? "ข้อมูลเชิงลึก" : "Detailed Metrics"}
                </p>
              </div>
              <div className="divide-y divide-border/30">
                {rows.filter(r => r.value !== "—").map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2.5 hover:bg-primary/[0.02]">
                    <span className="font-body text-xs text-muted">{row.label}</span>
                    <span className={`font-body text-xs font-semibold tabular-nums ${row.highlight ? "text-primary" : "text-ink"}`}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growth pattern (BA vs CA) — clinical interpretation, see lib/boneAgeClassification.ts for sources */}
          {completed && growthPattern && (
            <div className={`rounded-xl border p-4 ${growthPattern.cls} border-current/20`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="font-display text-xs font-bold">
                  {th ? growthPattern.label.th : growthPattern.label.en}
                </p>
                <span className="font-body text-[11px] font-semibold tabular-nums flex-shrink-0">
                  {growthPattern.deviationMonths >= 0 ? "+" : ""}{growthPattern.deviationMonths} {th ? "เดือน" : "mo"}
                </span>
              </div>
              <p className="font-body text-[11px] leading-relaxed opacity-90">
                {th ? growthPattern.advice.th : growthPattern.advice.en}
              </p>
            </div>
          )}

          {/* FAH vs Target Height — clinical interpretation, see lib/fahTargetHeight.ts for sources */}
          {completed && fahVsTh && (
            <div className={`rounded-xl border p-4 ${fahVsTh.cls} border-current/20`}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <p className="font-display text-xs font-bold">
                  {th ? fahVsTh.label.th : fahVsTh.label.en}
                </p>
                <span className="font-body text-[11px] font-semibold tabular-nums flex-shrink-0">
                  {fahVsTh.diffCm >= 0 ? "+" : ""}{fahVsTh.diffCm} cm
                </span>
              </div>
              <p className="font-body text-[11px] leading-relaxed opacity-90">
                {th ? fahVsTh.advice.th : fahVsTh.advice.en}
              </p>
            </div>
          )}

          {assessment.clinicalNotes && (
            <div className="rounded-xl border border-border/40 p-4 space-y-1">
              <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                {th ? "หมายเหตุทางคลินิก" : "Clinical Notes"}
              </p>
              <p className="font-body text-sm text-ink leading-relaxed">{assessment.clinicalNotes}</p>
            </div>
          )}

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

          {isDoctor && (
            <div className="rounded-xl border border-border/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                  {th ? "ส่งผลให้ผู้ปกครอง" : "Notify Parent"}
                </p>
              </div>

              {!child.parentId ? (
                <p className="font-body text-xs text-muted">
                  {th
                    ? "เด็กคนนี้ยังไม่ได้ผูกบัญชีผู้ปกครอง — เพิ่มอีเมลผู้ปกครองได้ที่ตั้งค่าข้อมูลผู้ป่วย"
                    : "No parent account linked yet — add the parent's email in patient settings."}
                </p>
              ) : !completed ? (
                <p className="font-body text-xs text-muted">
                  {th
                    ? "ผลการประเมินยังไม่เสร็จ — รอ AI วิเคราะห์ให้เสร็จก่อนจึงจะส่งได้"
                    : "Assessment not completed yet — wait for the AI result before sending."}
                </p>
              ) : notifiedAt && !editing ? (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <p className="font-body text-xs font-semibold text-success">
                      {th ? "ส่งผล + คำแนะนำให้ผู้ปกครองแล้ว" : "Result + recommendation sent"}
                    </p>
                  </div>
                  <p className="font-body text-[11px] text-muted">
                    {th ? "ส่งล่าสุดเมื่อ " : "Last sent "}{fmtSentAt(notifiedAt)}
                  </p>
                  <p className="font-body text-[11px] text-muted">
                    {th ? "ผู้ปกครองได้รับอีเมล และอ่านคำแนะนำได้ในแอป (เมนูคำแนะนำจากแพทย์)" : "Parent was emailed and can read it in their app (Recommendations)."}
                  </p>
                  <button
                    onClick={() => { setEditing(true); setSendStatus("idle"); }}
                    className="inline-flex items-center gap-1 text-[11px] font-body font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                    {th ? "แก้ไข / ส่งใหม่" : "Edit / Resend"}
                  </button>
                </div>
              ) : (
                <>
                  {notifiedAt && (
                    <p className="font-body text-[11px] text-warning">
                      {th ? "กำลังแก้ไขเพื่อส่งใหม่ — ส่งล่าสุดเมื่อ " : "Editing to resend — last sent "}{fmtSentAt(notifiedAt)}
                    </p>
                  )}
                  <p className="font-body text-xs text-muted leading-relaxed">
                    {th
                      ? "ระบบจะรวบรวมผลการประเมิน (อายุกระดูก ส่วนสูง การแปลผล) พร้อมวันนัดติดตาม ส่งเป็นอีเมล และบันทึกคำแนะนำให้ผู้ปกครองอ่านในแอป (เมนูคำแนะนำจากแพทย์)"
                      : "The assessment summary and follow-up date are emailed to the parent, and your recommendation is saved to their app (Recommendations menu)."}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-body text-[11px] font-semibold text-ink">
                        {th ? "วันนัดติดตาม *" : "Follow-up date *"}
                      </label>
                      <input
                        type="date" value={fuDate}
                        onChange={(e) => { setFuDate(e.target.value); setSendStatus("idle"); }}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 font-body"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[11px] font-semibold text-ink">
                        {th ? "เวลา (ไม่บังคับ)" : "Time (optional)"}
                      </label>
                      <input
                        type="time" value={fuTime}
                        onChange={(e) => { setFuTime(e.target.value); setSendStatus("idle"); }}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 font-body"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-body text-[11px] font-semibold text-ink">
                      {th ? "คำแนะนำถึงผู้ปกครอง (ไม่บังคับ)" : "Recommendation to parent (optional)"}
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => { setNote(e.target.value); setSendStatus("idle"); }}
                      rows={3}
                      placeholder={th ? "เช่น โภชนาการ การออกกำลังกาย การนอน หรือสิ่งที่ควรสังเกต..." : "e.g. nutrition, exercise, sleep, things to watch for..."}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all placeholder:text-muted/40 focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none font-body"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      {sendStatus === "sent" && (
                        <span className="font-body text-xs text-success">
                          {th ? "✓ ส่งให้ผู้ปกครองแล้ว" : "✓ Sent to parent"}
                        </span>
                      )}
                      {sendStatus === "error" && (
                        <span className="font-body text-xs text-danger">
                          {th ? "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง" : "Failed to send, please retry"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {notifiedAt && (
                        <button
                          onClick={() => { setEditing(false); setSendStatus("idle"); }}
                          className="px-3 py-2 rounded-xl text-xs font-body font-semibold text-muted hover:text-ink hover:bg-border/40 transition-colors">
                          {th ? "ยกเลิก" : "Cancel"}
                        </button>
                      )}
                      <button
                        onClick={sendToParent}
                        disabled={sending || !fuDate}
                        className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                        style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }}>
                        {sending
                          ? (th ? "กำลังส่ง..." : "Sending...")
                          : notifiedAt
                            ? (th ? "ส่งใหม่อีกครั้ง" : "Resend")
                            : (th ? "ส่งผล + วันนัดให้ผู้ปกครอง" : "Send to parent")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
