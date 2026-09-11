import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Reports"
      description="Inventory, production, sorting, warehouse, and management reports with Excel/PDF export."
      phase="Phase 16"
      features={[
        { title: "Inventory", body: "Valuation, aging, low stock, movements by warehouse." },
        { title: "Operations", body: "Receiving, dispatch, transfer, and count discrepancy reports." },
        { title: "CSV today", body: "Use Export CSV on live screens until full report builder ships." },
      ]}
    />
  );
}
