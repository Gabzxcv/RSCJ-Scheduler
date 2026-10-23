"use client";

import { useActionState, useEffect, useState } from "react";
import { saveInvoiceAction } from "@/app/actions/invoices";
import type { ActionState, Invoice, Trip } from "@/lib/types";
import { shiftDateKey } from "@/lib/time";

type InvoiceTrip = Pick<Trip, "id" | "destination" | "starts_at" | "client_name" | "client_phone">;
type EditableLine = { description: string; quantity: string; rate: string };

export function InvoiceForm({ trips, selectedTrip, today, invoice, paymentDetails = "" }: { trips: InvoiceTrip[]; selectedTrip?: InvoiceTrip; today: string; invoice?: Invoice; paymentDetails?: string }) {
  const [state, action, pending] = useActionState(saveInvoiceAction, {} as ActionState);
  const recovered = state.values ?? {};
  const field = (name: string, fallback = "") => typeof recovered[name] === "string" ? recovered[name] as string : fallback;
  const linkedTrip = selectedTrip ?? trips.find((trip) => trip.id === invoice?.trip_id);
  const [tripId, setTripId] = useState(invoice?.trip_id ?? linkedTrip?.id ?? "");
  const [clientName, setClientName] = useState(invoice?.client_name ?? linkedTrip?.client_name ?? "");
  const [clientPhone, setClientPhone] = useState(invoice?.client_phone ?? linkedTrip?.client_phone ?? "");
  const defaultDescription = invoice?.description ?? (linkedTrip ? `Transport service to ${linkedTrip.destination}` : "Transportation service");
  const initialLines: EditableLine[] = invoice?.line_items?.length
    ? invoice.line_items.map((line) => ({ description: line.description, quantity: String(line.quantity), rate: String(line.unit_price) }))
    : [{ description: defaultDescription, quantity: "1", rate: invoice ? String(invoice.amount) : "" }];
  const [lines, setLines] = useState<EditableLine[]>(initialLines);

  useEffect(() => {
    const values = state.values;
    if (!values) return;
    const read = (name: string) => typeof values[name] === "string" ? [values[name] as string] : Array.isArray(values[name]) ? values[name] as string[] : [];
    setTripId(read("trip_id")[0] ?? "");
    setClientName(read("client_name")[0] ?? "");
    setClientPhone(read("client_phone")[0] ?? "");
    const descriptions = read("item_description");
    const quantities = read("item_quantity");
    const rates = read("item_rate");
    if (descriptions.length) setLines(descriptions.map((description, index) => ({ description, quantity: quantities[index] ?? "1", rate: rates[index] ?? "" })));
  }, [state.values]);

  function chooseTrip(id: string) {
    setTripId(id);
    const trip = trips.find((item) => item.id === id);
    if (!trip) return;
    setClientName(trip.client_name || "");
    setClientPhone(trip.client_phone || "");
    setLines((current) => current.map((line, index) => index === 0 ? { ...line, description: `Transport service to ${trip.destination}` } : line));
  }

  function updateLine(index: number, key: keyof EditableLine, value: string) {
    setLines((current) => current.map((line, row) => row === index ? { ...line, [key]: value } : line));
  }

  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0), 0);

  return <form key={JSON.stringify(state.values ?? {})} action={action} className="stack-form invoice-form">
    {invoice && <input type="hidden" name="invoice_id" value={invoice.id} />}
    <section className="invoice-form-section">
      <div><p className="eyebrow">TRIP LINK</p><h2>What is this invoice for?</h2><p className="muted">Link it to a trip for easy reference, or leave it unlinked.</p></div>
      <label className="invoice-field">Trip<select name="trip_id" value={tripId} onChange={(event) => chooseTrip(event.target.value)}><option value="">No trip linked</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.destination} · {trip.starts_at.slice(0, 10)}</option>)}</select></label>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">BILL TO</p><h2>Client details</h2></div>
      <div className="invoice-fields-grid">
        <label className="invoice-field">Client or organization<input name="client_name" autoComplete="name" enterKeyHint="next" value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={120} required /></label>
        <label className="invoice-field">Phone number<input name="client_phone" autoComplete="tel" enterKeyHint="next" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} type="tel" maxLength={40} /></label>
        <label className="invoice-field">Email address<input name="client_email" autoComplete="email" enterKeyHint="next" type="email" maxLength={160} defaultValue={field("client_email", invoice?.client_email)} /></label>
        <label className="invoice-field">Billing address<input name="billing_address" autoComplete="street-address" enterKeyHint="next" maxLength={240} defaultValue={field("billing_address", invoice?.billing_address)} /></label>
      </div>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">CHARGES AND DATES</p><h2>Invoice details</h2></div>
      <div className="invoice-fields-grid">
        <label className="invoice-field">Issue date<input name="issued_on" type="date" defaultValue={field("issued_on", invoice?.issued_on ?? today)} required /></label>
        <label className="invoice-field">Due date<input name="due_on" type="date" defaultValue={field("due_on", invoice?.due_on ?? shiftDateKey(today, 14))} required /></label>
      </div>
      <input type="hidden" name="currency" value="PHP" />
      <div className="invoice-lines-editor">
        {lines.map((line, index) => <div className="invoice-edit-line" key={index}>
          <label className="invoice-field">Item description<input name="item_description" value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} maxLength={240} placeholder="Transportation service" required /></label>
          <label className="invoice-field">Quantity<input name="item_quantity" type="number" min="0.01" step="0.01" inputMode="decimal" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} required /></label>
          <label className="invoice-field">Rate (PHP)<input name="item_rate" type="number" min="0" step="0.01" inputMode="decimal" value={line.rate} onChange={(event) => updateLine(index, "rate", event.target.value)} required /></label>
          <button type="button" className="button secondary remove-invoice-line" onClick={() => setLines((current) => current.length > 1 ? current.filter((_, row) => row !== index) : current)} disabled={lines.length === 1} aria-label={`Remove item ${index + 1}`}>Remove</button>
        </div>)}
        <div className="invoice-lines-bottom"><button type="button" className="button secondary" onClick={() => setLines((current) => current.length < 25 ? [...current, { description: "", quantity: "1", rate: "" }] : current)} disabled={lines.length >= 25}>＋ Add line item</button><b>Invoice total <span>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(total)}</span></b></div>
      </div>
    </section>

    <section className="invoice-form-section">
      <div><p className="eyebrow">EXTRA DETAILS</p><h2>Notes</h2><p className="muted">Payment instructions are managed in Settings. Add any other invoice notes here.</p></div>
      <label className="invoice-field"><span className="sr-only">Invoice notes</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Payment terms or other notes" defaultValue={field("notes", invoice?.notes)} /></label>
    </section>

    {paymentDetails && <section className="invoice-form-section"><div><p className="eyebrow">PAYMENT</p><h2>Saved payment details</h2><p className="muted">These details are copied onto this invoice when it is saved.</p></div><div className="invoice-payment-preview">{paymentDetails}</div></section>}

    {state.error && <div className="notice error">{state.error}</div>}
    <div className="form-actions invoice-form-actions"><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving invoice…" : invoice ? "Save draft" : "Create invoice"}</button></div>
  </form>;
}
