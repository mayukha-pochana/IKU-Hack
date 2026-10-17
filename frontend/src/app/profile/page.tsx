// OWNER: Member 2 (reuses Member 1's ProfileForm)
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileForm } from "@/components/onboarding/ProfileForm";
export default function ProfilePage() { return <DashboardLayout><ProfileForm redirectTo="/profile" /></DashboardLayout>; }
