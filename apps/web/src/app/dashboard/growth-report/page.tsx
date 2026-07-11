"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, PolarAngleAxis,
} from "recharts";
import { childrenApi, assessmentsApi, type Child, type Assessment } from "@/lib/api";
import { useUser } from "@/lib/user";
import { fmtYearsMonths } from "@/components/patient/utils";

// ── WHO reference (P3 / P50 / P97, age 2–13) ────────────────────────────────
const WHO: Record<"M" | "F", { age: number; p3: number; p50: number; p97: number }[]> = {
  M: [
    { age: 2, p3: 80.0, p50: 87.1, p97: 94.2 },   { age: 3, p3: 87.4, p50: 95.2, p97: 103.0 },
    { age: 4, p3: 93.9, p50: 102.3, p97: 110.7 },  { age: 5, p3: 100.1, p50: 109.4, p97: 118.7 },
    { age: 6, p3: 106.1, p50: 116.0, p97: 125.9 }, { age: 7, p3: 111.7, p50: 121.7, p97: 131.7 },
    { age: 8, p3: 117.1, p50: 127.3, p97: 137.5 }, { age: 9, p3: 122.2, p50: 132.2, p97: 143.2 },
    { age: 10, p3: 127.0, p50: 137.5, p97: 148.0 },{ age: 11, p3: 131.5, p50: 143.5, p97: 155.5 },
    { age: 12, p3: 136.2, p50: 149.1, p97: 162.0 },{ age: 13, p3: 141.8, p50: 156.2, p97: 170.6 },
  ],
  F: [
    { age: 2, p3: 78.5, p50: 85.7, p97: 92.9 },    { age: 3, p3: 86.4, p50: 94.1, p97: 101.8 },
    { age: 4, p3: 92.9, p50: 101.0, p97: 109.1 },  { age: 5, p3: 99.0, p50: 107.9, p97: 116.8 },
    { age: 6, p3: 104.9, p50: 114.6, p97: 124.3 }, { age: 7, p3: 110.3, p50: 120.0, p97: 129.7 },
    { age: 8, p3: 115.5, p50: 125.4, p97: 135.3 }, { age: 9, p3: 120.6, p50: 131.0, p97: 141.4 },
    { age: 10, p3: 125.6, p50: 136.8, p97: 148.0 },{ age: 11, p3: 130.8, p50: 143.5, p97: 156.2 },
    { age: 12, p3: 137.6, p50: 149.8, p97: 162.0 },{ age: 13, p3: 143.5, p50: 155.3, p97: 167.1 },
  ],
};

function ageYears(dob: string, at?: string): number {
  const d1 = new Date(dob);
  const d2 = at ? new Date(at) : new Date();
  return Math.round(((d2.getTime() - d1.getTime()) / 31557600000) * 10) / 10;
}

function whoRef(sex: "M" | "F", age: number) {
  const table = WHO[sex];
  const lo = [...table].reverse().find(r => r.age <= age) ?? table[0];
  const hi = table.find(r => r.age >= age) ?? table[table.length - 1];
  if (lo === hi) return lo;
  const t = (age - lo.age) / (hi.age - lo.age);
  return {
    age,
    p3:  lo.p3  + t * (hi.p3  - lo.p3),
    p50: lo.p50 + t * (hi.p50 - lo.p50),
    p97: lo.p97 + t * (hi.p97 - lo.p97),
  };
}

const RISK_MAP: Record<string, { label: string; cls: string; bar: string }> = {
  normal:        { label: "Normal Growth",  cls: "bg-success/15 text-success",  bar: "rgb(var(--success))" },
  short_stature: { label: "Short Stature",  cls: "bg-warning/15 text-warning",  bar: "rgb(var(--warning))" },
  tall_stature:  { label: "Tall Stature",   cls: "bg-primary/15 text-primary",  bar: "rgb(var(--primary))" },
  advanced:      { label: "Advanced",       cls: "bg-danger/15  text-danger",   bar: "rgb(var(--danger))"  },
  delayed:       { label: "Delayed",        cls: "bg-warning/15 text-warning",  bar: "rgb(var(--warning))" },
};

