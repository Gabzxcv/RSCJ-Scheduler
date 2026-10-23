import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelTripAction } from "@/app/actions/trips";
import { requireProfile } from "@/lib/auth";
import { loadTripById } from "@/lib/data";
import { DEFAULT_TIMEZONE, formatDate, formatTime } from "@/lib/time";

const statusText: Record<string, string> = { scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

export default async function TripDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; updated?: string }> }) {
  const { supabase } = await requireProfile();
  const [{ id }, query, settings] = await Promise.all([
    params, searchParams, supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  const trip = await loadTripById(supabase, id);
  if (!trip) notFound();
  const timezone = settings.data?.timezone || DEFAULT_TIMEZONE;
  const { data: history } = await supabase.from("trip_history").select("action,created_at,actor_id").eq("trip_id", id).order("created_at", { ascending: false }).limit(8);
  const actorIds = [...new Set((history ?? []).map((item: { actor_id: string }) => item.actor_id))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id,display_name,email").in("id", actorIds) : { data: [] };
  const actorNames = new Map((actors ?? []).map((actor: { id: string; display_name: string; email: string }) => [actor.id, actor.display_name || actor.email]));

  return <>
    <div className="breadcrumbs"><Link href="/schedule">Schedule</Link><span>›</span><span>{trip.destination}</span></div>
    {query.error && <div className="notice error">{query.error}</div>}{query.updated && <div className="notice success">Trip cancelled and history updated.</div>}
    <div className="trip-detail-heading"><div><span className={`status-badge ${trip.status}`}>{statusText[trip.status]}</span><p className="eyebrow">{formatDate(trip.starts_at, timezone, { weekday: "long" })}</p><h1>{trip.destination}</h1><p className="muted">{trip.pickup_location} <span className="route-arrow">→</span> {trip.destination}</p></div><div className="detail-actions"><Link className="button secondary" href={`/invoices/new?trip=${trip.id}`}>＋ Create invoice</Link><Link className="button secondary" href={`/trips/new?copy=${trip.id}`}>⧉ Duplicate</Link><Link className="button secondary" href={`/trips/${trip.id}/edit`}>Edit trip</Link>{trip.status !== "cancelled" && trip.status !== "completed" && <form action={cancelTripAction}><input type="hidden" name="trip_id" value={trip.id} /><button className="button danger-outline" type="submit">Cancel trip</button></form>}</div></div>
    <section className="detail-grid"><div className="panel detail-main"><div className="detail-section"><div className="detail-section-icon indigo">◷</div><div><small>DEPARTURE</small><h2>{formatTime(trip.starts_at, timezone)}</h2><p>{formatDate(trip.starts_at, timezone)}</p></div><div className="detail-return"><small>ESTIMATED RETURN</small><h2>{formatTime(trip.estimated_return_at, timezone)}</h2><p>{formatDate(trip.estimated_return_at, timezone)}</p></div></div><div className="detail-divider" /><div className="detail-section"><div className="detail-section-icon mint">♙</div><div className="detail-section-fill"><small>ASSIGNED DRIVER{(trip.drivers?.length ?? 0) === 1 ? "" : "S"}</small><div className="assigned-people">{trip.drivers?.map((driver) => <div className="assigned-person" key={driver.id}><span className="avatar small-avatar">{driver.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><b>{driver.full_name}</b><small>{driver.phone || "No phone saved"}</small></div></div>)}</div></div></div><div className="detail-divider" /><div className="detail-section"><div className="detail-section-icon amber">▱</div><div><small>VEHICLE</small><h2>{trip.vehicle?.label}</h2><p>{trip.vehicle?.plate_number} · {trip.vehicle?.capacity} seats</p></div></div>
      <div className="detail-divider" /><div className="detail-two-up"><div><small>CLIENT / PASSENGER LEAD</small><b>{trip.client_name || "Not provided"}</b>{trip.client_phone && <a href={`tel:${trip.client_phone}`}>{trip.client_phone}</a>}</div><div><small>PASSENGERS</small><b>{trip.passenger_count}</b></div></div>
      {(trip.special_requirements || trip.notes) && <><div className="detail-divider" /><div className="detail-two-up"><div><small>SPECIAL REQUIREMENTS</small><p>{trip.special_requirements || "None"}</p></div><div><small>INTERNAL NOTES</small><p>{trip.notes || "None"}</p></div></div></>}
    </div><aside className="detail-side"><div className="panel info-panel"><p className="eyebrow">TRIP RECORD</p><h2>Details and activity</h2><div className="record-list"><div><span>Created by</span><b>{trip.creator?.display_name || trip.creator?.email || "Workspace user"}</b></div><div><span>Created on</span><b>{formatDate(trip.created_at, timezone, { month: "short", day: "numeric", year: "numeric" })} · {formatTime(trip.created_at, timezone)}</b></div><div><span>Last updated by</span><b>{trip.editor?.display_name || trip.editor?.email || "Workspace user"}</b></div><div><span>Last updated</span><b>{formatDate(trip.updated_at, timezone, { month: "short", day: "numeric", year: "numeric" })} · {formatTime(trip.updated_at, timezone)}</b></div></div><div className="activity-feed"><h3>Recent changes</h3>{(history ?? []).map((item: { action: string; created_at: string; actor_id: string }, index: number) => <div className="activity-item" key={`${item.created_at}-${index}`}><span className="activity-dot" /><div><b>{item.action === "created" ? "Trip created" : "Trip updated"}</b><small>{actorNames.get(item.actor_id) || "Workspace user"} · {formatDate(item.created_at, timezone, { month: "short", day: "numeric" })} at {formatTime(item.created_at, timezone)}</small></div></div>)}{!(history?.length) && <p className="muted">No activity recorded.</p>}</div><Link className="text-link" href="/history">Open full trip history →</Link></div><div className="tip-card"><b>Need to make a change?</b><p>Edit the trip to update its time, assignment, or status. Every update is recorded in history.</p><Link href={`/trips/${trip.id}/edit`}>Edit trip →</Link></div></aside></section>
  </>;
}
