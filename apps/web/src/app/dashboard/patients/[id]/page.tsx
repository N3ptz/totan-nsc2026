"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { TransitionLink } from "@/components/TransitionLink";
import { childrenApi, assessmentsApi, type Child, type Assessment } from "@/lib/api";
import { ScrollFade } from "@/components/ScrollFade";
import { useI18n } from "@/lib/i18n";
import { MascotBot } from "@/components/MascotBot";
import dynamic from "next/dynamic";
import { useUser } from "@/lib/user";
import { calcAge, calcAgeMonths, ageMonthsAt, fmtDate, fmtYearsMonths, targetHeightCm, RISK_LABEL } from "@/components/patient/utils";
import { FahThChart } from "@/components/patient/FahThChart";

// GrowthChart ลาก recharts (~356KB chunk) — dynamic import ให้โหลดหลังหน้าแสดงผลแล้ว
const GrowthChart = dynamic(
  () => import("@/components/patient/GrowthChart").then((m) => m.GrowthChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    ),
  },
);
import { XrayScanLoader } from "@/components/patient/XrayScanLoader";
import { AssessmentCard } from "@/components/patient/AssessmentCard";
import { NewAssessmentPanel } from "@/components/patient/NewAssessmentPanel";
import { ChildSettingsPanel } from "@/components/patient/ChildSettingsPanel";
import { AssessmentDetailPanel } from "@/components/patient/AssessmentDetailPanel";
import { InfoRow } from "@/components/ui/InfoRow";
import { StatCard } from "@/components/ui/StatCard";

