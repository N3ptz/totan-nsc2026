"use client";

import { useState, useEffect } from "react";
import { assessmentsApi, type Assessment, type Child } from "@/lib/api";
import { fmtYearsMonths, RISK_LABEL } from "./utils";
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
  // ผลจริงที่อัปโหลด heatmap ล้มเหลว (heatmapUrl = null) ต้องไม่ถูกป้ายว่า "จำลอง" —
  // ความเป็น mock ใช้ assessment.isMock จาก server เท่านั้น
  const hasHeatmap = !!assessment.heatmapUrl && !assessment.heatmapUrl.startsWith("mock://");
  const growthPattern = boneAge > 0 ? classifyBoneAge(boneAge, chronAgeMonths) : null;
  const fahVsTh = assessment.finalAdultHeightCm && assessment.targetHeightCm
    ? classifyFahVsTargetHeight(Number(assessment.finalAdultHeightCm), Number(assessment.targetHeightCm))
    : null;

  // ค่าดิบจาก AI เทียบค่าที่แพทย์ปรับ — โชว์เฉพาะ field ที่ต่างกันจริง (ฝั่งแพทย์เท่านั้น)
  const edited = !!assessment.resultEditedAt;
  const aiDiff = {
    boneAge: edited && assessment.aiBoneAgeMonths != null
      && Math.round(Number(assessment.aiBoneAgeMonths)) !== Math.round(Number(assessment.boneAgeMonths ?? NaN)),
    fah: edited && assessment.aiFinalAdultHeightCm != null
      && Number(assessment.aiFinalAdultHeightCm) !== Number(assessment.finalAdultHeightCm ?? NaN),
    risk: edited && !!assessment.aiRiskFlag && assessment.aiRiskFlag !== assessment.riskFlag,
  };
  const anyAiDiff = aiDiff.boneAge || aiDiff.fah || aiDiff.risk;

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

  // ── แพทย์ตรวจทาน/ปรับผล AI ก่อนส่งให้ผู้ปกครอง ──
  const [editingResult, setEditingResult] = useState(false);
  const [baYears, setBaYears] = useState("");
  const [baMonthsRem, setBaMonthsRem] = useState("");
  const [fah, setFah] = useState("");
  const [risk, setRisk] = useState("");
  const [savingResult, setSavingResult] = useState(false);
  const [resultStatus, setResultStatus] = useState<"idle" | "saved" | "error">("idle");
  const [resultErrMsg, setResultErrMsg] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (sendStatus !== "sent") return;
    const t = setTimeout(() => setSendStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [sendStatus]);

  useEffect(() => {
    if (resultStatus !== "saved") return;
    const t = setTimeout(() => setResultStatus("idle"), 3000);
    return () => clearTimeout(t);
  }, [resultStatus]);

  const openResultEditor = () => {
    const m = Math.round(Number(assessment.boneAgeMonths ?? 0));
    setBaYears(String(Math.floor(m / 12)));
    setBaMonthsRem(String(m % 12));
    setFah(assessment.finalAdultHeightCm ? String(assessment.finalAdultHeightCm) : "");
    setRisk(assessment.riskFlag ?? "");
    setResultStatus("idle");
    setEditingResult(true);
  };

  const saveResult = async () => {
    const months = (Number(baYears) || 0) * 12 + (Number(baMonthsRem) || 0);
    setSavingResult(true); setResultStatus("idle"); setResultErrMsg(null);
    try {
      const { data } = await assessmentsApi.updateResult(assessment.id, {
        boneAgeMonths: months,
        ...(fah ? { finalAdultHeightCm: Number(fah) } : {}),
        ...(risk ? { riskFlag: risk as Assessment["riskFlag"] } : {}),
      });
      setEditingResult(false);
      setResultStatus("saved");
      if (data) onUpdated?.(data);
    } catch (e: any) {
      // โชว์สาเหตุจริงจาก server (เช่น validation ช่วงค่า) — ไม่งั้นแพทย์เดาไม่ถูกว่าพลาดตรงไหน
      const msg = e?.response?.data?.message;
      setResultErrMsg(Array.isArray(msg) ? msg.join(" · ") : msg || null);
      setResultStatus("error");
    } finally {
      setSavingResult(false);
    }
  };

  // แพทย์เห็นด้วยกับผล AI — ยืนยันตามเดิมโดยไม่แก้ค่า (ติดป้าย "แพทย์ตรวจสอบแล้ว")
  const confirmReview = async () => {
    setReviewing(true); setResultStatus("idle"); setResultErrMsg(null);
    try {
      const { data } = await assessmentsApi.markReviewed(assessment.id);
      if (data) onUpdated?.(data);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setResultErrMsg(Array.isArray(msg) ? msg.join(" · ") : msg || null);
      setResultStatus("error");
    } finally {
      setReviewing(false);
    }
  };

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

  const rows: { label: string; value: string; highlight?: boolean; sub?: string }[] = [
    { label: th ? "อายุกระดูก" : "Bone Age",
      value: fmtYearsMonths(boneAge, th), highlight: true,
      sub: isDoctor && aiDiff.boneAge
        ? `${th ? "AI ให้" : "AI"}: ${fmtYearsMonths(Number(assessment.aiBoneAgeMonths), th)}` : undefined },
    { label: th ? "ส่วนเบี่ยงเบน" : "Deviation",
      value: `${deviation >= 0 ? "+" : ""}${Math.round(deviation)} ${th ? "เดือน" : "mo"}` },
    { label: th ? "ความมั่นใจ AI" : "AI Confidence",
      // ตัวเลขความมั่นใจของโมเดลเป็นข้อมูลภายในสำหรับแพทย์ — ค่า "—" จะถูกกรองออกจากตาราง
      value: isDoctor && assessment.confidence ? `${Math.round(Number(assessment.confidence) * 100)}%` : "—" },
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
      value: assessment.finalAdultHeightCm ? `${assessment.finalAdultHeightCm} cm` : "—", highlight: true,
      sub: isDoctor && aiDiff.fah
        ? `${th ? "AI ให้" : "AI"}: ${assessment.aiFinalAdultHeightCm} cm` : undefined },
    { label: th ? "ส่วนสูงเป้าหมาย (TH)" : "Target Height",
      value: assessment.targetHeightCm ? `${assessment.targetHeightCm} cm` : "—" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div data-side-panel className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-full sm:max-w-lg glass-strong border-l border-border/60 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border/50 flex-shrink-0">
          <button onClick={onClose}
            data-tour="panel-close"
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
          {/* ป้ายสถานะระบบ (mock/experimental/ปรับผล) เป็นเรื่องภายใน — เห็นเฉพาะแพทย์ */}
          {isDoctor && assessment.isMock && (
            <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning flex-shrink-0">
              {th ? "ผลจำลอง" : "Simulated"}
            </span>
          )}
          {assessment.riskFlag && RISK_LABEL[assessment.riskFlag] && (
            <span className={`text-[11px] font-body font-semibold px-2.5 py-1 rounded-full ${RISK_LABEL[assessment.riskFlag].cls} flex-shrink-0`}>
              {th ? RISK_LABEL[assessment.riskFlag].th : RISK_LABEL[assessment.riskFlag].en}
            </span>
          )}
          {/* สถานะการรีวิวของแพทย์ (โชว์ทุกคน) — รีวิวแล้วติด "ตรวจสอบแล้ว" เสมอ, มีแก้ค่าติด "ปรับผลแล้ว" เพิ่ม */}
          {assessment.reviewedAt && (
            <span
              className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success flex-shrink-0"
              title={th ? "แพทย์ตรวจสอบผลนี้แล้ว" : "Result reviewed by the doctor"}
            >
              {th ? "แพทย์ตรวจสอบแล้ว" : "Doctor reviewed"}
            </span>
          )}
          {assessment.resultEditedAt && (
            <span
              className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary flex-shrink-0"
              title={th ? "แพทย์ตรวจทานและปรับผลจาก AI แล้ว" : "Values reviewed and adjusted by the doctor"}
            >
              {th ? "แพทย์ปรับผลแล้ว" : "Doctor adjusted"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

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
                  style={{ background: hasHeatmap ? "black" : "linear-gradient(135deg,#0a0a14,#111)" }}>
                  {hasHeatmap ? (
                    <img src={assessment.heatmapUrl} alt="Heatmap" className="w-full h-full object-contain" />
                  ) : isDoctor && assessment.isMock ? (
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-body text-[10px] text-white/40">
                        {th ? "ไม่มีภาพ Heatmap" : "Heatmap unavailable"}
                      </span>
                    </div>
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
                    <span className="text-right">
                      <span className={`font-body text-sm font-semibold tabular-nums ${row.highlight ? "text-primary" : "text-ink"}`}>
                        {row.value}
                      </span>
                      {row.sub && (
                        <span className="block font-body text-[10px] text-muted line-through decoration-muted/50">
                          {row.sub}
                        </span>
                      )}
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

          {/* แพทย์ตรวจทาน/ปรับผล AI — ผู้ปกครองยังไม่เห็นผลจนกว่าแพทย์จะกดส่ง */}
          {isDoctor && completed && (
            <div data-tour="review-card" className="rounded-xl border border-border/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                <p className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide">
                  {th ? "ตรวจทาน / ปรับผล AI" : "Review / Adjust AI Result"}
                </p>
              </div>

              {!editingResult ? (
                <>
                  <p className="font-body text-xs text-muted leading-relaxed">
                    {th
                      ? "ตรวจสอบผลจาก AI ก่อนส่งให้ผู้ปกครอง — หากไม่ตรงตามดุลยพินิจของแพทย์ สามารถปรับอายุกระดูก ส่วนสูงพยากรณ์ และการแปลผลได้"
                      : "Review the AI result before sending — you can adjust the bone age, predicted adult height, and interpretation if they don't match your clinical judgment."}
                  </p>
                  {/* เทียบค่าดิบจาก AI กับค่าที่แพทย์ยืนยัน — โชว์เฉพาะ field ที่ต่างกัน */}
                  {anyAiDiff && (
                    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 space-y-1.5">
                      <p className="font-body text-[11px] font-semibold text-primary">
                        {th ? "ค่าที่ปรับจากผล AI" : "Adjusted from AI result"}
                      </p>
                      {aiDiff.boneAge && (
                        <p className="font-body text-[11px] text-muted">
                          {th ? "อายุกระดูก: " : "Bone age: "}
                          <span className="line-through decoration-muted/60">{fmtYearsMonths(Number(assessment.aiBoneAgeMonths), th)}</span>
                          <span className="text-ink font-semibold"> → {fmtYearsMonths(boneAge, th)}</span>
                        </p>
                      )}
                      {aiDiff.fah && (
                        <p className="font-body text-[11px] text-muted">
                          FAH: <span className="line-through decoration-muted/60">{assessment.aiFinalAdultHeightCm} cm</span>
                          <span className="text-ink font-semibold"> → {assessment.finalAdultHeightCm} cm</span>
                        </p>
                      )}
                      {aiDiff.risk && (
                        <p className="font-body text-[11px] text-muted">
                          {th ? "การแปลผล: " : "Interpretation: "}
                          <span className="line-through decoration-muted/60">
                            {(assessment.aiRiskFlag && RISK_LABEL[assessment.aiRiskFlag]) ? (th ? RISK_LABEL[assessment.aiRiskFlag].th : RISK_LABEL[assessment.aiRiskFlag].en) : assessment.aiRiskFlag}
                          </span>
                          <span className="text-ink font-semibold">
                            {" → "}{(assessment.riskFlag && RISK_LABEL[assessment.riskFlag]) ? (th ? RISK_LABEL[assessment.riskFlag].th : RISK_LABEL[assessment.riskFlag].en) : assessment.riskFlag}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                  {/* สถานะการรีวิว — รีวิวแล้ว (ยืนยัน/ปรับ) หรือยังรอรีวิว */}
                  {assessment.reviewedAt ? (
                    <div className="rounded-lg border border-success/30 bg-success/5 p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <p className="font-body text-xs font-semibold text-success">
                          {assessment.resultEditedAt
                            ? (th ? "แพทย์รีวิวและปรับผลแล้ว" : "Reviewed & adjusted by doctor")
                            : (th ? "แพทย์รีวิวและยืนยันผลแล้ว" : "Reviewed & confirmed by doctor")}
                        </p>
                      </div>
                      <p className="font-body text-[11px] text-muted">
                        {th ? "รีวิวล่าสุดเมื่อ " : "Last reviewed "}{fmtSentAt(assessment.reviewedAt)}
                      </p>
                    </div>
                  ) : (
                    <p className="font-body text-[11px] text-warning">
                      {th
                        ? "ผลนี้ยังไม่ผ่านการรีวิว — ยืนยันตามเดิมหรือปรับค่าก่อนส่งให้ผู้ปกครอง"
                        : "Not reviewed yet — confirm as-is or adjust before sending to the parent."}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {resultStatus === "saved" && (
                        <span className="font-body text-xs text-success">
                          {th ? "✓ บันทึกผลที่ปรับแล้ว" : "✓ Adjusted result saved"}
                        </span>
                      )}
                      {resultStatus === "error" && (
                        <span className="font-body text-xs text-danger break-words">
                          {resultErrMsg ?? (th ? "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง" : "Action failed, please retry")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        data-tour="adjust-btn"
                        onClick={openResultEditor}
                        className="inline-flex items-center gap-1 text-[11px] font-body font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        {th ? "ปรับผล" : "Adjust"}
                      </button>
                      {!assessment.reviewedAt && (
                        <button
                          data-tour="confirm-btn"
                          onClick={confirmReview}
                          disabled={reviewing}
                          className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                          style={{ background: "linear-gradient(120deg, rgb(var(--success)), rgb(var(--aurora-5)))" }}>
                          {reviewing
                            ? (th ? "กำลังยืนยัน..." : "Confirming...")
                            : (th ? "✓ ยืนยันผลตามนี้" : "✓ Confirm as-is")}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {assessment.aiBoneAgeMonths != null && (
                    <p className="font-body text-[11px] text-muted">
                      {th ? "ค่าจาก AI: อายุกระดูก " : "AI values: bone age "}
                      <span className="font-semibold text-ink">{fmtYearsMonths(Number(assessment.aiBoneAgeMonths), th)}</span>
                      {assessment.aiFinalAdultHeightCm != null && (
                        <> · FAH <span className="font-semibold text-ink">{assessment.aiFinalAdultHeightCm} cm</span></>
                      )}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-body text-[11px] font-semibold text-ink">
                        {th ? "อายุกระดูก — ปี" : "Bone age — years"}
                      </label>
                      <input
                        type="number" min={0} max={25} value={baYears}
                        onChange={(e) => setBaYears(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 font-body"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[11px] font-semibold text-ink">
                        {th ? "อายุกระดูก — เดือน" : "Bone age — months"}
                      </label>
                      <input
                        type="number" min={0} max={11} value={baMonthsRem}
                        onChange={(e) => setBaMonthsRem(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 font-body"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-body text-[11px] font-semibold text-ink">
                        {th ? "ส่วนสูงพยากรณ์ FAH (cm)" : "Final adult height (cm)"}
                      </label>
                      <input
                        type="number" min={50} max={250} step="0.1" value={fah}
                        onChange={(e) => setFah(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 font-body"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-body text-[11px] font-semibold text-ink">
                        {th ? "การแปลผล" : "Interpretation"}
                      </label>
                      <select
                        value={risk}
                        onChange={(e) => setRisk(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-ink text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 font-body">
                        <option value="">{th ? "— ไม่ระบุ —" : "— none —"}</option>
                        {Object.entries(RISK_LABEL).map(([key, label]) => (
                          <option key={key} value={key}>{th ? label.th : label.en}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {resultStatus === "error" && (
                        <span className="font-body text-xs text-danger break-words">
                          {resultErrMsg ?? (th ? "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" : "Failed to save, please retry")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingResult(false); setResultStatus("idle"); }}
                        className="px-3 py-2 rounded-xl text-xs font-body font-semibold text-muted hover:text-ink hover:bg-border/40 transition-colors">
                        {th ? "ยกเลิก" : "Cancel"}
                      </button>
                      <button
                        onClick={saveResult}
                        disabled={savingResult || (baYears === "" && baMonthsRem === "")}
                        className="px-4 py-2 rounded-xl text-xs font-body font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0"
                        style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))" }}>
                        {savingResult ? (th ? "กำลังบันทึก..." : "Saving...") : (th ? "บันทึกผลที่ปรับ" : "Save adjusted result")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isDoctor && (
            <div data-tour="notify-card" className="rounded-xl border border-border/40 p-4 space-y-3">
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
                      ? "ผู้ปกครองจะยังไม่เห็นผลนี้ในแอปจนกว่าแพทย์จะกดส่ง — เมื่อส่งแล้วระบบจะรวบรวมผลการประเมิน (อายุกระดูก ส่วนสูง การแปลผล) พร้อมวันนัดติดตาม ส่งเป็นอีเมล เปิดให้เห็นผลในแอป และบันทึกคำแนะนำให้ผู้ปกครองอ่าน (เมนูคำแนะนำจากแพทย์)"
                      : "The parent cannot see this result in their app until you send it — sending emails the assessment summary and follow-up date, unlocks the result in their app, and saves your recommendation (Recommendations menu)."}
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
