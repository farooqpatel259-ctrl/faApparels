import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Audit log"
      description="Immutable history of who changed what — entity, before/after, reason, and timestamp."
      phase="Phase 19"
      features={[
        { title: "Append-only", body: "Ordinary users cannot edit or delete audit rows." },
        { title: "Coverage", body: "Inventory engine already writes audit events on stock changes." },
      ]}
    />
  );
}
