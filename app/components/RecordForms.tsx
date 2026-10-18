"use client";

import { useActionState } from "react";
import { createDriverAction, createVehicleAction } from "@/app/actions/records";

const initialState = {};

export function DriverCreateForm() {
  const [state, action, pending] = useActionState(createDriverAction, initialState);
  return <form action={action} className="stack-form record-form">
    <div className="form-grid two-col"><label>Full name <span className="required">*</span><input name="full_name" placeholder="Driver name" required /></label><label>Phone number<input name="phone" type="tel" placeholder="09xx xxx xxxx" /></label><label>Email address<input name="email" type="email" placeholder="driver@email.com" /></label><label>License number<input name="license_number" placeholder="License number" /></label><label>License expiry<input name="license_expiry" type="date" /></label><label>Emergency contact name<input name="emergency_contact_name" placeholder="Name" /></label><label>Emergency contact number<input name="emergency_contact_phone" type="tel" placeholder="Phone number" /></label><label>Notes<input name="notes" placeholder="Optional note" /></label></div>
    {state.error && <div className="notice error compact-notice">{state.error}</div>}{state.success && <div className="notice success compact-notice">{state.success}</div>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add driver"}<span>→</span></button>
  </form>;
}

export function VehicleCreateForm() {
  const [state, action, pending] = useActionState(createVehicleAction, initialState);
  return <form action={action} className="stack-form record-form">
    <div className="form-grid two-col"><label>Vehicle name <span className="required">*</span><input name="label" placeholder="e.g. Van 03" required /></label><label>Plate number <span className="required">*</span><input name="plate_number" placeholder="ABC 1234" required /></label><label>Make and model<input name="make_model" placeholder="Toyota Hiace" /></label><label>Passenger capacity <span className="required">*</span><input name="capacity" type="number" min="1" max="100" placeholder="12" required /></label><label className="field-full">Notes<input name="notes" placeholder="Maintenance details or other notes" /></label></div>
    {state.error && <div className="notice error compact-notice">{state.error}</div>}{state.success && <div className="notice success compact-notice">{state.success}</div>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add vehicle"}<span>→</span></button>
  </form>;
}
