import ComingSoonPage from "@/components/ComingSoon";

export default function Page() {
  return (
    <ComingSoonPage
      title="Users"
      description="Accounts, roles, and granular permissions across inventory operations."
      phase="Phase 4+"
      features={[
        { title: "RBAC", body: "Super Admin through Viewer — already seeded in the API." },
        { title: "Permissions", body: "View / create / adjust / approve / receive / dispatch." },
      ]}
    />
  );
}
