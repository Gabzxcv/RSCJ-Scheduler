import type { Driver, DriverAvailability, Trip, Vehicle } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadTrips(supabase: SupabaseClient, limit = 1000) {
  const { data: rawTrips, error } = await supabase.from("trips").select("*, vehicle:vehicles(id,label,plate_number,capacity,service_status)").order("starts_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const trips = (rawTrips ?? []) as unknown as Array<Trip & { vehicle: Trip["vehicle"] }>;
  if (!trips.length) return [] as Trip[];
  const ids = trips.map((trip) => trip.id);
  const profileIds = [...new Set(trips.flatMap((trip) => [trip.created_by, trip.updated_by]))];
  const [assignments, profiles] = await Promise.all([
    supabase.from("trip_drivers").select("trip_id,driver:drivers(id,full_name,phone)").in("trip_id", ids),
    supabase.from("profiles").select("id,display_name,email").in("id", profileIds),
  ]);
  if (assignments.error) throw new Error(assignments.error.message);
  if (profiles.error) throw new Error(profiles.error.message);
  const driversByTrip = new Map<string, Trip["drivers"]>();
  for (const row of (assignments.data ?? []) as unknown as Array<{ trip_id: string; driver: Pick<Driver, "id" | "full_name" | "phone"> | null }>) {
    if (!row.driver) continue;
    driversByTrip.set(row.trip_id, [...(driversByTrip.get(row.trip_id) ?? []), row.driver]);
  }
  const people = new Map((profiles.data ?? []).map((p: { id: string; display_name: string; email: string }) => [p.id, { display_name: p.display_name, email: p.email }]));
  return trips.map((trip) => ({
    ...trip,
    drivers: driversByTrip.get(trip.id) ?? [],
    creator: people.get(trip.created_by) ?? null,
    editor: people.get(trip.updated_by) ?? null,
  }));
}

export async function loadTripById(supabase: SupabaseClient, id: string) {
  const { data: rawTrip, error } = await supabase.from("trips").select("*, vehicle:vehicles(id,label,plate_number,capacity,service_status)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!rawTrip) return null;
  const trip = rawTrip as unknown as Trip;
  const [assignmentResult, profileResult] = await Promise.all([
    supabase.from("trip_drivers").select("driver:drivers(id,full_name,phone)").eq("trip_id", id),
    supabase.from("profiles").select("id,display_name,email").in("id", [trip.created_by, trip.updated_by]),
  ]);
  if (assignmentResult.error) throw new Error(assignmentResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);
  const drivers = (assignmentResult.data ?? []).flatMap((row: { driver: Pick<Driver, "id" | "full_name" | "phone"> | null }) => row.driver ? [row.driver] : []);
  const people = new Map((profileResult.data ?? []).map((person: { id: string; display_name: string; email: string }) => [person.id, { display_name: person.display_name, email: person.email }]));
  return { ...trip, drivers, creator: people.get(trip.created_by) ?? null, editor: people.get(trip.updated_by) ?? null } as Trip;
}

export async function loadDrivers(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("drivers").select("*").order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Driver[];
}

export async function loadVehicles(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("vehicles").select("*").order("label");
  if (error) throw new Error(error.message);
  return (data ?? []) as Vehicle[];
}

export async function loadAvailability(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("driver_availability").select("*").gte("ends_at", new Date().toISOString()).order("starts_at").limit(300);
  if (error) throw new Error(error.message);
  const records = (data ?? []) as DriverAvailability[];
  const ids = [...new Set(records.map((item) => item.driver_id))];
  if (!ids.length) return records;
  const { data: drivers } = await supabase.from("drivers").select("id,full_name").in("id", ids);
  const names = new Map((drivers ?? []).map((driver: { id: string; full_name: string }) => [driver.id, driver.full_name]));
  return records.map((item) => ({ ...item, driver: { full_name: names.get(item.driver_id) ?? "Driver" } }));
}
