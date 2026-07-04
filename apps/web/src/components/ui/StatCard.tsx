const colorMap: Record<string, string> = {
  primary: "text-primary",
  accent:  "text-accent",
  success: "text-success",
  warning: "text-warning",
};

export function StatCard({ icon, color, label, value, sub }: {
  icon: string; color: string; label: string; value: string | number; sub: string | number;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className={`font-display text-2xl font-bold tabular-nums ${colorMap[color] ?? "text-primary"}`}>{value}</span>
      </div>
      <p className="font-body text-xs font-semibold text-ink leading-tight">{label}</p>
      {sub && <p className="font-body text-[11px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
