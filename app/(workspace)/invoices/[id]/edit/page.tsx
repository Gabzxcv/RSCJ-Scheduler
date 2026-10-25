import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/app/components/InvoiceForm";
import { requireProfile } from "@/lib/auth";
import { loadTrips, loadWorkspaceSettings } from "@/lib/data";
import { dateKey, DEFAULT_TIMEZONE } from "@/lib/time";
import type { Invoice } from "@/lib/types";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireProfile(["boss", "secretary"]);
  const { id } = await params;
  const [{ data }, trips, settings] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    loadTrips(supabase, 500),
    loadWorkspaceSettings(supabase),
  ]);
  if (!data) notFound();
  const invoice = data as Invoice;
  if (invoice.status !== "draft") redirect(`/invoices/${id}?error=${encodeURIComponent("Only draft invoices can be edited. Void it and create a new one instead.")}`);
  const invoiceTrips = trips.map((trip) => ({ id: trip.id, destination: trip.destination, starts_at: trip.starts_at, client_name: trip.client_name, client_phone: trip.client_phone }));
  const today = dateKey(new Date(), settings?.timezone || DEFAULT_TIMEZONE);

  return <>
    <div className="breadcrumbs"><Link href="/invoices">Invoices</Link><span>›</span><Link href={`/invoices/${id}`}>{invoice.invoice_number}</Link><span>›</span><span>Edit</span></div>
    <div className="page-heading form-page-heading"><div><p className="eyebrow">BILLING</p><h1>Edit {invoice.invoice_number}</h1><p className="muted">Drafts can be changed until they are sent. After that, void the invoice and issue a new one.</p></div></div>
    <div className="panel invoice-form-panel"><InvoiceForm trips={invoiceTrips} today={today} invoice={invoice} mode="edit" /></div>
  </>;
}
