"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { Assessment, Child } from "@/lib/api";
import { ageMonthsAt } from "./utils";
import { whoHeightReference } from "@/lib/growthReference";

interface ChartRow {
  ageYears: number;
  p3: number;
  p50: number;
  p97: number;
  height?: number;
  date?: string;
}

function buildChartData(completed: Assessment[], child: Pick<Child, "dateOfBirth" | "sex">): ChartRow[] {
  const sex = child.sex === "F" ? "F" : "M";
  const actual = completed
    .map(a => ({
      ageMonths: ageMonthsAt(child.dateOfBirth, a.createdAt),
      height: Number(a.heightCm),
      date: a.createdAt,
    }))
    .filter(p => Number.isFinite(p.ageMonths));

  if (actual.length === 0) return [];

  const minAge = Math.min(...actual.map(p => p.ageMonths));
  const maxAge = Math.max(...actual.map(p => p.ageMonths));
  const gridLo = Math.max(0, minAge - 12);
  const gridHi = Math.min(228, maxAge + 12);

  const grid: number[] = [];
  for (let m = Math.ceil(gridLo / 6) * 6; m <= gridHi; m += 6) grid.push(m);

  // Every real evaluation always gets its own row — merged by exact age,
  // not deduped through a rounded Set, so two evaluations close in age can
  // never collide and silently drop one of them. Synthetic grid points
  // only fill in gaps where no real evaluation is already nearby.
  const rows: { age: number; height?: number; date?: string }[] = actual.map(p => ({
    age: p.ageMonths, height: p.height, date: p.date,
  }));
  for (const g of grid) {
    if (actual.some(p => Math.abs(p.ageMonths - g) < 3)) continue;
    rows.push({ age: g });
  }
  rows.sort((a, b) => a.age - b.age);

  return rows.map(({ age, height, date }) => {
    const ref = whoHeightReference(sex, age);
    return {
      ageYears: Math.round((age / 12) * 10) / 10,
      p3: ref.p3, p50: ref.p50, p97: ref.p97,
      height,
      date,
    };
  });
}

function GrowthTooltip({ active, payload, th }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const hasHeight = row.height != null;
  return (
    <div className="glass-strong rounded-2xl px-4 py-3 shadow-2xl min-w-[170px]">
      <p className="font-display text-xs font-bold text-muted mb-2 uppercase tracking-wide">
        {th ? `อายุ ${row.ageYears} ปี` : `Age ${row.ageYears} yrs`}
      </p>
      {hasHeight && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
              <span className="font-body text-xs text-muted">{th ? "ส่วนสูงจริง" : "Actual height"}</span>
            </div>
            <span className="font-display text-sm font-bold text-ink">{Number(row.height).toFixed(1)} cm</span>
          </div>
          {row.date && (
            <p className="font-body text-[10px] text-muted mt-0.5 ml-4">
              {new Date(row.date).toLocaleDateString(th ? "th-TH" : "en-US", { month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-border" />
          <span className="font-body text-xs text-muted">{th ? "ค่ากลาง (P50)" : "P50 median"}</span>
        </div>
        <span className="font-body text-xs font-semibold text-muted">{row.p50.toFixed(1)} cm</span>
      </div>
      <div className="flex items-center justify-between gap-4 mt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-border/50" />
          <span className="font-body text-xs text-muted">{th ? "ช่วง P3-P97" : "P3-P97 range"}</span>
        </div>
        <span className="font-body text-xs font-semibold text-muted">{row.p3.toFixed(1)}-{row.p97.toFixed(1)} cm</span>
      </div>
    </div>
  );
}

export function GrowthChart({
  assessments, child, lang,
}: {
  assessments: Assessment[];
  child: Pick<Child, "dateOfBirth" | "sex">;
  lang: string;
}) {
  const th = lang === "th";
  // อยู่ในหน้า patient detail ที่ re-render บ่อย — memo กัน filter/sort/interpolate WHO ซ้ำทุกรอบ
  const { completed, data } = useMemo(() => {
    const done = assessments
      .filter(a => a.heightCm && a.status === "completed")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { completed: done, data: buildChartData(done, child) };
  }, [assessments, child]);

  if (completed.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgb(var(--primary)/0.1)" }}>
        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <p className="font-body text-sm text-muted">
        {th ? "ยังไม่มีผลการประเมินที่เสร็จสิ้น" : "No completed assessments yet"}
      </p>
    </div>
  );

  const isSingle = completed.length === 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="w-6 h-0.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
        <span className="font-body text-xs font-semibold" style={{ color: "rgb(var(--primary))" }}>
          {th ? "ส่วนสูงจริง (cm)" : "Actual Height (cm)"}
        </span>
        {isSingle && (
          <span className="font-body text-[10px] text-muted">
            {th ? "· เพิ่มการประเมินครั้งที่ 2 เพื่อดูแนวโน้ม" : "· Add a 2nd assessment to see the trend"}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="growthChartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(var(--primary))" stopOpacity={0.22} />
              <stop offset="95%" stopColor="rgb(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="rgb(var(--border))" strokeOpacity={0.4} />
          <XAxis dataKey="ageYears" tickFormatter={v => th ? `${v} ปี` : `${v}y`}
            tick={{ fontSize: 11, fill: "rgb(var(--muted))", fontFamily: "inherit" }}
            axisLine={false} tickLine={false} />
          <YAxis unit=" cm" tick={{ fontSize: 11, fill: "rgb(var(--muted))", fontFamily: "inherit" }}
            axisLine={false} tickLine={false} domain={["auto", "auto"]} width={52} />
          <Tooltip content={<GrowthTooltip th={th} />} cursor={{ stroke: "rgb(var(--border))", strokeWidth: 1 }} />

          <Area dataKey="p97" type="monotone" stroke="rgb(var(--border))" strokeWidth={1} strokeDasharray="4 3" fill="transparent" dot={false} />
          <Area dataKey="p50" type="monotone" stroke="rgb(var(--muted))" strokeWidth={1.3} strokeDasharray="4 3" fill="transparent" dot={false} />
          <Area dataKey="p3" type="monotone" stroke="rgb(var(--border))" strokeWidth={1} strokeDasharray="4 3" fill="transparent" dot={false} />

          <Area dataKey="height" type="monotone" connectNulls
            stroke="rgb(var(--primary))" strokeWidth={2.5}
            fill="url(#growthChartGrad)"
            dot={{ r: 4, fill: "rgb(var(--primary))", stroke: "rgb(var(--surface))", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "rgb(var(--primary))", stroke: "rgb(var(--surface))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 flex-wrap px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
          <span className="font-body text-xs text-muted">{th ? "ส่วนสูงจริง" : "Actual Height"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 border-t border-dashed border-muted/60" />
          <span className="font-body text-xs text-muted">{th ? "ค่ากลาง P50" : "P50 median"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 border-t border-dashed border-border" />
          <span className="font-body text-xs text-muted">{th ? "ช่วง P3/P97" : "P3 / P97 range"}</span>
        </div>
      </div>
    </div>
  );
}
