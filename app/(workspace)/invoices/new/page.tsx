import Link from "next/link";
import { InvoiceForm } from "@/app/components/InvoiceForm";
import { requireProfile } from "@/lib/auth";
import { loadTrips } from "@/lib/data";
import { dateKey, DEFAULT_TIMEZONE } from "@/lib/time";
import type { Trip } from "@/lib/types";

type InvoiceTrip = Pick<Trip, "id" | "destination" | "starts_at" | "client_name" | "client_phone">;

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const [params, trips, settings] = await Promise.all([
    searchParams,
    loadTrips(supabase, 500),
    supabase.from("app_settings").select("timezone,payment_details").eq("singleton", true).maybeSingle(),
  ]);
  const invoiceTrips: InvoiceTrip[] = trips.map((trip) => ({
    id: trip.id,
    destination: trip.destination,
    starts_at: trip.starts_at,
    client_name: trip.client_name,
    client_phone: trip.client_phone,
  }));
  const selectedTrip = invoiceTrips.find((trip) => trip.id === params.trip);
  const today = dateKey(new Date(), settings.data?.timezone || DEFAULT_TIMEZONE);

  return <>
    <div className="breadcrumbs"><Link href="/invoices">Invoices</Link><span>›</span><span>New invoice</span></div>
    <div className="page-heading form-page-heading"><div><p className="eyebrow">BILLING</p><h1>Create an invoice</h1><p className="muted">Add the client, due date, and trip charge. You can print the invoice after saving.</p></div></div>
    <div className="panel invoice-form-panel"><InvoiceForm trips={invoiceTrips} selectedTrip={selectedTrip} today={today} paymentDetails={settings.data?.payment_details ?? ""} /></div>
  </>;
}