// ── Custom tooltips ──────────────────────────────────────────────────────────
function HeightTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p: any) => p.dataKey === "height");
  const p50    = payload.find((p: any) => p.dataKey === "p50");
  return (
    <div className="glass-strong rounded-2xl px-4 py-3 shadow-2xl min-w-[160px]">
      <p className="font-display text-xs font-bold text-muted mb-2 uppercase tracking-wide">Age {label} yrs</p>
      {actual && (
        <div className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgb(var(--aurora-1))" }} />
            <span className="font-body text-xs text-muted">This patient</span>
          </div>
          <span className="font-display text-sm font-bold text-ink">{Number(actual.value).toFixed(1)} cm</span>
        </div>
      )}
      {p50 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-border" />
            <span className="font-body text-xs text-muted">WHO P50</span>
          </div>
          <span className="font-body text-xs font-semibold text-muted">{Number(p50.value).toFixed(1)} cm</span>
        </div>
      )}
    </div>
  );
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-2xl px-4 py-3 shadow-2xl">
      <p className="font-body text-[11px] text-muted mb-1">{payload[0].payload.name}</p>
      <p className="font-display text-lg font-bold" style={{ color: payload[0].payload.fill }}>
        {Number(payload[0].value).toFixed(1)} cm
      </p>
    </div>
  );
}

