import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Settings"
      description="Company profile, numbering sequences, inventory rules, thresholds, and notification policies."
      phase="Phase 38"
      features={[
        { title: "Numbering", body: "PO / receiving / transfer document sequences." },
        { title: "Rules", body: "Which statuses count as available; approval thresholds." },
      ]}
    />
  );
}
