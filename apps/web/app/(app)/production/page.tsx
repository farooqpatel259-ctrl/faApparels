import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Production"
      description="Production orders, BOM explosion, material issue, progress %, and expected ready dates."
      phase="Phase 9"
      features={[
        { title: "Scheduling", body: "Planned vs actual dates with automatic delay detection." },
        { title: "BOM", body: "Calculate material requirements from finished goods." },
        { title: "Ready dates", body: "Answer “when will this article be ready?” from live progress." },
      ]}
    />
  );
}
