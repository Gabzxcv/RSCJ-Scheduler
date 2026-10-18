"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { Driver, DriverAvailability, Trip, TripStatus, Vehicle } from "@/lib/types";
import { localDateTimeToIso, toDateTimeLocal } from "@/lib/time";
import { saveTripAction, type ActionState } from "@/app/actions/trips";

const initialState: ActionState = {};
const labels: Record<string, string> = { scheduled: "Scheduled", confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

export function TripForm({ trip, copyMode = false, drivers, vehicles, trips, availability, timezone }: {
  trip?: Trip;
  copyMode?: boolean;
  drivers: Driver[];
  vehicles: Vehicle[];
  trips: Trip[];
  availability: DriverAvailability[];
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(saveTripAction, initialState);
  const [driverIds, setDriverIds] = useState<string[]>(trip?.drivers?.map((driver) => driver.id) ?? []);
  const [vehicleId, setVehicleId] = useState(trip?.vehicle_id ?? "");
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? "scheduled");
  const [startLocal, setStartLocal] = useState(copyMode ? "" : toDateTimeLocal(trip?.starts_at, timezone));
  const [returnLocal, setReturnLocal] = useState(copyMode ? "" : toDateTimeLocal(trip?.estimated_return_at, timezone));
  const [passengers, setPassengers] = useState(trip?.passenger_count ?? 1);
  const warnings = useMemo(() => {
    if (!startLocal || !returnLocal || !driverIds.length || !vehicleId || !["scheduled", "confirmed", "in_progress"].includes(status)) return [];
    const start = new Date(localDateTimeToIso(startLocal, timezone)).getTime();
    const end = new Date(localDateTimeToIso(returnLocal, timezone)).getTime();
    if (end <= start) return [];
    const issues: string[] = [];
    const conflict = trips.find((item) => item.id !== trip?.id && ["scheduled", "confirmed", "in_progress"].includes(item.status)
      && new Date(item.starts_at).getTime() < end && new Date(item.estimated_return_at).getTime() > start
      && (item.vehicle_id === vehicleId || item.drivers?.some((driver) => driverIds.includes(driver.id))));
    if (conflict) issues.push(`${conflict.destination} already uses a selected driver or vehicle at ${new Intl.DateTimeFormat("en-PH", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(conflict.starts_at))}.`);
    const off = availability.find((item) => driverIds.includes(item.driver_id) && new Date(item.starts_at).getTime() < end && new Date(item.ends_at).getTime() > start);
    if (off) issues.push(`${off.driver?.full_name || "A selected driver"} is marked unavailable during this time.`);
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (vehicle && passengers > vehicle.capacity) issues.push(`This vehicle seats ${vehicle.capacity}; passenger count is ${passengers}.`);
    return issues;
  }, [startLocal, returnLocal, driverIds, vehicleId, status, trips, trip?.id, availability, vehicles, passengers, timezone]);

  const canAssignVehicle = vehicles.some((vehicle) => vehicle.service_status === "available");
  const activeDrivers = drivers.filter((driver) => driver.employment_status === "active");
  return <form action={formAction} className="trip-form">
    {trip?.id && <input type="hidden" name="trip_id" value={trip.id} />}
    {copyMode && <div className="notice info"><b>Trip copied.</b> Set a new departure and return time, then review the assignments.</div>}
    {(state.error || warnings.length > 0) && <div className={`notice ${state.error ? "error" : "warning"}`} role="alert"><b>{state.error ? "Could not save this trip" : "Check the schedule"}</b><ul>{state.error && <li>{state.error}</li>}{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}
    <section className="form-section"><div className="form-section-head"><span className="form-step">01</span><div><h2>Trip details</h2><p>Where you’re going and who you’re taking.</p></div></div><div className="form-grid two-col">
      <label>Pickup location <span className="required">*</span><input name="pickup_location" defaultValue={trip?.pickup_location} placeholder="e.g. Makati office" required /></label>
      <label>Destination <span className="required">*</span><input name="destination" defaultValue={trip?.destination} placeholder="e.g. Batangas Port" required /></label>
      <label>Client or passenger lead<input name="client_name" defaultValue={trip?.client_name} placeholder="Name or company" /></label>
      <label>Contact number<input name="client_phone" type="tel" defaultValue={trip?.client_phone} placeholder="09xx xxx xxxx" /></label>
      <label>Passenger count<input name="passenger_count" type="number" min="1" max="100" value={passengers} onChange={(event) => setPassengers(Number(event.target.value) || 1)} required /></label>
      <label>Trip status<select name="status" value={status} onChange={(event) => setStatus(event.target.value as TripStatus)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div></section>

    <section className="form-section"><div className="form-section-head"><span className="form-step">02</span><div><h2>Time and assignment</h2><p>Pick the time, drivers, and vehicle for this trip.</p></div></div><div className="form-grid two-col">
      <label>Departure <span className="required">*</span><input name="starts_at_local" type="datetime-local" value={startLocal} onChange={(event) => setStartLocal(event.target.value)} required /></label>
      <label>Estimated return <span className="required">*</span><input name="estimated_return_local" type="datetime-local" value={returnLocal} onChange={(event) => setReturnLocal(event.target.value)} required /></label>
    </div>
    <div className="assignment-layout"><div className="assignment-field"><div className="field-title">Assign driver(s) <span className="required">*</span><small>Choose one or more</small></div>{activeDrivers.length ? <div className="driver-options">{activeDrivers.map((driver) => <label className="driver-option" key={driver.id}><input type="checkbox" name="driver_ids" value={driver.id} checked={driverIds.includes(driver.id)} onChange={(event) => setDriverIds((previous) => event.target.checked ? [...previous, driver.id] : previous.filter((id) => id !== driver.id))} /><span className="option-check">✓</span><span className="driver-option-copy"><b>{driver.full_name}</b><small>{driver.phone || "No phone saved"}</small></span></label>)}</div> : <div className="empty-assignment">No active drivers yet. <Link href="/drivers">Add a driver →</Link></div>}</div>
      <div className="assignment-field"><label className="field-title" htmlFor="vehicle-id">Vehicle <span className="required">*</span><small>Must be available</small></label><select id="vehicle-id" name="vehicle_id" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} required><option value="">Choose a vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id} disabled={vehicle.service_status !== "available"}>{vehicle.label} · {vehicle.plate_number} · {vehicle.capacity} seats{vehicle.service_status === "available" ? "" : ` (${vehicle.service_status.replaceAll("_", " ")})`}</option>)}</select>{!canAssignVehicle && <div className="empty-assignment">No available vehicles. <Link href="/vehicles">Check fleet status →</Link></div>}</div></div>
    </section>

    <section className="form-section"><div className="form-section-head"><span className="form-step">03</span><div><h2>Notes and requirements</h2><p>Share details the team needs before departure.</p></div></div><div className="form-grid two-col">
      <label>Special requirements<textarea name="special_requirements" defaultValue={trip?.special_requirements} placeholder="Accessibility, luggage, child seats…" rows={3} /></label>
      <label>Internal notes<textarea name="notes" defaultValue={trip?.notes} placeholder="Anything the office or drivers should know" rows={3} /></label>
    </div></section>
    <div className="form-actions"><Link className="button secondary" href={trip?.id ? `/trips/${trip.id}` : "/schedule"}>Cancel</Link><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : trip?.id ? "Save changes" : "Save trip"}<span aria-hidden="true">→</span></button></div>
  </form>;
}
