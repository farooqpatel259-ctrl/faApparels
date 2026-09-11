interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value">{value}</div>
      {hint && <div className="kpi-card__delta">{hint}</div>}
    </div>
  );
}
