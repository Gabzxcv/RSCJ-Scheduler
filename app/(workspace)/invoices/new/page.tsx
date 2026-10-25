import Link from "next/link";
import { InvoiceForm } from "@/app/components/InvoiceForm";
import { requireProfile } from "@/lib/auth";
import { loadTrips, loadWorkspaceSettings } from "@/lib/data";
import { dateKey, DEFAULT_TIMEZONE } from "@/lib/time";
import type { Invoice, Trip } from "@/lib/types";

type InvoiceTrip = Pick<Trip, "id" | "destination" | "starts_at" | "client_name" | "client_phone">;

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ trip?: string; from?: string }> }) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const [params, trips, settings] = await Promise.all([
    searchParams,
    loadTrips(supabase, 500),
    loadWorkspaceSettings(supabase),
  ]);
  const invoiceTrips: InvoiceTrip[] = trips.map((trip) => ({
    id: trip.id,
    destination: trip.destination,
    starts_at: trip.starts_at,
    client_name: trip.client_name,
    client_phone: trip.client_phone,
  }));
  const selectedTrip = invoiceTrips.find((trip) => trip.id === params.trip);
  const today = dateKey(new Date(), settings?.timezone || DEFAULT_TIMEZONE);
  let template: Invoice | undefined;
  if (params.from) {
    const { data } = await supabase.from("invoices").select("*").eq("id", params.from).maybeSingle();
    if (data) template = data as Invoice;
  }

  return <>
    <div className="breadcrumbs"><Link href="/invoices">Invoices</Link><span>›</span><span>{template ? "Duplicate invoice" : "New invoice"}</span></div>
    <div className="page-heading form-page-heading"><div><p className="eyebrow">BILLING</p><h1>{template ? "Duplicate invoice" : "Create an invoice"}</h1><p className="muted">{template ? `Pre-filled from ${template.invoice_number}. A new invoice number is assigned when you save.` : "Add the client, due date, and trip charge. You can share or print the invoice after saving."}</p></div></div>
    <div className="panel invoice-form-panel"><InvoiceForm trips={invoiceTrips} selectedTrip={selectedTrip} today={today} invoice={template} mode={template ? "duplicate" : "create"} /></div>
  </>;
}
