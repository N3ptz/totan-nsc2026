export function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-body text-[11px] text-muted flex-shrink-0">{label}</span>
      <span className={`font-body text-xs font-semibold text-right ${highlight ? "text-primary" : "text-ink"}`}>{value}</span>
    </div>
  );
}
