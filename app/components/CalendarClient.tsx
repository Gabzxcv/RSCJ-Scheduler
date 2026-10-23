"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Driver, DriverAvailability, Trip, Vehicle } from "@/lib/types";
import { dateKey, dateKeyToUtc, dateLabel, formatTime, localDateTimeToIso, monthTitle, shiftDateKey } from "@/lib/time";

type ViewMode = "day" | "week" | "month";
const statusNames: Record<string, string> = { scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

export function CalendarClient({ trips, drivers, vehicles, availability, timezone, initialMode = "day", initialDate, initialDriverFilter = "all", initialVehicleFilter = "all", initialStatusFilter = "all" }: {
  trips: Trip[]; drivers: Driver[]; vehicles: Vehicle[]; availability: DriverAvailability[]; timezone: string;
  initialMode?: ViewMode; initialDate?: string; initialDriverFilter?: string; initialVehicleFilter?: string; initialStatusFilter?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [selectedDate, setSelectedDate] = useState(() => initialDate || dateKey(new Date(), timezone));
  const [driverFilter, setDriverFilter] = useState(initialDriverFilter);
  const [vehicleFilter, setVehicleFilter] = useState(initialVehicleFilter);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  useEffect(() => {
    const query = new URLSearchParams({ view: mode, date: selectedDate });
    if (driverFilter !== "all") query.set("driver", driverFilter);
    if (vehicleFilter !== "all") query.set("vehicle", vehicleFilter);
    if (statusFilter !== "all") query.set("status", statusFilter);
    const destination = `/schedule?${query.toString()}`;
    if (`${window.location.pathname}${window.location.search}` !== destination) router.replace(destination, { scroll: false });
  }, [router, mode, selectedDate, driverFilter, vehicleFilter, statusFilter]);
  useEffect(() => {
    function restoreFromUrl() {
      const query = new URLSearchParams(window.location.search);
      const view = query.get("view");
      if (view === "day" || view === "week" || view === "month") setMode(view);
      const date = query.get("date");
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setSelectedDate(date);
      setDriverFilter(query.get("driver") || "all");
      setVehicleFilter(query.get("vehicle") || "all");
      setStatusFilter(query.get("status") || "all");
    }
    window.addEventListener("popstate", restoreFromUrl);
    return () => window.removeEventListener("popstate", restoreFromUrl);
  }, []);
  useEffect(() => {
    let lastRefresh = Date.now();
    function refreshWhenVisible() {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 30_000) return;
      lastRefresh = Date.now();
      router.refresh();
    }
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [router]);
  const visibleTrips = useMemo(() => trips.filter((trip) => {
    if (driverFilter !== "all" && !trip.drivers?.some((driver) => driver.id === driverFilter)) return false;
    if (vehicleFilter !== "all" && trip.vehicle_id !== vehicleFilter) return false;
    if (statusFilter !== "all" && trip.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [trips, driverFilter, vehicleFilter, statusFilter]);
  const dayKeys = useMemo(() => {
    const selected = dateKeyToUtc(selectedDate);
    if (mode === "day") return [selectedDate];
    if (mode === "week") {
      const mondayOffset = (selected.getUTCDay() + 6) % 7;
      const monday = shiftDateKey(selectedDate, -mondayOffset);
      return Array.from({ length: 7 }, (_, index) => shiftDateKey(monday, index));
    }
    const first = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1, 12));
    const startKey = shiftDateKey(`${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-01`, -((first.getUTCDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => shiftDateKey(startKey, index));
  }, [mode, selectedDate]);
  const inCurrentMonth = (key: string) => key.slice(0, 7) === selectedDate.slice(0, 7);
  const heading = mode === "month" ? monthTitle(selectedDate) : mode === "day" ? dateLabel(selectedDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : `${dateLabel(dayKeys[0], { month: "short", day: "numeric" })} – ${dateLabel(dayKeys[6], { month: "short", day: "numeric", year: "numeric" })}`;
  const scheduleTrips = visibleTrips.filter((trip) => mode === "month" || dayKeys.includes(dateKey(trip.starts_at, timezone)));
  const agendaDays = mode === "month" ? dayKeys.filter((key) => inCurrentMonth(key) && (key === selectedDate || scheduleTrips.some((trip) => dateKey(trip.starts_at, timezone) === key))) : dayKeys;
  const assignedOnSelected = new Set(visibleTrips.filter((trip) => dateKey(trip.starts_at, timezone) === selectedDate && trip.status !== "cancelled").flatMap((trip) => (trip.drivers ?? []).map((driver) => driver.id)));
  const selectedDayStart = new Date(localDateTimeToIso(`${selectedDate}T00:00`, timezone)).getTime();
  const selectedDayEnd = new Date(localDateTimeToIso(`${shiftDateKey(selectedDate, 1)}T00:00`, timezone)).getTime();
  const offToday = new Set(availability.filter((item) => new Date(item.starts_at).getTime() < selectedDayEnd && new Date(item.ends_at).getTime() > selectedDayStart).map((item) => item.driver_id));
  const hasFilters = driverFilter !== "all" || vehicleFilter !== "all" || statusFilter !== "all";

  function move(delta: number) {
    if (mode === "month") {
      const date = dateKeyToUtc(selectedDate);
      date.setUTCMonth(date.getUTCMonth() + delta);
      setSelectedDate(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`);
    } else setSelectedDate(shiftDateKey(selectedDate, delta));
  }

  function exportCsv() {
    const rows = scheduleTrips.map((trip) => [
      dateKey(trip.starts_at, timezone), formatTime(trip.starts_at, timezone), formatTime(trip.estimated_return_at, timezone), trip.client_name,
      trip.pickup_location, trip.destination, trip.drivers?.map((item) => item.full_name).join(" / "), trip.vehicle?.label, trip.vehicle?.plate_number, statusNames[trip.status], trip.client_phone,
    ]);
    const csv = [["Date", "Departure", "Estimated return", "Client", "Pickup", "Destination", "Drivers", "Vehicle", "Plate", "Status", "Contact"], ...rows]
      .map((row) => row.map((field) => `"${String(field ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rscj-scheduler-${mode}-${selectedDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <>
    <div className="page-heading schedule-heading"><div><p className="eyebrow">PLAN YOUR OPERATIONS</p><h1>Schedule</h1><p className="muted">A shared view of every driver, vehicle, and trip.</p></div><Link href="/trips/new" className="button primary"><span>＋</span> Create trip</Link></div>
    <section className="schedule-toolbar panel">
      <div className="calendar-controls"><div className="view-switch" role="group" aria-label="Calendar view">{(["day", "week", "month"] as const).map((view) => <button key={view} className={mode === view ? "selected" : ""} onClick={() => setMode(view)}>{view[0].toUpperCase() + view.slice(1)}</button>)}</div><button className="icon-button calendar-arrow" onClick={() => move(-1)} aria-label="Previous period">←</button><button className="button secondary today-button" onClick={() => setSelectedDate(dateKey(new Date(), timezone))}>Today</button><button className="icon-button calendar-arrow" onClick={() => move(1)} aria-label="Next period">→</button><h2 className="calendar-period">{heading}</h2></div>
      <div className="filter-row"><label className="filter-select"><span>Driver</span><select value={driverFilter} onChange={(event) => setDriverFilter(event.target.value)}><option value="all">All drivers</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.full_name}</option>)}</select></label><label className="filter-select"><span>Vehicle</span><select value={vehicleFilter} onChange={(event) => setVehicleFilter(event.target.value)}><option value="all">All vehicles</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label} · {vehicle.plate_number}</option>)}</select></label><label className="filter-select"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{hasFilters && <button className="clear-filter" onClick={() => { setDriverFilter("all"); setVehicleFilter("all"); setStatusFilter("all"); }}>Clear filters</button>}<div className="toolbar-spacer" /><button className="button secondary action-button" onClick={exportCsv}>↓ <span>Download</span></button><button className="button secondary action-button" onClick={() => window.print()}>▧ <span>Print</span></button></div>
    </section>
    <section className={`calendar-surface panel ${mode === "month" ? "month-surface" : ""} ${mode !== "day" ? "mobile-agenda-surface" : ""}`}>
      {mode === "month" ? <div className="month-grid"><div className="month-weekdays">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span key={day}>{day}</span>)}</div><div className="month-days">{dayKeys.map((key) => {
        const dayTrips = scheduleTrips.filter((trip) => dateKey(trip.starts_at, timezone) === key);
        const dayNumber = Number(key.slice(-2));
        return <button key={key} onClick={() => { setSelectedDate(key); setMode("day"); }} className={`month-cell ${inCurrentMonth(key) ? "" : "outside-month"} ${key === selectedDate ? "current-selected" : ""} ${key === dateKey(new Date(), timezone) ? "is-today" : ""}`}><span className="month-day-num">{dayNumber}</span>{dayTrips.slice(0, 3).map((trip) => <span key={trip.id} className={`month-trip ${trip.status}`}><i />{formatTime(trip.starts_at, timezone)} {trip.destination}</span>)}{dayTrips.length > 3 && <span className="more-trips">+{dayTrips.length - 3} more</span>}</button>;
      })}</div></div> : <div className={`period-grid ${mode === "day" ? "single-day" : ""}`}>
        {dayKeys.map((key) => {
          const dayTrips = scheduleTrips.filter((trip) => dateKey(trip.starts_at, timezone) === key);
          return <div key={key} className={`period-column ${key === dateKey(new Date(), timezone) ? "is-today" : ""}`}><button className="period-column-heading" onClick={() => { setSelectedDate(key); setMode("day"); }}><span>{dateLabel(key, { weekday: "short" }).slice(0, 3).toUpperCase()}</span><b>{Number(key.slice(-2))}</b></button>{dayTrips.length ? dayTrips.map((trip) => <TripCard key={trip.id} trip={trip} timezone={timezone} compact={mode === "week"} />) : <button className="empty-day" onClick={() => window.location.assign(`/trips/new?date=${key}`)}>＋<span>Plan a trip</span></button>}</div>;
        })}
      </div>}
      {mode !== "day" && <div className="mobile-agenda">{agendaDays.map((key) => {
        const dayTrips = scheduleTrips.filter((trip) => dateKey(trip.starts_at, timezone) === key);
        return <section className="mobile-agenda-day" key={key}>
          <button className="mobile-agenda-heading" onClick={() => { setSelectedDate(key); setMode("day"); }}><span>{dateLabel(key, { weekday: "long", month: "short", day: "numeric" })}</span><b>{dayTrips.length} {dayTrips.length === 1 ? "trip" : "trips"}</b></button>
          {dayTrips.length ? dayTrips.map((trip) => <TripCard key={trip.id} trip={trip} timezone={timezone} compact={false} />) : <Link className="mobile-agenda-empty" href={`/trips/new?date=${key}`}>＋ Plan a trip for this day</Link>}
        </section>;
      })}</div>}
    </section>
    {mode === "day" && <section className="panel availability-panel"><div className="panel-heading"><div><p className="eyebrow">TEAM AVAILABILITY</p><h2>{dateLabel(selectedDate, { month: "short", day: "numeric" })}</h2></div><Link className="text-link" href="/drivers">Manage time off →</Link></div><div className="availability-roster">{drivers.filter((driver) => driver.employment_status === "active").map((driver) => <div className="availability-chip" key={driver.id}><span className={`status-dot ${offToday.has(driver.id) ? "offline" : assignedOnSelected.has(driver.id) ? "busy" : "online"}`} /><b>{driver.full_name}</b><span>{offToday.has(driver.id) ? "Off duty" : assignedOnSelected.has(driver.id) ? "Assigned" : "Available"}</span></div>)}</div></section>}
    <div className="calendar-legend"><span><i className="legend scheduled" /> Scheduled</span><span><i className="legend confirmed" /> Confirmed</span><span><i className="legend in_progress" /> In progress</span><span><i className="legend completed" /> Completed</span><span><i className="legend cancelled" /> Cancelled</span></div>
  </>;
}

function TripCard({ trip, timezone, compact }: { trip: Trip; timezone: string; compact: boolean }) {
  return <Link href={`/trips/${trip.id}`} className={`calendar-trip ${trip.status} ${compact ? "compact-trip" : ""}`} title={`${trip.destination} · ${trip.drivers?.map((driver) => driver.full_name).join(", ")}`}><span className="trip-card-time">{formatTime(trip.starts_at, timezone)}</span><b>{trip.destination}</b><small>{trip.drivers?.map((driver) => driver.full_name).join(", ") || "Unassigned"}</small>{!compact && <small>{trip.vehicle?.label} · {trip.vehicle?.plate_number}</small>}<span className="trip-card-status">{statusNames[trip.status]}</span></Link>;
}
