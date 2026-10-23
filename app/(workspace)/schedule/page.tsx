import { CalendarClient } from "@/app/components/CalendarClient";
import { requireProfile } from "@/lib/auth";
import { loadAvailability, loadDrivers, loadTrips, loadVehicles } from "@/lib/data";
import { DEFAULT_TIMEZONE } from "@/lib/time";

export default async function SchedulePage() {
  const { supabase } = await requireProfile();
  const [trips, drivers, vehicles, availability, settings] = await Promise.all([
    loadTrips(supabase), loadDrivers(supabase), loadVehicles(supabase), loadAvailability(supabase),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  return <CalendarClient trips={trips} drivers={drivers} vehicles={vehicles} availability={availability} timezone={settings.data?.timezone || DEFAULT_TIMEZONE} />;
}
