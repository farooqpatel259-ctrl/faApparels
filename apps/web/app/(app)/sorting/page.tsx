import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Sorting"
      description="Dedicated sorting queue with priority, assignment, accepted/rejected quantities, and overdue tracking."
      phase="Phase 10"
      features={[
        { title: "Queue", body: "See which articles need sorting and in what quantity." },
        { title: "Statuses", body: "Pending → Assigned → In progress → Completed / Re-sort." },
        { title: "Productivity", body: "Sorting performance reports for supervisors." },
      ]}
    />
  );
}
