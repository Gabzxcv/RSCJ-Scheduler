"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Driver, TripHistory, Vehicle } from "@/lib/types";
import { dateKey, formatDate, formatTime } from "@/lib/time";

const statusLabel: Record<string, string> = { scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };
type SnapshotTrip = { id?: string; starts_at?: string; estimated_return_at?: string; destination?: string; pickup_location?: string; status?: string; vehicle_id?: string; client_name?: string; passenger_count?: number };
type SnapshotDriver = { id: string; name: string };
type SnapshotVehicle = { id: string; name: string; plate: string };
const tripOf = (snapshot: Record<string, unknown> | null): SnapshotTrip | null => snapshot?.trip as SnapshotTrip | null;
const driversOf = (snapshot: Record<string, unknown> | null): SnapshotDriver[] => (snapshot?.drivers as SnapshotDriver[] | undefined) ?? [];
const vehicleOf = (snapshot: Record<string, unknown> | null): SnapshotVehicle | null => snapshot?.vehicle as SnapshotVehicle | null;

export function HistoryClient({ records, drivers, vehicles, timezone }: { records: TripHistory[]; drivers: Driver[]; vehicles: Vehicle[]; timezone: string }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [driverId, setDriverId] = useState("all");
  const [vehicleId, setVehicleId] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => records.filter((record) => {
    const current = tripOf(record.after_data);
    const previous = tripOf(record.before_data);
    const trip = current ?? previous;
    if (!trip) return false;
    const day = trip.starts_at ? dateKey(trip.starts_at, timezone) : "";
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (driverId !== "all" && ![...driversOf(record.after_data), ...driversOf(record.before_data)].some((item) => item.id === driverId)) return false;
    if (vehicleId !== "all" && ![current?.vehicle_id, previous?.vehicle_id].includes(vehicleId)) return false;
    if (status !== "all" && (current?.status ?? previous?.status) !== status) return false;
    const haystack = [trip.destination, trip.pickup_location, trip.client_name, ...driversOf(record.after_data).map((item) => item.name), vehicleOf(record.after_data)?.name, vehicleOf(record.after_data)?.plate, record.actor?.display_name, record.actor?.email].join(" ").toLowerCase();
    return !search || haystack.includes(search.toLowerCase());
  }), [records, search, from, to, driverId, vehicleId, status, timezone]);

  function exportCsv() {
    const rows = filtered.map((record) => {
      const trip = tripOf(record.after_data) ?? tripOf(record.before_data);
      const snapshot = record.after_data ?? record.before_data;
      return [record.action, record.actor?.display_name || record.actor?.email || "", trip?.starts_at ? dateKey(trip.starts_at, timezone) : "", trip?.starts_at ? formatTime(trip.starts_at, timezone) : "", trip?.destination, trip?.pickup_location, driversOf(snapshot).map((item) => item.name).join(" / "), vehicleOf(snapshot)?.name, vehicleOf(snapshot)?.plate, statusLabel[trip?.status ?? ""] ?? trip?.status, record.created_at];
    });
    const csv = [["Change", "Changed by", "Trip date", "Departure", "Destination", "Pickup", "Drivers", "Vehicle", "Plate", "Current status", "Changed at"], ...rows]
      .map((row) => row.map((field) => `"${String(field ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `rscj-scheduler-trip-history-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return <>
    <section className="panel history-filters"><div className="history-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search destination, driver, client…" aria-label="Search history" /></div><label className="filter-select"><span>Trip date from</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="filter-select"><span>To</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label className="filter-select"><span>Driver</span><select value={driverId} onChange={(event) => setDriverId(event.target.value)}><option value="all">All drivers</option>{drivers.map((driver) => <option value={driver.id} key={driver.id}>{driver.full_name}</option>)}</select></label><label className="filter-select"><span>Vehicle</span><select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}><option value="all">All vehicles</option>{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.label}</option>)}</select></label><label className="filter-select"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="button secondary" onClick={exportCsv}>↓ Export CSV</button></section>
    <section className="panel history-list-panel"><div className="panel-heading"><div><p className="eyebrow">AUDIT TRAIL</p><h2>{filtered.length} {filtered.length === 1 ? "change" : "changes"}</h2></div><button className="text-link print-control" onClick={() => window.print()}>Print history</button></div>
      {filtered.length ? <div className="responsive-table"><table className="history-table"><thead><tr><th>TRIP</th><th>ASSIGNMENT</th><th>CHANGE</th><th>CHANGED BY</th><th>WHEN</th></tr></thead><tbody>{filtered.map((record) => {
        const current = tripOf(record.after_data); const previous = tripOf(record.before_data); const trip = current ?? previous;
        const assigned = driversOf(record.after_data); const vehicle = vehicleOf(record.after_data);
        return <tr key={record.id}><td><Link className="history-trip-link" href={`/trips/${record.trip_id}`}><b>{trip?.destination || "Trip record"}</b><small>{trip?.starts_at ? `${formatDate(trip.starts_at, timezone, { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(trip.starts_at, timezone)}` : "Date not saved"}</small><small>{trip?.pickup_location}</small></Link></td><td><div className="history-assignment"><b>{assigned.map((item) => item.name).join(", ") || "—"}</b><small>{vehicle ? `${vehicle.name} · ${vehicle.plate}` : "No vehicle"}</small></div></td><td><span className={`history-change ${record.action}`}>{record.action === "created" ? "Created" : "Updated"}</span><small className="history-status">{previous?.status && previous.status !== current?.status ? `${statusLabel[previous.status] ?? previous.status} → ` : ""}{statusLabel[current?.status ?? ""] ?? current?.status}</small></td><td>{record.actor?.display_name || record.actor?.email || "Workspace user"}</td><td><b>{formatDate(record.created_at, timezone, { month: "short", day: "numeric", year: "numeric" })}</b><small>{formatTime(record.created_at, timezone)}</small></td></tr>;
      })}</tbody></table></div> : <div className="empty-state small-empty"><div className="empty-icon">◷</div><h3>No matching history</h3><p>Try another filter or clear the search.</p></div>}
    </section>
  </>;
}
