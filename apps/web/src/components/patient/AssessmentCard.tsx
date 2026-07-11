"use client";

import type { Assessment, Child } from "@/lib/api";
import { fmtDate, fmtYearsMonths, RISK_LABEL } from "./utils";

interface AssessmentCardProps {
  assessment: Assessment;
  child: Child;
  index: number;
  total: number;
  lang: string;
  isDoctor: boolean;
  simulating: string | null;
  onSimulate: (id: string) => void;
  onViewDetail: (a: Assessment) => void;
}

export function AssessmentCard({
  assessment: a, child, index: i, total, lang, isDoctor, simulating, onSimulate, onViewDetail,
}: AssessmentCardProps) {
  const th = lang === "th";
  const statusCfg: Record<string, { label: string; cls: string }> = {
    pending:    { label: th ? "รอดำเนินการ"  : "Pending",    cls: "bg-primary/10 text-primary"  },
    processing: { label: th ? "กำลังวิเคราะห์": "Processing", cls: "bg-warning/10 text-warning"  },
    completed:  { label: th ? "เสร็จสิ้น"    : "Completed",  cls: "bg-success/10 text-success"  },
    failed:     { label: th ? "ผิดพลาด"      : "Failed",     cls: "bg-danger/10  text-danger"   },
  };
  const cfg  = statusCfg[a.status] ?? statusCfg.pending;
  const risk = a.riskFlag ? RISK_LABEL[a.riskFlag] : null;

  return (
    <div
      className="px-4 sm:px-6 py-4 hover:bg-primary/[0.03] transition-colors duration-150 animate-card-enter"
      style={{ animationDelay: `${Math.min(i * 55, 300)}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Index + connector */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
          <span className="font-body text-xs text-muted/50 w-5 text-center">{total - i}</span>
          {i < total - 1 && <div className="w-px flex-1 bg-border/40 min-h-[24px]" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Info badges row — ป้ายสถานะระบบ (status/mock/experimental) เป็นเรื่องภายในของแพทย์
              ผู้ปกครองเห็นเฉพาะการแปลผลทางการแพทย์ + วันที่ */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {isDoctor && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
                {cfg.label}
              </span>
            )}
            {risk && (
              <span className={`inline-flex items-center text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full ${risk.cls}`}>
                {th ? risk.th : risk.en}
              </span>
            )}
            {isDoctor && a.isMock && (
              <span className="inline-flex items-center text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-warning/10 text-warning">
                {th ? "ผลจำลอง" : "Simulated"}
              </span>
            )}
            {/* สถานะการรีวิวของแพทย์ (โชว์ทุกคน) — รีวิวแล้วติด "ตรวจสอบแล้ว" เสมอ, มีแก้ค่าติด "ปรับผลแล้ว" เพิ่ม */}
            {a.reviewedAt && (
              <span className="inline-flex items-center text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-success/10 text-success">
                {th ? "แพทย์ตรวจสอบแล้ว" : "Doctor reviewed"}
              </span>
            )}
            {a.resultEditedAt && (
              <span className="inline-flex items-center text-[11px] font-body font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {th ? "แพทย์ปรับผลแล้ว" : "Doctor adjusted"}
              </span>
            )}
            <span className="font-body text-xs text-muted ml-auto flex-shrink-0">
              {fmtDate(a.createdAt, th ? "th-TH" : "en-US")}
            </span>
          </div>

          {/* Action buttons row */}
          {(isDoctor && (a.status === "pending" || a.status === "failed") || a.status === "completed") && (
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              {isDoctor && (a.status === "pending" || a.status === "failed") && (
                <button
                  onClick={() => onSimulate(a.id)}
                  disabled={simulating === a.id}
                  className="inline-flex items-center gap-1.5 text-xs font-body font-semibold px-3.5 py-2 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-50">
                  {simulating === a.id ? (
                    <><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>{th ? "กำลังวิเคราะห์..." : "Analysing..."}</>
                  ) : (
                    <><span>🤖</span>{th ? "วิเคราะห์ใหม่" : "Retry AI"}</>
                  )}
                </button>
              )}
              {a.status === "completed" && (
                <>
                  <button
                    data-tour="detail-btn"
                    onClick={() => onViewDetail(a)}
                    className="inline-flex items-center gap-1.5 text-xs font-body font-semibold px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {th ? "ดูรายละเอียด" : "View Details"}
                  </button>
                  <button
                    data-tour="print-btn"
                    onClick={() => window.open(`/print/${child.id}/${a.id}`, "_blank", "noopener,noreferrer")}
                    className="inline-flex items-center gap-1.5 text-xs font-body font-semibold px-3.5 py-2 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                    {th ? "พิมพ์รายงาน PDF" : "Print PDF Report"}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {a.heightCm && <MiniStat label={th ? "ส่วนสูง" : "Height"} value={`${a.heightCm} cm`} />}
            {a.weightKg && <MiniStat label={th ? "น้ำหนัก" : "Weight"} value={`${a.weightKg} kg`} />}
            {a.boneAgeMonths && (
              <MiniStat label={th ? "อายุกระดูก" : "Bone Age"}
                value={fmtYearsMonths(a.boneAgeMonths, th)} />
            )}
            {isDoctor && a.confidence && <MiniStat label={th ? "ความมั่นใจ AI" : "Confidence"} value={`${Math.round(Number(a.confidence) * 100)}%`} />}
            {a.heightPercentile && <MiniStat label="Percentile" value={`P${Math.round(Number(a.heightPercentile))}`} />}
            {a.finalAdultHeightCm && <MiniStat label={th ? "ส่วนสูงคาดการณ์" : "Pred. Ht."} value={`${a.finalAdultHeightCm} cm`} />}
          </div>

          {a.clinicalNotes && (
            <p className="font-body text-xs text-muted mt-2 bg-bg2/60 rounded-lg px-3 py-2">
              {a.clinicalNotes}
            </p>
          )}
          {a.nextFollowupDate && (
            <p className="font-body text-xs text-warning mt-1.5">
              📅 {th ? "นัดติดตาม:" : "Follow-up:"} {fmtDate(String(a.nextFollowupDate), th ? "th-TH" : "en-US")}
            </p>
          )}
          {isDoctor && a.parentNotifiedAt && (
            <p className="font-body text-xs text-success mt-1.5">
              ✓ {th ? "ส่งให้ผู้ปกครองแล้ว" : "Sent to parent"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg2/60 rounded-lg px-3 py-2">
      <p className="font-body text-[11px] text-muted">{label}</p>
      <p className="font-body text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
