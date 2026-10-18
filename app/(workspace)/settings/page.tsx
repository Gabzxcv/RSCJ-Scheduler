import { requireProfile } from "@/lib/auth";
import { SettingsForm } from "@/app/components/AdminForms";

export default async function SettingsPage() {
  const { supabase } = await requireProfile(["boss"]);
  const { data } = await supabase.from("app_settings").select("business_name,timezone").eq("singleton", true).single();
  return <><div className="page-heading"><div><p className="eyebrow">WORKSPACE PREFERENCES</p><h1>Settings</h1><p className="muted">Set the business name and local time zone used across the schedule.</p></div></div><div className="admin-page-grid"><section className="panel admin-form-panel"><p className="eyebrow">GENERAL</p><h2>Workspace details</h2><p className="muted">The business name appears in the app. Time zone applies to trip entry and display.</p><SettingsForm businessName={data.business_name} timezone={data.timezone} /></section><aside className="panel security-note"><span className="metric-icon indigo">⌑</span><h2>Access stays in your hands</h2><p>Only the boss can change team roles, account access, or workspace settings. Secretaries can create trips and manage driver and vehicle records.</p><div className="security-divider" /><b>Current role rules</b><ul><li>Boss: users, settings, reports, all trip and fleet records</li><li>Secretary: schedule, trips, drivers, vehicles, history</li></ul></aside></div></>;
}
