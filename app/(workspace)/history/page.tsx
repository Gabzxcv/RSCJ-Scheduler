import { HistoryClient } from "@/app/components/HistoryClient";
import { requireProfile } from "@/lib/auth";
import { loadDrivers, loadVehicles } from "@/lib/data";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import type { TripHistory } from "@/lib/types";

export default async function HistoryPage() {
  const { supabase } = await requireProfile();
  const [drivers, vehicles, history, settings] = await Promise.all([
    loadDrivers(supabase), loadVehicles(supabase),
    supabase.from("trip_history").select("id,trip_id,action,before_data,after_data,created_at,actor_id").order("created_at", { ascending: false }).limit(1000),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  const records = (history.data ?? []) as unknown as Array<TripHistory & { actor_id: string }>;
  const actorIds = [...new Set(records.map((record) => record.actor_id))];
  const { data: profiles } = actorIds.length ? await supabase.from("profiles").select("id,display_name,email").in("id", actorIds) : { data: [] };
  const people = new Map((profiles ?? []).map((person: { id: string; display_name: string; email: string }) => [person.id, { display_name: person.display_name, email: person.email }]));
  const enriched = records.map(({ actor_id, ...record }) => ({ ...record, actor: people.get(actor_id) ?? null }));
  return <><div className="page-heading"><div><p className="eyebrow">A RECORD OF EVERY CHANGE</p><h1>Trip history</h1><p className="muted">Search completed, current, and cancelled trip activity, then export the results.</p></div></div><HistoryClient records={enriched} drivers={drivers} vehicles={vehicles} timezone={settings.data?.timezone || DEFAULT_TIMEZONE} /></>;
}
