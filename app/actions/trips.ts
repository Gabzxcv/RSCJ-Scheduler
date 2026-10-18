"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TripStatus } from "@/lib/types";
import { requireProfile } from "@/lib/auth";
import { isValidLocalDateTime, localDateTimeToIso } from "@/lib/time";

export type ActionState = { error?: string; success?: string };

const statuses: TripStatus[] = ["scheduled", "confirmed", "in_progress", "completed", "cancelled"];
const read = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function saveTripAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const { data: settings } = await supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle();
  const timezone = settings?.timezone || "Asia/Manila";
  const id = read(formData, "trip_id") || null;
  const startsLocal = read(formData, "starts_at_local");
  const returnLocal = read(formData, "estimated_return_local");
  const driverIds = formData.getAll("driver_ids").map(String).filter(Boolean);
  const status = read(formData, "status") as TripStatus;
  const passengers = Number.parseInt(read(formData, "passenger_count") || "1", 10);
  if (!read(formData, "pickup_location") || !read(formData, "destination")) return { error: "Enter both a pickup location and destination." };
  if (!isValidLocalDateTime(startsLocal) || !isValidLocalDateTime(returnLocal)) return { error: "Enter a valid departure and return date and time." };
  if (startsLocal >= returnLocal) return { error: "Estimated return must be later than departure." };
  if (!driverIds.length) return { error: "Assign at least one active driver." };
  if (!read(formData, "vehicle_id")) return { error: "Choose a vehicle." };
  if (!Number.isFinite(passengers) || passengers < 1) return { error: "Passenger count must be at least one." };
  if (!statuses.includes(status)) return { error: "Choose a valid trip status." };

  let startsAt: string;
  let estimatedReturnAt: string;
  try {
    startsAt = localDateTimeToIso(startsLocal, timezone);
    estimatedReturnAt = localDateTimeToIso(returnLocal, timezone);
  } catch {
    return { error: "Enter a valid departure and return date and time." };
  }
  const payload = {
    client_name: read(formData, "client_name"),
    client_phone: read(formData, "client_phone"),
    pickup_location: read(formData, "pickup_location"),
    destination: read(formData, "destination"),
    starts_at: startsAt,
    estimated_return_at: estimatedReturnAt,
    passenger_count: passengers,
    vehicle_id: read(formData, "vehicle_id"),
    status,
    notes: read(formData, "notes"),
    special_requirements: read(formData, "special_requirements"),
    driver_ids: driverIds,
  };
  const { data: tripId, error } = await supabase.rpc("save_trip", { p_trip_id: id, p_trip: payload });
  if (error) return { error: error.message.replace(/^CONFLICT:\s*/i, "Schedule conflict: ") };
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/history");
  revalidatePath("/reports");
  redirect(`/trips/${tripId}`);
}

export async function cancelTripAction(formData: FormData) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const id = read(formData, "trip_id");
  const { data: trip, error: tripError } = await supabase.from("trips").select("*").eq("id", id).single();
  if (tripError || !trip) redirect("/schedule?error=Trip%20not%20found");
  const { data: driverRows } = await supabase.from("trip_drivers").select("driver_id").eq("trip_id", id);
  const { error } = await supabase.rpc("save_trip", {
    p_trip_id: id,
    p_trip: { ...trip, status: "cancelled", driver_ids: (driverRows ?? []).map((row: { driver_id: string }) => row.driver_id) },
  });
  if (error) redirect(`/trips/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/history");
  redirect(`/trips/${id}?updated=cancelled`);
}

