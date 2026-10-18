import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadDrivers, loadTrips, loadVehicles } from "@/lib/data";
import { dateKey, dateKeyToUtc, DEFAULT_TIMEZONE } from "@/lib/time";
import { PrintButton } from "@/app/components/PrintButton";

const statuses = ["scheduled", "confirmed", "in_progress", "completed", "cancelled"] as const;
const labels: Record<string, string> = { scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

export default async function ReportsPage() {
  const { supabase } = await requireProfile(["boss"]);
  const [trips, drivers, vehicles, settings] = await Promise.all([
    loadTrips(supabase), loadDrivers(supabase), loadVehicles(supabase), supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  const timezone = settings.data?.timezone || DEFAULT_TIMEZONE;
  const thisMonth = dateKey(new Date(), timezone).slice(0, 7);
  const thisMonthDate = dateKeyToUtc(`${thisMonth}-01`);
  const previousMonthDate = new Date(Date.UTC(thisMonthDate.getUTCFullYear(), thisMonthDate.getUTCMonth() - 1, 1, 12));
  const previousMonth = `${previousMonthDate.getUTCFullYear()}-${String(previousMonthDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const currentTrips = trips.filter((trip) => dateKey(trip.starts_at, timezone).startsWith(thisMonth));
  const prevTrips = trips.filter((trip) => dateKey(trip.starts_at, timezone).startsWith(previousMonth));
  const delta = currentTrips.length - prevTrips.length;
  const activeTrips = currentTrips.filter((trip) => trip.status !== "cancelled");
  const completed = activeTrips.filter((trip) => trip.status === "completed").length;
  const completion = activeTrips.length ? Math.round((completed / activeTrips.length) * 100) : 0;
  const byStatus = statuses.map((status) => ({ status, count: currentTrips.filter((trip) => trip.status === status).length }));
  const workload = drivers.map((driver) => ({ driver, count: currentTrips.filter((trip) => trip.drivers?.some((person) => person.id === driver.id) && trip.status !== "cancelled").length })).sort((a, b) => b.count - a.count);
  const maxWork = Math.max(1, ...workload.map((item) => item.count));
  const destinations = new Map<string, number>();
  currentTrips.filter((trip) => trip.status !== "cancelled").forEach((trip) => destinations.set(trip.destination, (destinations.get(trip.destination) ?? 0) + 1));
  const topDestinations = [...destinations].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return <>
    <div className="page-heading"><div><p className="eyebrow">BOSS REPORTING</p><h1>Operations report</h1><p className="muted">Schedule activity for {new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "long", year: "numeric" }).format(thisMonthDate)}.</p></div><PrintButton /></div>
    <section className="metric-grid report-metrics"><article className="metric-card"><div className="metric-top"><span className="metric-icon indigo">▦</span><span className="metric-caption">THIS MONTH</span></div><div className="metric-value">{currentTrips.length}</div><div className="metric-label">Trips scheduled</div><span className="metric-foot">{delta > 0 ? `↑ ${delta} more than last month` : delta < 0 ? `↓ ${Math.abs(delta)} fewer than last month` : "Same as last month"}</span></article><article className="metric-card"><div className="metric-top"><span className="metric-icon mint">✓</span><span className="metric-caption">COMPLETION</span></div><div className="metric-value">{completion}<small>%</small></div><div className="metric-label">Trips completed</div><span className="metric-foot">{completed} of {activeTrips.length} non-cancelled trips</span></article><article className="metric-card"><div className="metric-top"><span className="metric-icon amber">♙</span><span className="metric-caption">PEOPLE</span></div><div className="metric-value">{drivers.filter((driver) => driver.employment_status === "active").length}</div><div className="metric-label">Active drivers</div><span className="metric-foot">{workload.reduce((sum, item) => sum + item.count, 0)} driver assignments this month</span></article><article className="metric-card"><div className="metric-top"><span className="metric-icon rose">▱</span><span className="metric-caption">FLEET</span></div><div className="metric-value">{vehicles.filter((vehicle) => vehicle.service_status === "available").length}</div><div className="metric-label">Vehicles serviceable</div><span className="metric-foot">{vehicles.length} vehicles in the fleet</span></article></section>
    <section className="report-grid"><div className="panel report-panel"><div className="panel-heading"><div><p className="eyebrow">TRIP STATUS</p><h2>Monthly breakdown</h2></div><Link className="text-link" href="/history">Open history →</Link></div>{currentTrips.length ? <div className="status-breakdown">{byStatus.map(({ status, count }) => <div className="status-breakdown-row" key={status}><div><span className={`legend ${status}`} /><b>{labels[status]}</b><small>{count}</small></div><div className="bar-track"><i className={`bar-fill ${status}`} style={{ width: `${Math.max(count ? 4 : 0, Math.round((count / currentTrips.length) * 100))}%` }} /></div></div>)}</div> : <div className="empty-inline">No trips recorded this month.</div>}</div>
      <div className="panel report-panel"><div className="panel-heading"><div><p className="eyebrow">DESTINATION MIX</p><h2>Popular destinations</h2></div><span className="metric-icon amber">⌖</span></div>{topDestinations.length ? <div className="destination-list">{topDestinations.map(([destination, count], index) => <div className="destination-row" key={destination}><span className="destination-rank">0{index + 1}</span><b>{destination}</b><span>{count} {count === 1 ? "trip" : "trips"}</span></div>)}</div> : <div className="empty-inline">Destinations appear here as trips are added.</div>}</div>
      <div className="panel report-panel workload-panel"><div className="panel-heading"><div><p className="eyebrow">DRIVER ASSIGNMENTS</p><h2>Workload this month</h2></div><Link className="text-link" href="/drivers">Driver list →</Link></div>{workload.length ? workload.map(({ driver, count }) => <div className="workload-row" key={driver.id}><div className="workload-name"><span className="avatar small-avatar">{driver.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><b>{driver.full_name}</b><small>{count}</small></div><div className="bar-track"><i className="bar-fill workload" style={{ width: `${Math.max(count ? 4 : 0, Math.round((count / maxWork) * 100))}%` }} /></div></div>) : <div className="empty-inline">Add drivers to track team assignments.</div>}</div>
      <div className="panel report-panel report-notes"><span className="metric-icon indigo">i</span><div><h2>Reading this report</h2><p>Trip counts use the departure date. Cancelled trips are shown in status totals and excluded from completion and workload metrics. A trip with multiple drivers counts once for each assigned driver.</p><Link href="/history">Review source trip records →</Link></div></div></section>
  </>;
}
