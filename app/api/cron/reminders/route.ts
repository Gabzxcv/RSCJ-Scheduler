import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = secret ? `Bearer ${secret}` : "";
  const suppliedBytes = Buffer.from(authorization);
  const expectedBytes = Buffer.from(expected);
  const authorized = Boolean(secret) && suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const now = new Date();
    const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [{ data: trips, error: tripsError }, { data: preferences, error: preferencesError }, { data: settings, error: settingsError }] = await Promise.all([
      admin.from("trips").select("id,destination,starts_at").in("status", ["scheduled", "confirmed"]).gte("starts_at", now.toISOString()).lte("starts_at", horizon.toISOString()),
      admin.from("notification_preferences").select("user_id").eq("reminders_enabled", true),
      admin.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
    ]);
    if (tripsError) throw tripsError;
    if (preferencesError) throw preferencesError;
    if (settingsError) throw settingsError;
    if (!trips?.length || !preferences?.length) return NextResponse.json({ reminders_created: 0 });

    const users = preferences.map((item: { user_id: string }) => item.user_id);
    const timezone = settings?.timezone || "Asia/Manila";
    const keys = trips.flatMap((trip: { id: string; starts_at: string }) => users.map((id: string) => `reminder:${trip.id}:${id}:${trip.starts_at}`));
    const { data: existing, error: existingError } = await admin.from("notifications").select("notification_key").in("notification_key", keys);
    if (existingError) throw existingError;
    const existingKeys = new Set((existing ?? []).map((item: { notification_key: string }) => item.notification_key));
    const messages = trips.flatMap((trip: { id: string; destination: string; starts_at: string }) => users.flatMap((user_id: string) => {
      const notification_key = `reminder:${trip.id}:${user_id}:${trip.starts_at}`;
      return existingKeys.has(notification_key) ? [] : [{
        user_id,
        trip_id: trip.id,
        kind: "reminder",
        notification_key,
        title: "Trip coming up",
        body: `${trip.destination} · ${new Intl.DateTimeFormat("en-PH", { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(trip.starts_at))}`,
      }];
    }));
    if (messages.length) {
      const { error } = await admin.from("notifications").upsert(messages, { onConflict: "notification_key", ignoreDuplicates: true });
      if (error) throw error;
    }
    return NextResponse.json({ reminders_created: messages.length });
  } catch (error) {
    console.error("Reminder job failed", error);
    return NextResponse.json({ error: "Could not create trip reminders" }, { status: 500 });
  }
}
