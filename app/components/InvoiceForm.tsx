"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createInvoiceAction, updateInvoiceAction } from "@/app/actions/invoices";
import type { ActionState, Invoice, Trip } from "@/lib/types";
import { shiftDateKey } from "@/lib/time";
import { useFormSubmit } from "@/app/components/useFormSubmit";

type InvoiceTrip = Pick<Trip, "id" | "destination" | "starts_at" | "client_name" | "client_phone">;

/**
 * mode "create": blank invoice (optionally pre-filled from a trip).
 * mode "duplicate": new invoice pre-filled from an existing one.
 * mode "edit": change a draft invoice.
 */
export function InvoiceForm({ trips, selectedTrip, today, invoice, mode = "create" }: {
  trips: InvoiceTrip[];
  selectedTrip?: InvoiceTrip;
  today: string;
  invoice?: Invoice;
  mode?: "create" | "duplicate" | "edit";
}) {
  const editing = mode === "edit" && Boolean(invoice);
  const [state, action, pending] = useActionState(editing ? updateInvoiceAction : createInvoiceAction, {} as ActionState);
  const { ref, onSubmit } = useFormSubmit(action);
  const [tripId, setTripId] = useState(invoice?.trip_id ?? selectedTrip?.id ?? "");
  const [clientName, setClientName] = useState(invoice?.client_name ?? selectedTrip?.client_name ?? "");
  const [clientPhone, setClientPhone] = useState(invoice?.client_phone ?? selectedTrip?.client_phone ?? "");
  const [description, setDescription] = useState(invoice?.description ?? (selectedTrip ? `Transport service to ${selectedTrip.destination}` : "Transportation service"));
  const issuedDefault = editing ? invoice?.issued_on : today;
  const dueDefault = editing ? invoice?.due_on : shiftDateKey(today, 14);

  function chooseTrip(id: string) {
    setTripId(id);
    const trip = trips.find((item) => item.id === id);
    if (!trip) return;
    setClientName(trip.client_name || "");
    setClientPhone(trip.client_phone || "");
    setDescription(`Transport service to ${trip.destination}`);
  }

  return <form ref={ref} onSubmit={onSubmit} className="stack-form invoice-form">
    {editing && invoice && <input type="hidden" name="invoice_id" value={invoice.id} />}
    <section className="invoice-form-section">
      <div><p className="eyebrow">TRIP LINK</p><h2>What is this invoice for?</h2><p className="muted">Link it to a trip for easy reference, or leave it unlinked.</p></div>
      <label className="invoice-field">Trip<select name="trip_id" value={tripId} onChange={(event) => chooseTrip(event.target.value)}><option value="">No trip linked</option>{tripId && !trips.some((trip) => trip.id === tripId) && <option value={tripId}>Linked trip (unchanged)</option>}{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.destination} · {trip.starts_at.slice(0, 10)}</option>)}</select></label>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">BILL TO</p><h2>Client details</h2></div>
      <div className="invoice-fields-grid">
        <label className="invoice-field">Client or organization<input name="client_name" value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={120} autoComplete="organization" required /></label>
        <label className="invoice-field">Phone number<input name="client_phone" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" maxLength={40} /></label>
        <label className="invoice-field">Email address<input name="client_email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" maxLength={160} defaultValue={invoice?.client_email} /></label>
        <label className="invoice-field">Billing address<input name="billing_address" autoComplete="street-address" maxLength={240} defaultValue={invoice?.billing_address} /></label>
      </div>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">CHARGES AND DATES</p><h2>Invoice details</h2></div>
      <div className="invoice-fields-grid">
        <label className="invoice-field invoice-field-wide">Description<input name="description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} required /></label>
        <label className="invoice-field">Issue date<input name="issued_on" type="date" defaultValue={issuedDefault} required /></label>
        <label className="invoice-field">Due date<input name="due_on" type="date" defaultValue={dueDefault} required /></label>
        <label className="invoice-field">Amount (PHP)<input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" enterKeyHint="next" placeholder="0.00" defaultValue={invoice ? Number(invoice.amount).toFixed(2) : undefined} required /></label>
      </div>
      <input type="hidden" name="currency" value={invoice?.currency ?? "PHP"} />
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">EXTRA DETAILS</p><h2>Notes</h2><p className="muted">Optional payment instructions (for example GCash or bank details) or internal notes. These print on the invoice.</p></div>
      <label className="invoice-field"><span className="sr-only">Invoice notes</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Payment instructions, terms, or other notes" defaultValue={invoice?.notes} /></label>
    </section>

    {state.error && <div className="notice error" role="alert">{state.error}</div>}
    <div className="form-actions invoice-form-actions">
      {editing && invoice && <Link className="button secondary" href={`/invoices/${invoice.id}`}>Cancel</Link>}
      <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Create invoice"}</button>
    </div>
  </form>;
}
