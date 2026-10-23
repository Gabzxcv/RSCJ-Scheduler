import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/app/components/InvoiceForm";
import { requireProfile } from "@/lib/auth";
import { loadTrips } from "@/lib/data";
import { dateKey, DEFAULT_TIMEZONE } from "@/lib/time";
import type { Invoice, Trip } from "@/lib/types";

type InvoiceTrip = Pick<Trip, "id" | "destination" | "starts_at" | "client_name" | "client_phone">;

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const { id } = await params;
  const [invoiceResult, trips, settings] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    loadTrips(supabase, 500),
    supabase.from("app_settings").select("timezone,payment_details").eq("singleton", true).maybeSingle(),
  ]);
  if (invoiceResult.error) throw new Error(`Could not load invoice: ${invoiceResult.error.message}`);
  if (!invoiceResult.data) notFound();
  const invoice = invoiceResult.data as Invoice;
  if (invoice.status !== "draft") redirect(`/invoices/${id}?error=Only%20draft%20invoices%20can%20be%20edited.`);
  const invoiceTrips: InvoiceTrip[] = trips.map(({ id: tripId, destination, starts_at, client_name, client_phone }) => ({ id: tripId, destination, starts_at, client_name, client_phone }));
  let selectedTrip = invoiceTrips.find((trip) => trip.id === invoice.trip_id);
  if (invoice.trip_id && !selectedTrip) {
    const linked = await supabase.from("trips").select("id,destination,starts_at,client_name,client_phone").eq("id", invoice.trip_id).maybeSingle();
    if (linked.error) throw new Error(`Could not load linked trip: ${linked.error.message}`);
    if (linked.data) {
      selectedTrip = linked.data;
      invoiceTrips.push(linked.data);
    }
  }
  const today = dateKey(new Date(), settings.data?.timezone || DEFAULT_TIMEZONE);

  return <>
    <div className="breadcrumbs"><Link href={`/invoices/${id}`}>{invoice.invoice_number}</Link><span>›</span><span>Edit draft</span></div>
    <div className="page-heading form-page-heading"><div><p className="eyebrow">BILLING</p><h1>Edit draft invoice</h1><p className="muted">Update the details before marking this invoice as sent.</p></div></div>
    <div className="panel invoice-form-panel"><InvoiceForm trips={invoiceTrips} selectedTrip={selectedTrip} today={today} invoice={invoice} paymentDetails={settings.data?.payment_details ?? ""} /></div>
  </>;
}
