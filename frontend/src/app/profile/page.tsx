// OWNER: Member 2 (reuses Member 1's ProfileForm)
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileForm } from "@/components/onboarding/ProfileForm";

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">My profile</h1>
        <p className="text-ink-muted">Fill this in once. Every trial is checked against it.</p>
      </header>
      <ProfileForm />
    </DashboardLayout>
  );
}
