import { requireProfile } from "@/lib/auth";
import { AppFrame } from "@/app/components/AppFrame";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, profile } = await requireProfile();
  const [settings, notifications] = await Promise.all([
    supabase.from("app_settings").select("business_name").eq("singleton", true).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return <AppFrame profile={profile} businessName={settings.data?.business_name || "Transport operations"} unreadCount={notifications.count || 0}>{children}</AppFrame>;
}
