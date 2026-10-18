import Link from "next/link";
import { notFound } from "next/navigation";
import { TripForm } from "@/app/components/TripForm";
import { requireProfile } from "@/lib/auth";
import { loadAvailability, loadDrivers, loadTripById, loadTrips, loadVehicles } from "@/lib/data";
import { DEFAULT_TIMEZONE } from "@/lib/time";

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const { id } = await params;
  const [trip, drivers, vehicles, trips, availability, settings] = await Promise.all([
    loadTripById(supabase, id), loadDrivers(supabase), loadVehicles(supabase), loadTrips(supabase), loadAvailability(supabase),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  if (!trip) notFound();
  return <><div className="breadcrumbs"><Link href={`/trips/${id}`}>Trip details</Link><span>›</span><span>Edit trip</span></div><div className="page-heading form-page-heading"><div><p className="eyebrow">UPDATE SCHEDULE</p><h1>Edit trip</h1><p className="muted">Changes are saved to the trip history with your account and timestamp.</p></div></div><div className="form-card panel"><TripForm trip={trip} drivers={drivers} vehicles={vehicles} trips={trips} availability={availability} timezone={settings.data?.timezone || DEFAULT_TIMEZONE} /></div></>;
}
