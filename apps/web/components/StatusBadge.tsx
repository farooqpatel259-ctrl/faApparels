type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  AVAILABLE: "success",
  RECEIVED: "success",
  DELIVERED: "success",
  DISPATCHED: "info",
  ACTIVE: "success",
  APPROVED: "success",
  COMPLETED: "success",
  CLOSED: "neutral",
  DRAFT: "neutral",
  PENDING: "warning",
  IN_PROGRESS: "info",
  INSPECTION: "warning",
  SORTING_PENDING: "warning",
  SORTING_IN_PROGRESS: "info",
  QC_PENDING: "warning",
  RESERVED: "info",
  PRODUCTION: "info",
  PACKED: "info",
  READY_TO_DISPATCH: "info",
  EXPECTED: "neutral",
  RETURNED: "warning",
  DAMAGED: "danger",
  REJECTED: "danger",
  QUARANTINE: "danger",
  SCRAP: "danger",
  MISSING: "danger",
  CANCELLED: "danger",
  OVERDUE: "danger",
};

function formatLabel(status: string): string {
  return status.replace(/_/g, " ");
}

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant ?? STATUS_VARIANTS[status.toUpperCase()] ?? "neutral";

  return (
    <span className={`status-badge status-badge--${resolvedVariant}`}>
      {formatLabel(status)}
    </span>
  );
}