export default function PatientDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { lang } = useI18n();
  const th = lang === "th";

  const [child, setChild] = useState<Child | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [pollExpired, setPollExpired] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteExiting, setDeleteExiting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const closeDeleteModal = () => {
    setDeleteExiting(true);
    setTimeout(() => { setShowDeleteModal(false); setDeleteExiting(false); }, 230);
  };

  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const pollAssessment = (assessmentId: string, onDone?: () => void) => {
    let tries = 0;
    const tick = async () => {
      if (!alive.current) return;
      tries++;
      let terminal = false;
      try {
        const { data } = await assessmentsApi.get(assessmentId);
        if (!alive.current) return;
        setAssessments(prev => prev.map(a => a.id === assessmentId ? data : a));
        terminal = data.status === "completed" || data.status === "failed";
      } catch {}
      if (terminal || tries >= 30) { onDone?.(); return; }
      setTimeout(tick, 2500);
    };
    setTimeout(tick, 2500);
  };

  // role มาจาก context ของ layout (โหลด /auth/me ครั้งเดียว)
  const { user } = useUser();
  useEffect(() => {
    if (user) setIsDoctor(user.role === "doctor");
  }, [user]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/login"); return; }
    (async () => {
      try {
        const [{ data: c }, { data: a }] = await Promise.all([
          childrenApi.get(id),
          assessmentsApi.listByChild(id),
        ]);
        setChild(c);
        setAssessments(a);
      } catch {
        router.replace("/dashboard/patients");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  useEffect(() => {
    const hasPending = assessments.some(a => a.status === "pending" || a.status === "processing");
    if (!hasPending) { setPollExpired(false); return; }
    let retries = 0;
    const MAX_RETRIES = 30; // 30 × 3 s = 90 s timeout
    const timer = setInterval(async () => {
      retries++;
      if (retries > MAX_RETRIES) {
        clearInterval(timer);
        if (alive.current) setPollExpired(true);
        return;
      }
      try {
        const { data } = await assessmentsApi.listByChild(id);
        if (!alive.current) return;
        setAssessments(data);
        const stillPending = data.some(a => a.status === "pending" || a.status === "processing");
        if (!stillPending) { clearInterval(timer); setPollExpired(false); }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [assessments, id]);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!child) return null;

  const age = calcAge(child.dateOfBirth);
  const ageMonths = calcAgeMonths(child.dateOfBirth);
  const latestCompleted = assessments.find(a => a.status === "completed");
  const nextFollowup = assessments.find(a => a.nextFollowupDate);
  const isM = child.sex === "M";

  const targetHeight = targetHeightCm(child.sex, child.fatherHeightCm, child.motherHeightCm)?.toFixed(1) ?? null;

  const deleteChild = async () => {
    setDeleting(true);
    try {
      await childrenApi.delete(id);
      router.replace("/dashboard/patients");
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const simulate = async (assessmentId: string) => {
    setSimulating(assessmentId);
    try {
      await assessmentsApi.retryAi(assessmentId);
      pollAssessment(assessmentId, () => { if (alive.current) setSimulating(null); });
    } catch {
      const { data: refreshed } = await assessmentsApi.listByChild(id).catch(() => ({ data: null }));
      if (refreshed) setAssessments(refreshed);
      setSimulating(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-6%] w-[520px] h-[520px] rounded-full blur-[140px] opacity-[0.11] animate-aurora pointer-events-none"
        style={{ background: isM ? "rgb(var(--aurora-1))" : "rgb(var(--accent))" }} />

      <header className="sticky top-0 z-30 pl-16 lg:pl-8 pr-4 sm:pr-8 py-4 glass border-b border-border/50">
        <div className="flex items-center gap-2 sm:gap-4">
          <TransitionLink back href="/dashboard/patients"
            className="flex w-9 h-9 items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:border-border/80 transition-all flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </TransitionLink>

          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: isM ? "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" : "linear-gradient(135deg,rgb(var(--accent)),rgb(var(--warning)))" }}>
              {child.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-ink truncate"
                style={{ viewTransitionName: `pt-${child.id}` }}>{child.name}</h1>
              <p className="font-body text-xs text-muted">
                {age} {th ? "ปี" : "yrs"} · {isM ? (th ? "ชาย" : "Male") : (th ? "หญิง" : "Female")} · {child.ethnicity}
              </p>
            </div>
          </div>

          {isDoctor && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button onClick={() => setShowNew(true)} data-tour="new-assessment"
                className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.35)" }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {/* จอเล็ก: เหลือแค่ไอคอน + คำสั้น ไม่ให้ header ล้น */}
                <span className="hidden sm:inline">{th ? "ประเมินใหม่" : "New Assessment"}</span>
                <span className="sm:hidden">{th ? "ประเมิน" : "New"}</span>
              </button>
              <button onClick={() => setShowSettings(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-border text-muted hover:text-ink hover:border-border/80 transition-all"
                title={th ? "ตั้งค่าข้อมูลผู้ป่วย" : "Patient settings"}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              </button>
              <button onClick={() => setShowDeleteModal(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-danger/30 text-danger hover:bg-danger/8 transition-all"
                title={th ? "ลบข้อมูลผู้ป่วย" : "Delete patient"}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-1 glass rounded-2xl p-5 space-y-3">
            <h2 className="font-display text-xs font-bold text-muted uppercase tracking-wide">
              {th ? "ข้อมูลผู้ป่วย" : "Patient Info"}
            </h2>
            <InfoRow label={th ? "วันเกิด" : "Date of Birth"} value={fmtDate(child.dateOfBirth, th ? "th-TH" : "en-US")} />
            <InfoRow label={th ? "อายุ" : "Age"} value={`${age} ${th ? "ปี" : "yrs"} ${ageMonths % 12} ${th ? "เดือน" : "mo"}`} />
            <InfoRow label={th ? "เพศ" : "Sex"} value={isM ? (th ? "ชาย" : "Male") : (th ? "หญิง" : "Female")} />
            <InfoRow label={th ? "เชื้อชาติ" : "Ethnicity"} value={child.ethnicity} />
            {child.fatherHeightCm && <InfoRow label={th ? "ส่วนสูงบิดา" : "Father Ht."} value={`${child.fatherHeightCm} cm`} />}
            {child.motherHeightCm && <InfoRow label={th ? "ส่วนสูงมารดา" : "Mother Ht."} value={`${child.motherHeightCm} cm`} />}
            {targetHeight && (
              <InfoRow label={th ? "Target Height" : "Target Ht."} value={`${targetHeight} cm`} highlight />
            )}
          </div>

          <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-4">
            <StatCard
              icon="🔬" color="primary"
              label={th ? "การประเมินทั้งหมด" : "Total Assessments"}
              value={String(assessments.length)}
              // นับสถานะเป็นมุมมองการทำงานของแพทย์ — ผู้ปกครองเห็นเฉพาะผลที่แพทย์ส่งแล้ว (เสร็จสิ้นเสมอ)
              sub={isDoctor ? assessments.filter(a => a.status === "completed").length + (th ? " เสร็จสิ้น" : " completed") : ""}
            />
            <StatCard
              icon="🦴" color="accent"
              label={th ? "อายุกระดูกล่าสุด" : "Latest Bone Age"}
              value={latestCompleted?.boneAgeMonths
                ? fmtYearsMonths(latestCompleted.boneAgeMonths, th)
                : "—"}
              sub={latestCompleted?.riskFlag
                ? (th ? RISK_LABEL[latestCompleted.riskFlag]?.th : RISK_LABEL[latestCompleted.riskFlag]?.en) ?? "—"
                : (th ? "รอผล AI" : "Awaiting AI")}
            />
            <StatCard
              icon="📏" color="success"
              label={th ? "ส่วนสูงล่าสุด" : "Latest Height"}
              value={latestCompleted?.heightCm ? `${latestCompleted.heightCm} cm` : (child.heightCm ? `${child.heightCm} cm` : "—")}
              sub={latestCompleted?.heightPercentile ? `P${Math.round(Number(latestCompleted.heightPercentile))}` : ""}
            />
            <StatCard
              icon="📅" color="warning"
              label={th ? "นัดติดตามผลครั้งถัดไป" : "Next Follow-up"}
              value={nextFollowup?.nextFollowupDate
                ? fmtDate(String(nextFollowup.nextFollowupDate), th ? "th-TH" : "en-US")
                : "—"}
              sub={nextFollowup?.followupNotes ?? ""}
            />
          </div>
        </div>

        <div data-tour="charts" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border/50">
              <h2 className="font-display text-sm font-bold text-ink">{th ? "กราฟพัฒนาการส่วนสูง" : "Height Growth Chart"}</h2>
              <p className="font-body text-[11px] text-muted mt-0.5">{th ? "ส่วนสูงจริง เทียบกับเกณฑ์อ้างอิง WHO (P3/P50/P97)" : "Actual height vs WHO reference (P3/P50/P97)"}</p>
            </div>
            <div className="p-5">
              <GrowthChart assessments={assessments} child={child} lang={lang} />
            </div>
          </section>

          <section className="glass rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border/50">
              <h2 className="font-display text-sm font-bold text-ink">{th ? "กราฟ FAH vs TH" : "FAH vs Target Height"}</h2>
              <p className="font-body text-[11px] text-muted mt-0.5">
                {th ? "ส่วนสูงคาดการณ์ผู้ใหญ่ เทียบกับส่วนสูงเป้าหมาย" : "Predicted adult height vs target height"}
              </p>
            </div>
            <div className="p-5">
              <FahThChart assessments={assessments} lang={lang} />
            </div>
          </section>
        </div>

        <section data-tour="assessment-history" className="glass rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm font-bold text-ink">{th ? "ประวัติการประเมิน" : "Assessment History"}</h2>
              <p className="font-body text-[11px] text-muted mt-0.5">{assessments.length} {th ? "รายการ" : "records"}</p>
            </div>
          </div>

          {assessments.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center gap-3">
              <MascotBot size="lg" variant="idle"
                message={th ? "ยังไม่มีการประเมิน" : "No assessments yet"} />
              <p className="font-display font-bold text-ink text-base">
                {th ? "ยังไม่มีประวัติการประเมิน" : "No assessments yet"}
              </p>
              <p className="font-body text-sm text-muted">
                {th ? "เริ่มประเมินอายุกระดูกครั้งแรกได้เลย" : "Start the first bone age assessment"}
              </p>
              {isDoctor && (
                <button onClick={() => setShowNew(true)}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-body font-semibold text-white px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(120deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))", boxShadow: "0 6px 18px rgb(var(--primary)/0.3)" }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {th ? "สร้างการประเมินแรก" : "Create first assessment"}
                </button>
              )}
            </div>
          ) : (
            <ScrollFade enabled={assessments.length > 5} maxHeight={560}>
              <div className="divide-y divide-border/40">
                {assessments.some(a => a.status === "processing" || a.status === "pending") && (
                  pollExpired ? (
                    <div className="flex items-center gap-3 px-5 py-4 text-sm font-body text-warning bg-warning/5 border-b border-border/40">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      {th ? "AI ใช้เวลานานกว่าที่คาด — ระบบยังประมวลผลอยู่ กรุณารีเฟรชหน้าเพื่อดูผลล่าสุด" : "AI is taking longer than expected — still processing. Refresh the page to check the latest status."}
                    </div>
                  ) : (
                    <XrayScanLoader th={th} />
                  )
                )}
                {assessments.map((a, i) => (
                  <AssessmentCard
                    key={a.id}
                    assessment={a}
                    child={child}
                    index={i}
                    total={assessments.length}
                    lang={lang}
                    isDoctor={isDoctor}
                    simulating={simulating}
                    onSimulate={simulate}
                    onViewDetail={setSelectedAssessment}
                  />
                ))}
              </div>
            </ScrollFade>
          )}
        </section>
      </div>

      {showDeleteModal && (
        <div className={`dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm${deleteExiting ? " dialog-overlay--out" : ""}`}
          onClick={e => e.target === e.currentTarget && closeDeleteModal()}>
          <div className={`dialog-card glass-strong rounded-2xl p-6 w-full max-w-sm${deleteExiting ? " dialog-card--out" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgb(var(--danger)/0.12)" }}>
                <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  {th ? "ลบข้อมูลผู้ป่วย" : "Delete Patient"}
                </h3>
                <p className="font-body text-xs text-muted mt-0.5">"{child.name}"</p>
              </div>
            </div>
            <p className="font-body text-sm text-muted mb-5">
              {th
                ? "ข้อมูลทั้งหมดรวมถึงผลการประเมินจะถูกลบถาวร ไม่สามารถกู้คืนได้"
                : "All data including assessment history will be permanently deleted and cannot be recovered."}
            </p>
            <div className="flex gap-2">
              <button onClick={closeDeleteModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-muted border border-border hover:bg-border/30 transition-all">
                {th ? "ยกเลิก" : "Cancel"}
              </button>
              <button onClick={deleteChild} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "rgb(var(--danger))" }}>
                {deleting ? (th ? "กำลังลบ..." : "Deleting...") : (th ? "ลบถาวร" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <NewAssessmentPanel
          child={child}
          lang={lang}
          onClose={() => setShowNew(false)}
          onSaved={(a) => {
            setAssessments(prev => [a, ...prev]);
            setShowNew(false);
            pollAssessment(a.id);
          }}
        />
      )}

      {showSettings && (
        <ChildSettingsPanel
          child={child}
          lang={lang}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => {
            setChild(updated);
            setShowSettings(false);
          }}
        />
      )}

      {selectedAssessment && (
        <AssessmentDetailPanel
          assessment={selectedAssessment}
          child={child}
          // อายุ ณ วันสแกน ไม่ใช่อายุวันนี้ — ไม่งั้นสแกนเก่าจะถูกจำแนกผิด
          chronAgeMonths={Math.round(ageMonthsAt(child.dateOfBirth, selectedAssessment.createdAt))}
          onClose={() => setSelectedAssessment(null)}
          onUpdated={(a) => {
            setAssessments(prev => prev.map(x => x.id === a.id ? a : x));
            setSelectedAssessment(a);
          }}
          lang={lang}
          isDoctor={isDoctor}
        />
      )}
    </div>
  );
}

