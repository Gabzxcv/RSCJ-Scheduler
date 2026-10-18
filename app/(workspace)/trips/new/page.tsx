import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadAvailability, loadDrivers, loadTripById, loadTrips, loadVehicles } from "@/lib/data";
import { dateKey, DEFAULT_TIMEZONE, localDateTimeToIso } from "@/lib/time";
import { TripForm } from "@/app/components/TripForm";
import type { Trip } from "@/lib/types";

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ copy?: string; date?: string }> }) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const params = await searchParams;
  const [drivers, vehicles, trips, availability, settings, copyTrip] = await Promise.all([
    loadDrivers(supabase), loadVehicles(supabase), loadTrips(supabase), loadAvailability(supabase),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
    params.copy ? loadTripById(supabase, params.copy) : Promise.resolve(null),
  ]);
  const timezone = settings.data?.timezone || DEFAULT_TIMEZONE;
  let trip: Trip | undefined;
  if (params.copy) trip = copyTrip ?? undefined;
  if (trip) trip = { ...trip, id: "", starts_at: "", estimated_return_at: "", status: "scheduled" };
  const date = params.date || dateKey(new Date(), timezone);
  if (params.date && !trip) {
    const existing = trips[0];
    if (existing) trip = { ...existing, id: "", starts_at: localDateTimeToIso(`${date}T09:00`, timezone), estimated_return_at: localDateTimeToIso(`${date}T12:00`, timezone), status: "scheduled", client_name: "", client_phone: "", notes: "", special_requirements: "", drivers: [] };
  }
  return <>
    <div className="breadcrumbs"><Link href="/schedule">Schedule</Link><span>›</span><span>New trip</span></div>
    <div className="page-heading form-page-heading"><div><p className="eyebrow">ADD TO THE SCHEDULE</p><h1>{params.copy ? "Duplicate trip" : "Create a trip"}</h1><p className="muted">Fill in the details and assign your team. The system checks availability before saving.</p></div></div>
    {(!drivers.length || !vehicles.length) && <div className="notice warning"><b>Set up your team and fleet first.</b><p>A trip needs at least one active driver and one available vehicle.</p><div className="setup-links">{!drivers.length && <Link href="/drivers">Add a driver →</Link>}{!vehicles.length && <Link href="/vehicles">Add a vehicle →</Link>}</div></div>}
    <div className="form-card panel"><TripForm trip={trip} copyMode={Boolean(params.copy)} drivers={drivers} vehicles={vehicles} trips={trips} availability={availability} timezone={timezone} /></div>
  </>;
}
