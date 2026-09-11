import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Stock adjustments"
      description="Authorized corrections with mandatory reason, before/after quantities, and approval gates."
      phase="Phase 14"
      features={[
        { title: "Reason codes", body: "Damage, loss, found stock, data correction, opening balance." },
        { title: "Approvals", body: "Configurable approval before posting to the ledger." },
        { title: "Audit", body: "Every adjustment creates inventory + audit records." },
      ]}
    />
  );
}
