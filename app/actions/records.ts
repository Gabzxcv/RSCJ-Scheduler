"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { isValidLocalDateTime, localDateTimeToIso } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState } from "@/lib/types";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function createDriverAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const full_name = value(formData, "full_name");
  if (!full_name) return { error: "Enter the driver's name." };
  const payload = {
    full_name,
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    license_number: value(formData, "license_number"),
    license_expiry: value(formData, "license_expiry") || null,
    emergency_contact_name: value(formData, "emergency_contact_name"),
    emergency_contact_phone: value(formData, "emergency_contact_phone"),
    notes: value(formData, "notes"),
  };
  const { error } = await supabase.from("drivers").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/drivers");
  revalidatePath("/");
  return { success: "Driver added." };
}

export async function updateDriverStatusAction(formData: FormData) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const id = value(formData, "driver_id");
  const status = value(formData, "employment_status");
  if (!id || !["active", "inactive"].includes(status)) return;
  const { error } = await supabase.from("drivers").update({ employment_status: status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/drivers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/drivers");
  revalidatePath("/schedule");
  redirect("/drivers?updated=driver");
}

export async function createVehicleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const label = value(formData, "label");
  const plate_number = value(formData, "plate_number").toUpperCase();
  const capacity = Number.parseInt(value(formData, "capacity"), 10);
  if (!label || !plate_number) return { error: "Enter a vehicle name and plate number." };
  if (!Number.isFinite(capacity) || capacity < 1) return { error: "Capacity must be at least one." };
  const { error } = await supabase.from("vehicles").insert({
    label,
    make_model: value(formData, "make_model"),
    plate_number,
    capacity,
    notes: value(formData, "notes"),
  });
  if (error) return { error: error.message };
  revalidatePath("/vehicles");
  revalidatePath("/");
  return { success: "Vehicle added." };
}

export async function updateVehicleStatusAction(formData: FormData) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const id = value(formData, "vehicle_id");
  const status = value(formData, "service_status");
  if (!id || !["available", "maintenance", "out_of_service"].includes(status)) return;
  const { error } = await supabase.from("vehicles").update({ service_status: status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect(`/vehicles?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/vehicles");
  revalidatePath("/schedule");
  redirect("/vehicles?updated=vehicle");
}

export async function addAvailabilityAction(formData: FormData) {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const { data: settings } = await supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle();
  const timezone = settings?.timezone || "Asia/Manila";
  const driver_id = value(formData, "driver_id");
  const starts = value(formData, "starts_at_local");
  const ends = value(formData, "ends_at_local");
  if (!driver_id || !isValidLocalDateTime(starts) || !isValidLocalDateTime(ends)) redirect("/drivers?error=Enter%20valid%20availability%20dates");
  let startsAt: string;
  let endsAt: string;
  try {
    startsAt = localDateTimeToIso(starts, timezone);
    endsAt = localDateTimeToIso(ends, timezone);
  } catch {
    redirect("/drivers?error=Enter%20valid%20availability%20dates");
  }
  if (endsAt <= startsAt) redirect("/drivers?error=Availability%20end%20must%20be%20after%20start");
  const { error } = await supabase.from("driver_availability").insert({
    driver_id,
    starts_at: startsAt!,
    ends_at: endsAt!,
    reason: value(formData, "reason"),
    created_by: user.id,
  });
  if (error) redirect(`/drivers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/drivers");
  revalidatePath("/schedule");
  redirect("/drivers?availability=added");
}

export async function removeAvailabilityAction(formData: FormData) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const { error } = await supabase.from("driver_availability").delete().eq("id", value(formData, "availability_id"));
  if (error) redirect(`/drivers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/drivers");
  revalidatePath("/schedule");
  redirect("/drivers?availability=removed");
}

export async function updateSettingsAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireProfile(["boss"]);
  const business_name = value(formData, "business_name");
  const timezone = value(formData, "timezone");
  const payment_details = value(formData, "payment_details");
  if (!business_name) return { error: "Business name is required." };
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { return { error: "Choose a valid time zone." }; }
  const { error } = await supabase.from("app_settings").update({ business_name, timezone, payment_details, updated_by: user.id, updated_at: new Date().toISOString() }).eq("singleton", true);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/settings");
  return { success: "Settings saved." };
}

export async function inviteWorkspaceUserAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  await requireProfile(["boss"]);
  const email = value(formData, "email").toLowerCase();
  const display_name = value(formData, "display_name");
  const role = value(formData, "role");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!display_name) return { error: "Enter the person's name." };
  if (!["boss", "secretary"].includes(role)) return { error: "Choose a valid access role." };
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: display_name } });
    if (error) return { error: error.message };
    const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, email, display_name, role });
    if (profileError) return { error: `Invitation was sent, but the profile could not be saved: ${profileError.message}` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not send invitation." };
  }
  revalidatePath("/users");
  return { success: "Invitation sent." };
}

export async function updateWorkspaceUserRoleAction(formData: FormData) {
  const { user } = await requireProfile(["boss"]);
  const id = value(formData, "user_id");
  const role = value(formData, "role");
  if (!id || id === user.id || !["boss", "secretary"].includes(role)) redirect("/users?error=This%20role%20change%20is%20not%20allowed");
  let problem = "";
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ role }).eq("id", id);
    if (error) problem = error.message;
  } catch (error) {
    problem = error instanceof Error ? error.message : "Could not update role";
  }
  if (problem) redirect(`/users?error=${encodeURIComponent(problem)}`);
  revalidatePath("/users");
  redirect("/users?updated=1");
}

export async function updateWorkspaceUserAccessAction(formData: FormData) {
  const { user } = await requireProfile(["boss"]);
  const id = value(formData, "user_id");
  const access = value(formData, "access");
  if (!id || id === user.id || !["active", "suspended"].includes(access)) redirect("/users?error=This%20access%20change%20is%20not%20allowed");
  let problem = "";
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: access === "suspended" ? "876000h" : "none" });
    if (error) problem = error.message;
  } catch (error) {
    problem = error instanceof Error ? error.message : "Could not update access";
  }
  if (problem) redirect(`/users?error=${encodeURIComponent(problem)}`);
  revalidatePath("/users");
  redirect("/users?updated=1");
}

export async function updateReminderPreferenceAction(formData: FormData) {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const reminders_enabled = value(formData, "reminders_enabled") === "true";
  const { error } = await supabase.from("notification_preferences").update({ reminders_enabled, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications?preference=updated");
}

export async function markNotificationReadAction(formData: FormData) {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const id = value(formData, "notification_id");
  if (!id) return;
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (error) redirect(`/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/notifications");
  redirect("/notifications?read=all");
}