// ── Mini stat card ───────────────────────────────────────────────────────────
function KpiCard({ label, value, color, delay = 0 }: {
  label: string; value: string; color: string; delay?: number;
}) {
  return (
    <div className="glass-tile rounded-2xl p-4 flex flex-col gap-1 animate-card-enter"
      style={{ animationDelay: `${delay}ms` }}>
      <p className="font-body text-[10px] text-muted uppercase tracking-widest leading-none">{label}</p>
      <p className="font-display text-2xl font-black tabular-nums leading-none mt-1" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────
function ChartCard({ title, sub, accentColor, children }: {
  title: string; sub: string; accentColor: string; children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl overflow-hidden">
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5" style={{ background: accentColor }} />
          <div>
            <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
            <p className="font-body text-[11px] text-muted mt-0.5">{sub}</p>
          </div>
        </div>
      </div>
      <div className="h-px" style={{ background: `linear-gradient(to right, ${accentColor}40, transparent)` }} />
      {children}
    </section>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-border animate-spin-slow"
          style={{ borderTopColor: "rgb(var(--aurora-1))" }} />
        <div className="absolute inset-2 rounded-full" style={{ background: "rgb(var(--aurora-1)/0.1)" }} />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function GrowthReportPage() {
  const { user } = useUser();
  const isDoctor = user?.role === "doctor"; // ป้าย Simulated/ค่า confidence เป็นข้อมูลภายใน — ซ่อนจากผู้ปกครอง
  const [children, setChildren]           = useState<Child[]>([]);
  const [selectedId, setSelectedId]       = useState<string>("");
  const [assessments, setAssessments]     = useState<Assessment[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingAssess, setLoadingAssess] = useState(false);

  useEffect(() => {
    childrenApi.list()
      .then(({ data }) => {
        setChildren(data);
        if (data.length > 0) setSelectedId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingAssess(true);
    assessmentsApi.listByChild(selectedId)
      .then(({ data }) => setAssessments(
        data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      ))
      .finally(() => setLoadingAssess(false));
  }, [selectedId]);

  const child = useMemo(() => children.find(c => c.id === selectedId), [children, selectedId]);

  const completedWithHeight = useMemo(
    () => assessments.filter(a => a.status === "completed" && a.heightCm),
    [assessments],
  );

  const latest = useMemo(
    () => [...completedWithHeight].reverse()[0] ?? null,
    [completedWithHeight],
  );

  const heightChartData = useMemo(() => {
    if (!child) return [];
    return completedWithHeight.map(a => {
      const age = ageYears(child.dateOfBirth, a.createdAt);
      const ref = whoRef(child.sex, age);
      return { age: Math.round(age * 10) / 10, height: Number(a.heightCm), p3: ref.p3, p50: ref.p50, p97: ref.p97 };
    });
  }, [child, completedWithHeight]);

  // คำนวณ scalar ก่อน แล้วค่อยประกอบ array ให้กราฟ — ไม่อ่านกลับจาก index ตายตัว
  // (fahTh[0]/fahTh[1]) ซึ่งจะพังเงียบ ๆ ทันทีที่สลับลำดับแท่งเพื่อเหตุผลด้านภาพ
  const th  = latest ? Number(latest.targetHeightCm ?? (child?.sex === "M" ? 165.5 : 155.0)) : 0;
  const fah = latest ? Number(latest.finalAdultHeightCm ?? 0) : 0;

  const fahTh = useMemo(() => {
    if (!fah) return [];
    return [
      { name: "Target Height",  value: th,  fill: "rgb(var(--aurora-3))" },
      { name: "Predicted FAH",  value: fah, fill: "rgb(var(--aurora-1))" },
    ];
  }, [th, fah]);

  const fahRatio = th > 0 && fah > 0 ? Math.round((fah / th) * 100) : 0;
  const diff     = fah - th;
  const risk     = latest?.riskFlag ? (RISK_MAP[latest.riskFlag] ?? RISK_MAP.normal) : RISK_MAP.normal;
  const currentAge = child ? ageYears(child.dateOfBirth) : 0;
  const isMale = child?.sex === "M";

  if (loading) return <Spinner />;

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="glass rounded-3xl p-12 text-center max-w-sm space-y-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto"
            style={{ background: "rgb(var(--primary)/0.1)" }}>👶</div>
          <p className="font-display font-bold text-ink text-lg">No patients yet</p>
          <p className="font-body text-sm text-muted">Add patients first from the Patients page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">

      {/* ── Hero header ── */}
      <div className="relative overflow-hidden px-8 pt-8 pb-6"
        style={{ background: "linear-gradient(135deg, rgb(var(--aurora-1)/0.08) 0%, rgb(var(--aurora-3)/0.05) 50%, transparent 100%)" }}>

        {/* Decorative glow blobs */}
        <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgb(var(--aurora-1)/0.12), transparent 70%)" }} />
        <div className="absolute -top-8 right-32 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgb(var(--aurora-3)/0.09), transparent 70%)" }} />

        <div className="relative flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="font-body text-xs font-semibold text-muted uppercase tracking-widest mb-1">
              Doctor Dashboard
            </p>
            <h1 className="font-display text-3xl font-black text-ink">
              Growth{" "}
              <span className="text-gradient">Report</span>
            </h1>
          </div>

          {/* Patient selector */}
          <div className="flex items-end gap-3">
            <div>
              <label className="font-body text-[11px] font-semibold text-muted uppercase tracking-wide block mb-1.5">
                Patient
              </label>
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                  className="appearance-none glass-strong rounded-xl px-4 py-2.5 pr-9 font-body text-sm font-medium text-ink border-0 outline-none cursor-pointer"
                  style={{ minWidth: 220 }}
                >
                  {children.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-10 space-y-6 max-w-7xl">

        {loadingAssess ? <Spinner /> : !child ? null : (
          <>
            {/* ── Patient hero card ── */}
            <div className="glass rounded-3xl overflow-hidden animate-card-enter">
              {/* Gradient strip at top keyed to sex/risk */}
              <div className="h-1.5 w-full"
                style={{ background: `linear-gradient(to right, ${isMale ? "rgb(var(--aurora-1))" : "rgb(var(--aurora-3))"}, ${risk.bar}, transparent)` }} />

              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white"
                      style={{
                        background: isMale
                          ? "linear-gradient(135deg, rgb(var(--aurora-1)), rgb(var(--primary-dark)))"
                          : "linear-gradient(135deg, rgb(var(--aurora-3)), rgb(var(--accent)))",
                        boxShadow: `0 8px 24px -4px ${isMale ? "rgb(var(--aurora-1)/0.5)" : "rgb(var(--aurora-3)/0.5)"}`,
                      }}>
                      {child.name.charAt(0)}
                    </div>
                    {/* Sex indicator dot */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: isMale ? "rgb(var(--aurora-1))" : "rgb(var(--aurora-3))", borderColor: "rgb(var(--bg))" }}>
                      {isMale ? "♂" : "♀"}
                    </div>
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display text-xl font-bold text-ink truncate">{child.name}</h2>
                    <p className="font-body text-sm text-muted mt-0.5">
                      {currentAge} yrs · {child.ethnicity} · {assessments.length} assessments
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[11px] font-body font-semibold px-2.5 py-1 rounded-full ${risk.cls}`}>
                        {risk.label}
                      </span>
                      {isDoctor && latest?.isMock && (
                        <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning">
                          Simulated
                        </span>
                      )}
                      {latest?.nextFollowupDate && (
                        <span className="text-[11px] font-body font-semibold px-2.5 py-1 rounded-full bg-surface text-muted border border-border/60">
                          📅 {new Date(latest.nextFollowupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* FAH delta pill */}
                  {fah > 0 && th > 0 && (
                    <div className="flex-shrink-0 rounded-2xl px-5 py-3 text-center"
                      style={{ background: diff >= 0 ? "rgb(var(--success)/0.1)" : "rgb(var(--warning)/0.1)", border: `1px solid ${diff >= 0 ? "rgb(var(--success)/0.25)" : "rgb(var(--warning)/0.25)"}` }}>
                      <p className="font-body text-[10px] uppercase tracking-wide font-semibold"
                        style={{ color: diff >= 0 ? "rgb(var(--success))" : "rgb(var(--warning))" }}>FAH vs TH</p>
                      <p className="font-display text-2xl font-black tabular-nums"
                        style={{ color: diff >= 0 ? "rgb(var(--success))" : "rgb(var(--warning))" }}>
                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
                        <span className="text-sm font-semibold ml-0.5">cm</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5">
                  {[
                    { label: "Height",      value: latest?.heightCm ? `${latest.heightCm} cm`                               : "—", color: "rgb(var(--primary))" },
                    { label: "Weight",      value: latest?.weightKg ? `${latest.weightKg} kg`                               : "—", color: "rgb(var(--ink))" },
                    { label: "Target Ht.",  value: latest?.targetHeightCm ? `${Number(latest.targetHeightCm).toFixed(1)} cm`: "—", color: "rgb(var(--aurora-3))" },
                    { label: "Pred. FAH",   value: latest?.finalAdultHeightCm ? `${latest.finalAdultHeightCm} cm`           : "—", color: "rgb(var(--aurora-1))" },
                    { label: "Height %ile", value: latest?.heightPercentile ? `P${Math.round(Number(latest.heightPercentile))}` : "—", color: "rgb(var(--success))" },
                  ].map((m, i) => (
                    <KpiCard key={m.label} label={m.label} value={m.value} color={m.color} delay={i * 60} />
                  ))}
                </div>

                {/* FAH progress bar */}
                {fah > 0 && th > 0 && (
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-body text-[11px] font-semibold text-muted">
                        Predicted FAH as % of Target Height
                      </p>
                      <p className="font-display text-sm font-bold" style={{ color: "rgb(var(--aurora-1))" }}>
                        {fahRatio}%
                      </p>
                    </div>
                    <div className="relative h-2.5 rounded-full overflow-hidden bg-border/30">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(fahRatio, 100)}%`,
                          background: "linear-gradient(90deg, rgb(var(--aurora-1)), rgb(var(--aurora-3)))",
                          boxShadow: "0 0 12px rgb(var(--aurora-1)/0.5)",
                        }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-[10px] text-muted">0 cm</span>
                      <span className="font-body text-[10px] font-semibold" style={{ color: "rgb(var(--aurora-3))" }}>
                        TH {th.toFixed(1)} cm
                      </span>
                      <span className="font-body text-[10px] text-muted">200 cm</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Charts grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

              {/* Left col: Chart 1 + Chart 2 */}
              <div className="xl:col-span-2 space-y-5">

                {/* Chart 1 — Area chart height growth */}
                <ChartCard
                  title="Height Growth Over Time"
                  sub={`Actual height vs WHO reference bands (P3 / P50 / P97) · ${completedWithHeight.length} data point${completedWithHeight.length !== 1 ? "s" : ""}`}
                  accentColor="rgb(var(--aurora-1))"
                >
                  <div className="p-5 pt-4">
                    {heightChartData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-border/30 flex items-center justify-center text-xl">📏</div>
                        <p className="font-body text-sm text-muted">No completed assessments with height data</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={heightChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="heightGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="rgb(14,165,233)" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="rgb(14,165,233)" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 4" stroke="rgb(var(--border))" strokeOpacity={0.4} />
                          <XAxis dataKey="age" tickFormatter={v => `${v}y`}
                            tick={{ fontSize: 11, fill: "rgb(var(--muted))", fontFamily: "inherit" }}
                            axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "rgb(var(--muted))", fontFamily: "inherit" }}
                            unit=" cm" axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                          <Tooltip content={<HeightTooltip />} cursor={{ stroke: "rgb(var(--border))", strokeWidth: 1 }} />

                          {/* WHO reference lines */}
                          <Area dataKey="p97" name="P97" type="monotone"
                            stroke="rgb(var(--border))" strokeWidth={1} strokeDasharray="4 3"
                            fill="transparent" dot={false} />
                          <Area dataKey="p50" name="P50" type="monotone"
                            stroke="rgb(var(--muted))" strokeWidth={1.5} strokeDasharray="4 3"
                            fill="transparent" dot={false} />
                          <Area dataKey="p3" name="P3" type="monotone"
                            stroke="rgb(var(--border))" strokeWidth={1} strokeDasharray="4 3"
                            fill="transparent" dot={false} />

                          {/* Actual height with gradient fill */}
                          <Area dataKey="height" name="Actual Height" type="monotone"
                            stroke="rgb(var(--aurora-1))" strokeWidth={3}
                            fill="url(#heightGrad)"
                            dot={{ r: 5, fill: "rgb(var(--aurora-1))", stroke: "rgb(var(--surface))", strokeWidth: 2.5 }}
                            activeDot={{ r: 7, fill: "rgb(var(--aurora-1))", stroke: "rgb(var(--surface))", strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                    {/* Legend */}
                    <div className="flex items-center gap-5 mt-2 px-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 rounded-full" style={{ background: "rgb(var(--aurora-1))" }} />
                        <span className="font-body text-[11px] text-muted">Actual Height</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 border-t border-dashed border-muted/50" />
                        <span className="font-body text-[11px] text-muted">WHO P50 median</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 border-t border-dashed border-border" />
                        <span className="font-body text-[11px] text-muted">WHO P3 / P97</span>
                      </div>
                    </div>
                  </div>
                </ChartCard>

                {/* Chart 2 — FAH vs TH bar */}
                <ChartCard
                  title="FAH vs Target Height (TH)"
                  sub="Predicted Final Adult Height against genetic midparental target"
                  accentColor="rgb(var(--aurora-3))"
                >
                  <div className="p-5 pt-4">
                    {fahTh.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-56 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-border/30 flex items-center justify-center text-xl">🧬</div>
                        <p className="font-body text-sm text-muted">No FAH / TH data in latest assessment</p>
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={fahTh} layout="vertical"
                            margin={{ top: 4, right: 60, left: 8, bottom: 4 }} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 4" stroke="rgb(var(--border))" strokeOpacity={0.4} horizontal={false} />
                            <XAxis type="number"
                              domain={[Math.min(th, fah) - 15, Math.max(th, fah) + 15]}
                              tick={{ fontSize: 11, fill: "rgb(var(--muted))", fontFamily: "inherit" }}
                              unit=" cm" axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={110}
                              tick={{ fontSize: 11, fill: "rgb(var(--muted))", fontFamily: "inherit" }}
                              axisLine={false} tickLine={false} />
                            <Tooltip content={<BarTooltip />} cursor={{ fill: "rgb(var(--primary)/0.04)" }} />
                            <ReferenceLine x={th} stroke="rgb(var(--aurora-3))" strokeWidth={1.5} strokeDasharray="5 3"
                              label={{ value: `TH ${th.toFixed(1)}`, position: "right", fontSize: 10, fill: "rgb(var(--aurora-3))", fontWeight: 600 }} />
                            <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={44}>
                              {fahTh.map((entry, i) => (
                                <Cell key={i} fill={entry.fill}
                                  style={{ filter: `drop-shadow(0 2px 8px ${entry.fill.replace(")", "/0.4)")})` }} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        {/* Delta readout */}
                        <div className="flex items-center justify-center gap-6 mt-3">
                          {fahTh.map(d => (
                            <div key={d.name} className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: d.fill }} />
                              <span className="font-body text-xs text-muted">{d.name}</span>
                              <span className="font-display text-sm font-bold text-ink">{d.value.toFixed(1)} cm</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </ChartCard>
              </div>

              {/* Right col: Chart 3 + Info */}
              <div className="space-y-5">

                {/* Chart 3 — Radial gauge */}
                <ChartCard
                  title="FAH / TH Ratio"
                  sub="Predicted height as % of genetic target"
                  accentColor="rgb(var(--success))"
                >
                  <div className="px-5 pb-5 flex flex-col items-center">
                    {fahRatio === 0 ? (
                      <div className="flex flex-col items-center justify-center h-56 w-full gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-border/30 flex items-center justify-center text-xl">📊</div>
                        <p className="font-body text-sm text-muted">No FAH / TH data</p>
                      </div>
                    ) : (
                      <>
                        <div className="relative w-full" style={{ height: 200 }}>
                          <ResponsiveContainer width="100%" height={200}>
                            <RadialBarChart
                              innerRadius="60%" outerRadius="85%"
                              startAngle={205} endAngle={-25}
                              data={[{ value: Math.min(fahRatio, 100) }]}
                              barSize={18}
                            >
                              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                              <defs>
                                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%"   stopColor="rgb(56,189,248)" />
                                  <stop offset="100%" stopColor="rgb(52,211,153)" />
                                </linearGradient>
                              </defs>
                              <RadialBar
                                background={{ fill: "rgb(var(--border)/0.25)" }}
                                dataKey="value" angleAxisId={0} cornerRadius={12}
                                fill="url(#gaugeGrad)"
                              />
                            </RadialBarChart>
                          </ResponsiveContainer>
                          {/* Center label overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: "10%" }}>
                            <p className="font-display font-black tabular-nums leading-none"
                              style={{ fontSize: 36, color: "rgb(var(--aurora-1))" }}>
                              {fahRatio}%
                            </p>
                            <p className="font-body text-[11px] text-muted font-semibold mt-1">FAH / TH</p>
                          </div>
                        </div>

                        {/* Confidence bar — ข้อมูลภายในของแพทย์ */}
                        {isDoctor && latest?.confidence != null && (
                          <div className="w-full space-y-2 mt-1">
                            <div className="flex items-center justify-between font-body text-xs">
                              <span className="text-muted">AI Confidence</span>
                              <span className="font-bold text-ink">{Math.round(Number(latest.confidence) * 100)}%</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden bg-border/30">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${Number(latest.confidence) * 100}%`,
                                  background: "linear-gradient(90deg, rgb(var(--success)), rgb(var(--aurora-5)))",
                                }} />
                            </div>
                          </div>
                        )}

                        {/* Interpretation chip */}
                        <div className="w-full mt-3 rounded-xl px-4 py-3 text-center"
                          style={{
                            background: diff >= 0 ? "rgb(var(--success)/0.08)" : "rgb(var(--warning)/0.08)",
                            border: `1px solid ${diff >= 0 ? "rgb(var(--success)/0.2)" : "rgb(var(--warning)/0.2)"}`,
                          }}>
                          <p className="font-body text-xs font-semibold leading-relaxed"
                            style={{ color: diff >= 0 ? "rgb(var(--success))" : "rgb(var(--warning))" }}>
                            {diff >= 0
                              ? `FAH exceeds TH by ${Math.abs(diff).toFixed(1)} cm`
                              : `FAH is ${Math.abs(diff).toFixed(1)} cm below TH`}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </ChartCard>

                {/* Patient info card */}
                <section className="glass rounded-2xl overflow-hidden">
                  {/* Header strip */}
                  <div className="px-5 py-4 flex items-center gap-3"
                    style={{ background: isMale ? "rgb(var(--aurora-1)/0.06)" : "rgb(var(--aurora-3)/0.06)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: isMale ? "rgb(var(--aurora-1))" : "rgb(var(--aurora-3))" }}>
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-display text-xs font-bold text-ink truncate max-w-[160px]">{child.name}</p>
                      <p className="font-body text-[10px] text-muted">{child.sex === "M" ? "Male" : "Female"} · {currentAge} yrs</p>
                    </div>
                  </div>

                  <div className="px-5 py-3 space-y-0">
                    {[
                      { label: "Date of Birth", value: new Date(child.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) },
                      { label: "Ethnicity", value: child.ethnicity },
                      { label: "Total Assessments", value: `${assessments.length}` },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between py-2 border-b border-border/25 last:border-0">
                        <span className="font-body text-xs text-muted">{r.label}</span>
                        <span className="font-body text-xs font-semibold text-ink">{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {(child.fatherHeightCm || child.motherHeightCm) && (
                    <div className="px-5 pt-3 pb-4 border-t border-border/30">
                      <p className="font-body text-[10px] font-bold text-muted uppercase tracking-widest mb-2">
                        Genetic Target
                      </p>
                      {child.fatherHeightCm && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-body text-xs text-muted w-20">Father</span>
                          <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
                            <div className="h-full rounded-full bg-primary/40"
                              style={{ width: `${((child.fatherHeightCm - 140) / 80) * 100}%` }} />
                          </div>
                          <span className="font-body text-xs font-bold text-ink w-14 text-right">{child.fatherHeightCm} cm</span>
                        </div>
                      )}
                      {child.motherHeightCm && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-body text-xs text-muted w-20">Mother</span>
                          <div className="flex-1 h-1.5 rounded-full bg-border/30 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${((child.motherHeightCm - 140) / 80) * 100}%`, background: "rgb(var(--aurora-3)/0.5)" }} />
                          </div>
                          <span className="font-body text-xs font-bold text-ink w-14 text-right">{child.motherHeightCm} cm</span>
                        </div>
                      )}
                      {latest?.targetHeightCm && (
                        <div className="flex items-center justify-between rounded-xl px-3 py-2 mt-1"
                          style={{ background: "rgb(var(--primary)/0.07)", border: "1px solid rgb(var(--primary)/0.15)" }}>
                          <span className="font-body text-xs font-semibold text-primary">Target Height</span>
                          <span className="font-display text-sm font-black text-primary">{Number(latest.targetHeightCm).toFixed(1)} cm</span>
                        </div>
                      )}
                    </div>
                  )}

                  {latest && (
                    <div className="px-5 pt-3 pb-4 border-t border-border/30">
                      <p className="font-body text-[10px] font-bold text-muted uppercase tracking-widest mb-3">
                        Latest AI Result
                      </p>
                      <div className="space-y-1.5">
                        {latest.finalAdultHeightCm && (
                          <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-muted">Predicted FAH</span>
                            <span className="font-display text-sm font-black" style={{ color: "rgb(var(--aurora-1))" }}>{latest.finalAdultHeightCm} cm</span>
                          </div>
                        )}
                        {latest.boneAgeMonths != null && (
                          <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-muted">Bone Age</span>
                            <span className="font-body text-xs font-bold text-ink">
                              {fmtYearsMonths(latest.boneAgeMonths, false)}
                            </span>
                          </div>
                        )}
                        {isDoctor && latest.confidence != null && (
                          <div className="flex items-center justify-between">
                            <span className="font-body text-xs text-muted">Confidence</span>
                            <span className="font-body text-xs font-bold text-ink">{Math.round(Number(latest.confidence) * 100)}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="font-body text-xs text-muted">Risk</span>
                          <span className={`text-[11px] font-body font-semibold px-2 py-0.5 rounded-full ${risk.cls}`}>{risk.label}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* ── Clinical notes ── */}
            {(latest?.clinicalNotes || child.clinicalNotes) && (
              <section className="glass rounded-2xl p-6 animate-card-enter" style={{ animationDelay: "250ms" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgb(var(--warning)/0.12)" }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      style={{ color: "rgb(var(--warning))" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                  </div>
                  <h2 className="font-display text-sm font-bold text-ink">Clinical Notes</h2>
                </div>
                {latest?.clinicalNotes && (
                  <div className="rounded-xl px-4 py-3 mb-2"
                    style={{ background: "rgb(var(--surface))", border: "1px solid rgb(var(--border)/0.5)" }}>
                    <p className="font-body text-sm text-ink leading-relaxed">{latest.clinicalNotes}</p>
                  </div>
                )}
                {child.clinicalNotes && child.clinicalNotes !== latest?.clinicalNotes && (
                  <p className="font-body text-xs text-muted leading-relaxed">{child.clinicalNotes}</p>
                )}
              </section>
            )}
          </>
        )}

        <p className="font-body text-[10px] text-muted/50 text-center pt-2 pb-2">
          Generated by โตทัน AI · For qualified medical professionals only · FAH predictions are estimates.
        </p>
      </div>
    </div>
  );
}
