import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Orders"
      description="Sales order lifecycle: reserve → pick → pack → dispatch → deliver → return."
      phase="Phase 13"
      features={[
        { title: "Reservations", body: "Prevent overselling available stock." },
        { title: "Picking lists", body: "Location-aware pick instructions for warehouse staff." },
        { title: "Returns", body: "Inspection before returned goods become available." },
      ]}
    />
  );
}
