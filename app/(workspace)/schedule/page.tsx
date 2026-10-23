import { CalendarClient } from "@/app/components/CalendarClient";
import { requireProfile } from "@/lib/auth";
import { loadAvailability, loadDrivers, loadTrips, loadVehicles } from "@/lib/data";
import { dateKey, dateKeyToUtc, DEFAULT_TIMEZONE, localDateTimeToIso, shiftDateKey } from "@/lib/time";

const views = ["day", "week", "month"] as const;
type View = typeof views[number];

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = dateKeyToUtc(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}` === value;
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; driver?: string; vehicle?: string; status?: string }> }) {
  const { supabase } = await requireProfile();
  const [params, drivers, vehicles, availability, settings] = await Promise.all([
    searchParams, loadDrivers(supabase), loadVehicles(supabase), loadAvailability(supabase),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  const timezone = settings.data?.timezone || DEFAULT_TIMEZONE;
  const mode: View = views.includes(params.view as View) ? params.view as View : "day";
  const selectedDate = validDate(params.date) ? params.date! : dateKey(new Date(), timezone);
  let startDate = selectedDate;
  let endDate = shiftDateKey(selectedDate, 1);
  if (mode === "week") {
    const monday = shiftDateKey(selectedDate, -((dateKeyToUtc(selectedDate).getUTCDay() + 6) % 7));
    startDate = monday;
    endDate = shiftDateKey(monday, 7);
  } else if (mode === "month") {
    const firstDay = `${selectedDate.slice(0, 7)}-01`;
    startDate = shiftDateKey(firstDay, -((dateKeyToUtc(firstDay).getUTCDay() + 6) % 7));
    endDate = shiftDateKey(startDate, 42);
  }
  const trips = await loadTrips(supabase, 1000, {
    start: localDateTimeToIso(`${startDate}T00:00`, timezone),
    end: localDateTimeToIso(`${endDate}T00:00`, timezone),
  });
  return <CalendarClient trips={trips} drivers={drivers} vehicles={vehicles} availability={availability} timezone={timezone}
    initialMode={mode} initialDate={selectedDate} initialDriverFilter={params.driver || "all"}
    initialVehicleFilter={params.vehicle || "all"} initialStatusFilter={params.status || "all"} />;
}
