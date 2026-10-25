import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadAvailability, loadDrivers, loadTrips, loadVehicles } from "@/lib/data";
import { dateKey, dateLabel, DEFAULT_TIMEZONE, formatDate, formatTime } from "@/lib/time";
import type { Trip } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();
  const [trips, drivers, vehicles, availability, settings] = await Promise.all([
    loadTrips(supabase), loadDrivers(supabase), loadVehicles(supabase), loadAvailability(supabase),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  const timezone = settings.data?.timezone || DEFAULT_TIMEZONE;
  const today = dateKey(new Date(), timezone);
  const now = new Date().getTime();
  const todayTrips = trips.filter((trip) => dateKey(trip.starts_at, timezone) === today && trip.status !== "cancelled").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const activeToday = todayTrips.filter((trip) => ["confirmed", "in_progress"].includes(trip.status));
  const onLeave = new Set(availability.filter((item) => new Date(item.starts_at).getTime() <= now && new Date(item.ends_at).getTime() > now).map((item) => item.driver_id));
  const assignedNow = new Set(trips.filter((trip) => ["confirmed", "in_progress"].includes(trip.status) && new Date(trip.starts_at).getTime() <= now && new Date(trip.estimated_return_at).getTime() > now).flatMap((trip) => (trip.drivers ?? []).map((driver) => driver.id)));
  const availableDrivers = drivers.filter((driver) => driver.employment_status === "active" && !onLeave.has(driver.id) && !assignedNow.has(driver.id)).length;
  const vehiclesInUse = new Set(activeToday.map((trip) => trip.vehicle_id)).size;
  const pending = trips.filter((trip) => trip.status === "scheduled" && new Date(trip.starts_at).getTime() >= now).length;
  const conflicts = findConflicts(trips, timezone);
  const nextTrips = trips.filter((trip) => trip.status !== "cancelled" && new Date(trip.estimated_return_at).getTime() >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 5);
  const firstName = profile.display_name.split(/\s+/)[0] || "there";

  return <>
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">{dateLabel(today, { weekday: "long", month: "long", day: "numeric" })}</p><h1>Good day, {firstName}<span className="wave">✳</span></h1><p className="muted">Here’s what’s happening with your schedule today.</p></div><Link className="button primary" href="/trips/new"><span>＋</span> Plan a trip</Link></div>
    <section className="metric-grid" aria-label="Today's operations">
      <article className="metric-card"><div className="metric-top"><span className="metric-icon indigo">▦</span><span className="metric-caption">TODAY</span></div><div className="metric-value">{todayTrips.length}</div><div className="metric-label">Trips on the schedule</div><span className="metric-foot">{activeToday.length} confirmed or in progress</span></article>
      <article className="metric-card"><div className="metric-top"><span className="metric-icon mint">♙</span><span className="metric-caption">TEAM</span></div><div className="metric-value">{availableDrivers}<small> / {drivers.filter((item) => item.employment_status === "active").length}</small></div><div className="metric-label">Drivers available now</div><span className="metric-foot">Active drivers, minus time off</span></article>
      <article className="metric-card"><div className="metric-top"><span className="metric-icon amber">▱</span><span className="metric-caption">FLEET</span></div><div className="metric-value">{vehiclesInUse}<small> / {vehicles.filter((item) => item.service_status === "available").length}</small></div><div className="metric-label">Vehicles in use today</div><span className="metric-foot">{vehicles.filter((item) => item.service_status !== "available").length} unavailable for service</span></article>
      <article className="metric-card"><div className="metric-top"><span className="metric-icon rose">◷</span><span className="metric-caption">NEEDS A CHECK</span></div><div className="metric-value">{pending}</div><div className="metric-label">Trips awaiting confirmation</div><span className="metric-foot">Scheduled, not yet confirmed</span></article>
    </section>

    {conflicts.length > 0 && <section className="alert-card"><div className="alert-symbol">!</div><div><b>{conflicts.length} possible schedule {conflicts.length === 1 ? "conflict" : "conflicts"}</b><p>Review the assignments below. New trips are checked before they can be saved.</p></div><Link href="/schedule">Review schedule <span>→</span></Link></section>}

    <section className="dashboard-columns">
      <div className="panel upcoming-panel"><div className="panel-heading"><div><p className="eyebrow">UP NEXT</p><h2>Coming up</h2></div><Link className="text-link" href="/schedule">Full schedule <span>→</span></Link></div>
        {nextTrips.length ? <div className="upcoming-list">{nextTrips.map((trip) => <TripRow key={trip.id} trip={trip} timezone={timezone} />)}</div> : <div className="empty-state"><div className="empty-icon">▦</div><h3>Your schedule is clear</h3><p>Add a trip to see it here.</p><Link className="button secondary small-button" href="/trips/new">Create the first trip</Link></div>}
      </div>
      <div className="panel today-panel"><div className="panel-heading"><div><p className="eyebrow">TODAY AT A GLANCE</p><h2>Daily run sheet</h2></div><Link className="icon-link" href="/schedule" aria-label="Open schedule">↗</Link></div>
        <div className="day-run-list">{todayTrips.length ? todayTrips.slice(0, 6).map((trip) => <div key={trip.id} className="run-item"><div className="run-time">{formatTime(trip.starts_at, timezone)}</div><div className="run-line"><i className={`run-dot ${trip.status}`} /></div><div className="run-copy"><Link href={`/trips/${trip.id}`}><b>{trip.destination}</b></Link><span>{trip.drivers?.map((driver) => driver.full_name).join(", ") || "No driver"} · {trip.vehicle?.label || "No vehicle"}</span></div><span className={`status-badge ${trip.status}`}>{statusLabel(trip.status)}</span></div>) : <div className="empty-inline">No trips scheduled for today.</div>}</div>
        {todayTrips.length > 6 && <Link className="text-link run-more" href="/schedule">See {todayTrips.length - 6} more trips →</Link>}
      </div>
    </section>
    <section className="quick-actions"><div><p className="eyebrow">QUICK ACCESS</p><h2>Keep the day moving</h2></div><Link href="/drivers" className="quick-action"><span className="metric-icon mint">♙</span><span><b>Driver list</b><small>Contacts and availability</small></span><i>→</i></Link><Link href="/vehicles" className="quick-action"><span className="metric-icon amber">▱</span><span><b>Vehicle fleet</b><small>Capacity and service status</small></span><i>→</i></Link><Link href="/guide" className="quick-action"><span className="metric-icon indigo">?</span><span><b>Quick user guide</b><small>Get started in a few steps</small></span><i>→</i></Link></section>
  </>;
}

function statusLabel(status: string) {
  return ({ scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" } as Record<string, string>)[status] ?? status;
}

function TripRow({ trip, timezone }: { trip: Trip; timezone: string }) {
  return <Link href={`/trips/${trip.id}`} className="upcoming-row"><div className="upcoming-date"><b>{formatTime(trip.starts_at, timezone)}</b><small>{formatDate(trip.starts_at, timezone, { weekday: "short", month: "short", day: "numeric" })}</small></div><div className="upcoming-divider" /><div className="upcoming-copy"><b>{trip.destination}</b><span>{trip.client_name || trip.pickup_location} · {trip.vehicle?.label || "Vehicle unassigned"}</span><small>{trip.drivers?.map((driver) => driver.full_name).join(", ") || "Driver unassigned"}</small></div><span className={`status-badge ${trip.status}`}>{statusLabel(trip.status)}</span><span className="row-chevron">→</span></Link>;
}

function findConflicts(trips: Trip[], timezone: string) {
  const soon = trips.filter((trip) => ["scheduled", "confirmed", "in_progress"].includes(trip.status) && dateKey(trip.starts_at, timezone) >= dateKey(new Date(), timezone));
  const results = new Set<string>();
  for (let i = 0; i < soon.length; i += 1) {
    for (let j = i + 1; j < soon.length; j += 1) {
      const left = soon[i]; const right = soon[j];
      if (new Date(left.starts_at) >= new Date(right.estimated_return_at) || new Date(right.starts_at) >= new Date(left.estimated_return_at)) continue;
      const sameDriver = left.drivers?.some((driver) => right.drivers?.some((other) => other.id === driver.id));
      if (sameDriver || left.vehicle_id === right.vehicle_id) { results.add(left.id); results.add(right.id); }
    }
  }
  return [...results];
}
