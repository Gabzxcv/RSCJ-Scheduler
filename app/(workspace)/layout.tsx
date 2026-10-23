import { requireProfile } from "@/lib/auth";
import { loadWorkspaceSettings } from "@/lib/data";
import { AppFrame } from "@/app/components/AppFrame";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, profile } = await requireProfile();
  const [settings, notifications] = await Promise.all([
    loadWorkspaceSettings(supabase),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return <AppFrame profile={profile} businessName={settings?.business_name || "Transport operations"} unreadCount={notifications.count || 0}>{children}</AppFrame>;
}
