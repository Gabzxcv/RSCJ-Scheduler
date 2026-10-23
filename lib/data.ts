import { cache } from "react";
import type { Driver, DriverAvailability, Trip, Vehicle } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type AssignedDriver = Pick<Driver, "id" | "full_name" | "phone">;
type WorkspacePerson = NonNullable<Trip["creator"]>;
type RelatedRecord<T> = T | T[] | null;
type TripWithAssignments = Omit<Trip, "creator" | "editor"> & {
  assignments?: Array<{ driver: AssignedDriver | AssignedDriver[] | null }>;
  creator?: RelatedRecord<WorkspacePerson>;
  editor?: RelatedRecord<WorkspacePerson>;
};

function flattenAssignedDrivers(rows: TripWithAssignments["assignments"]) {
  return (rows ?? []).flatMap(({ driver }) =>
    Array.isArray(driver) ? driver : driver ? [driver] : []
  );
}

function firstRelation<T>(value: RelatedRecord<T> | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export const loadWorkspaceSettings = cache(async (supabase: SupabaseClient) => {
  const { data, error } = await supabase.from("app_settings")
    .select("business_name,timezone,payment_details")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export async function loadTrips(supabase: SupabaseClient, limit = 1000, range?: { start: string; end: string }) {
  let query = supabase.from("trips")
    .select("*, vehicle:vehicles(id,label,plate_number,capacity,service_status), assignments:trip_drivers(driver:drivers(id,full_name,phone)), creator:profiles!trips_created_by_fkey(display_name,email), editor:profiles!trips_updated_by_fkey(display_name,email)");
  if (range) query = query.gt("estimated_return_at", range.start).lt("starts_at", range.end);
  const { data: rawTrips, error } = await query.order("starts_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const trips = (rawTrips ?? []) as unknown as Array<TripWithAssignments & { vehicle: Trip["vehicle"] }>;
  if (!trips.length) return [] as Trip[];
  return trips.map(({ assignments, creator, editor, ...trip }) => ({
    ...trip,
    drivers: flattenAssignedDrivers(assignments),
    creator: firstRelation(creator),
    editor: firstRelation(editor),
  }));
}

export async function loadTripById(supabase: SupabaseClient, id: string) {
  const { data: rawTrip, error } = await supabase.from("trips")
    .select("*, vehicle:vehicles(id,label,plate_number,capacity,service_status), assignments:trip_drivers(driver:drivers(id,full_name,phone)), creator:profiles!trips_created_by_fkey(display_name,email), editor:profiles!trips_updated_by_fkey(display_name,email)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!rawTrip) return null;
  const trip = rawTrip as unknown as TripWithAssignments;
  const { assignments, creator, editor, ...tripData } = trip;
  return {
    ...tripData,
    drivers: flattenAssignedDrivers(assignments),
    creator: firstRelation(creator),
    editor: firstRelation(editor),
  } as Trip;
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
  const { data, error } = await supabase.from("driver_availability")
    .select("*, driver:drivers(full_name)")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(300);
  if (error) throw new Error(error.message);
  type AvailabilityRow = Omit<DriverAvailability, "driver"> & {
    driver?: RelatedRecord<Pick<Driver, "full_name">>;
  };
  const records = (data ?? []) as unknown as AvailabilityRow[];
  return records.map(({ driver, ...record }) => ({
    ...record,
    driver: firstRelation(driver) ?? { full_name: "Driver" },
  })) as DriverAvailability[];
}
