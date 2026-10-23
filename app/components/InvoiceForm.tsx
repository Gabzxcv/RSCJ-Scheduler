"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createInvoiceAction } from "@/app/actions/invoices";
import type { ActionState, Trip } from "@/lib/types";
import { shiftDateKey } from "@/lib/time";

type InvoiceTrip = Pick<Trip, "id" | "destination" | "starts_at" | "client_name" | "client_phone">;

export function InvoiceForm({ trips, selectedTrip, today }: { trips: InvoiceTrip[]; selectedTrip?: InvoiceTrip; today: string }) {
  const [state, action, pending] = useActionState(createInvoiceAction, {} as ActionState);
  const [tripId, setTripId] = useState(selectedTrip?.id ?? "");
  const [clientName, setClientName] = useState(selectedTrip?.client_name ?? "");
  const [clientPhone, setClientPhone] = useState(selectedTrip?.client_phone ?? "");
  const [description, setDescription] = useState(selectedTrip ? `Transport service to ${selectedTrip.destination}` : "Transportation service");

  function chooseTrip(id: string) {
    setTripId(id);
    const trip = trips.find((item) => item.id === id);
    if (!trip) return;
    setClientName(trip.client_name || "");
    setClientPhone(trip.client_phone || "");
    setDescription(`Transport service to ${trip.destination}`);
  }

  return <form action={action} className="stack-form invoice-form">
    <section className="invoice-form-section">
      <div><p className="eyebrow">TRIP LINK</p><h2>What is this invoice for?</h2><p className="muted">Link it to a trip for easy reference, or leave it unlinked.</p></div>
      <label className="invoice-field">Trip<select name="trip_id" value={tripId} onChange={(event) => chooseTrip(event.target.value)}><option value="">No trip linked</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.destination} · {trip.starts_at.slice(0, 10)}</option>)}</select></label>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">BILL TO</p><h2>Client details</h2></div>
      <div className="invoice-fields-grid">
        <label className="invoice-field">Client or organization<input name="client_name" value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={120} required /></label>
        <label className="invoice-field">Phone number<input name="client_phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} type="tel" maxLength={40} /></label>
        <label className="invoice-field">Email address<input name="client_email" type="email" maxLength={160} /></label>
        <label className="invoice-field">Billing address<input name="billing_address" maxLength={240} /></label>
      </div>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">CHARGES AND DATES</p><h2>Invoice details</h2></div>
      <div className="invoice-fields-grid">
        <label className="invoice-field invoice-field-wide">Description<input name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} required /></label>
        <label className="invoice-field">Issue date<input name="issued_on" type="date" defaultValue={today} required /></label>
        <label className="invoice-field">Due date<input name="due_on" type="date" defaultValue={shiftDateKey(today, 14)} required /></label>
        <label className="invoice-field">Amount (PHP)<input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" required /></label>
      </div>
      <input type="hidden" name="currency" value="PHP" />
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">EXTRA DETAILS</p><h2>Notes</h2><p className="muted">Optional payment instructions or internal notes.</p></div>
      <label className="invoice-field"><span className="sr-only">Invoice notes</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Payment instructions, terms, or other notes" /></label>
    </section>

    {state.error && <div className="notice error">{state.error}</div>}
    <div className="form-actions invoice-form-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Creating invoice…" : "Create invoice"}</button></div>
  </form>;
}
