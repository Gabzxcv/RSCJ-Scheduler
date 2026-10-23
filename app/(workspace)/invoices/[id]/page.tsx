import Link from "next/link";
import { notFound } from "next/navigation";
import { updateInvoiceStatusAction } from "@/app/actions/invoices";
import { PrintButton } from "@/app/components/PrintButton";
import { InvoiceShareButton } from "@/app/components/InvoiceShareButton";
import { requireProfile } from "@/lib/auth";
import { dateKey, DEFAULT_TIMEZONE, formatDate } from "@/lib/time";
import type { Invoice } from "@/lib/types";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(amount);
}

export default async function InvoiceDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; updated?: string; error?: string }> }) {
  const { supabase } = await requireProfile();
  const [{ id }, notice] = await Promise.all([params, searchParams]);
  const query = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (query.error) throw new Error(`Could not load invoice: ${query.error.message}`);
  if (!query.data) notFound();
  const invoice = query.data as Invoice;
  const [tripResult, settings] = await Promise.all([
    invoice.trip_id ? supabase.from("trips").select("id,destination,starts_at").eq("id", invoice.trip_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("app_settings").select("business_name,timezone").eq("singleton", true).maybeSingle(),
  ]);
  if (tripResult.error) throw new Error(`Could not load linked trip: ${tripResult.error.message}`);
  const businessName = settings.data?.business_name || "RSCJ Transport";
  const lineItems = invoice.line_items?.length ? invoice.line_items : [{ description: invoice.description, quantity: 1, unit_price: Number(invoice.amount), total: Number(invoice.amount) }];
  const today = dateKey(new Date(), settings.data?.timezone || DEFAULT_TIMEZONE);
  const overdue = (invoice.status === "draft" || invoice.status === "sent") && invoice.due_on < today;
  const status = overdue ? "overdue" : invoice.status;
  const statusLabel = status === "overdue" ? "Overdue" : status[0].toUpperCase() + status.slice(1);

  return <>
    <div className="breadcrumbs"><Link href="/invoices">Invoices</Link><span>›</span><span>{invoice.invoice_number}</span></div>
    {notice.error && <div className="notice error">{notice.error}</div>}
    {notice.created && <div className="notice success">Invoice created.</div>}
    {notice.updated && <div className="notice success">Invoice updated.</div>}
    <div className="page-heading invoice-detail-heading"><div><p className="eyebrow">INVOICE</p><h1>{invoice.invoice_number}</h1><p className="muted">Review, share, print, or update this invoice.</p></div><div className="invoice-detail-actions">{invoice.status === "draft" && <Link className="button secondary" href={`/invoices/${invoice.id}/edit`}>Edit draft</Link>}<InvoiceShareButton invoiceNumber={invoice.invoice_number} client={invoice.client_name} amount={money(Number(invoice.amount), invoice.currency)} dueDate={formatDate(invoice.due_on)} email={invoice.client_email} phone={invoice.client_phone} paymentDetails={invoice.payment_details ?? ""} /><PrintButton>Print / save as PDF</PrintButton><Link className="button secondary" href="/invoices">← All invoices</Link></div></div>

    <article className="panel invoice-document">
      <header className="invoice-document-header"><div><span className="brand-mark small">RSCJ</span><div><b>{businessName}</b><small>Transportation services</small></div></div><div className="invoice-document-title"><span className={`status-badge ${status}`}>{statusLabel}</span><h2>INVOICE</h2><b>{invoice.invoice_number}</b></div></header>
      <div className="invoice-document-rule" />
      <section className="invoice-document-parties"><div><span className="eyebrow">BILL TO</span><h2>{invoice.client_name}</h2>{invoice.billing_address && <p>{invoice.billing_address}</p>}{invoice.client_email && <a href={`mailto:${invoice.client_email}`}>{invoice.client_email}</a>}{invoice.client_phone && <a href={`tel:${invoice.client_phone}`}>{invoice.client_phone}</a>}</div><div className="invoice-date-block"><div><span>Issue date</span><b>{formatDate(invoice.issued_on)}</b></div><div><span>Due date</span><b>{formatDate(invoice.due_on)}</b></div>{tripResult.data && <div><span>Trip</span><Link href={`/trips/${tripResult.data.id}`}>{tripResult.data.destination}</Link></div>}</div></section>
      <section className="invoice-line-items"><div className="invoice-line-header"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{lineItems.map((line, index) => <div className="invoice-line" key={`${line.description}-${index}`}><span>{line.description}</span><span>{line.quantity}</span><span>{money(Number(line.unit_price), invoice.currency)}</span><b>{money(Number(line.total), invoice.currency)}</b></div>)}<div className="invoice-total"><span>Total due</span><b>{money(Number(invoice.amount), invoice.currency)}</b></div></section>
      {invoice.payment_details && <section className="invoice-notes"><span className="eyebrow">PAYMENT DETAILS</span><p>{invoice.payment_details}</p></section>}
      {invoice.notes && <section className="invoice-notes"><span className="eyebrow">NOTES</span><p>{invoice.notes}</p></section>}
      <footer className="invoice-document-footer">Thank you for your business.</footer>
    </article>

    <section className="panel invoice-update-panel hide-on-print"><div><p className="eyebrow">PAYMENT TRACKING</p><h2>Update invoice status</h2><p className="muted">Mark it sent, paid, or void as the payment progresses.</p></div><div className="invoice-detail-actions"><form action={updateInvoiceStatusAction} className="invoice-status-form"><input type="hidden" name="invoice_id" value={invoice.id} /><label><span className="sr-only">Invoice status</span><select name="status" defaultValue={invoice.status}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option></select></label><button type="submit" className="button primary">Save status</button></form>{(invoice.status === "draft" || invoice.status === "sent") && <form action={updateInvoiceStatusAction}><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="status" value="paid" /><button type="submit" className="button secondary">Mark paid</button></form>}</div></section>
  </>;
}
