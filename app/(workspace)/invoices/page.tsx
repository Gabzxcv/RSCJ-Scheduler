import Link from "next/link";
import { updateInvoiceStatusAction } from "@/app/actions/invoices";
import { requireProfile } from "@/lib/auth";
import { DEFAULT_TIMEZONE, dateKey, formatDate } from "@/lib/time";
import type { Invoice } from "@/lib/types";

function displayStatus(invoice: Invoice, today: string) {
  if ((invoice.status === "draft" || invoice.status === "sent") && invoice.due_on < today) return "overdue";
  return invoice.status;
}

function money(amount: number, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(amount);
}

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; error?: string; updated?: string }> }) {
  const { supabase } = await requireProfile();
  const [params, query, settings] = await Promise.all([
    searchParams,
    supabase.from("invoices").select("*").order("due_on", { ascending: true }).limit(500),
    supabase.from("app_settings").select("timezone").eq("singleton", true).maybeSingle(),
  ]);
  if (query.error) throw new Error(`Could not load invoices: ${query.error.message}`);
  const invoices = (query.data ?? []) as Invoice[];
  const today = dateKey(new Date(), settings.data?.timezone || DEFAULT_TIMEZONE);
  const search = (params.q ?? "").trim().toLowerCase();
  const filtered = invoices.filter((invoice) => {
    const status = displayStatus(invoice, today);
    if (params.status && params.status !== "all" && status !== params.status) return false;
    if (!search) return true;
    return [invoice.invoice_number, invoice.client_name, invoice.description].some((value) => value.toLowerCase().includes(search));
  });
  const outstanding = invoices.filter((invoice) => invoice.status === "draft" || invoice.status === "sent").reduce((total, invoice) => total + Number(invoice.amount), 0);
  const overdue = invoices.filter((invoice) => displayStatus(invoice, today) === "overdue");
  const paid = invoices.filter((invoice) => invoice.status === "paid").reduce((total, invoice) => total + Number(invoice.amount), 0);

  return <>
    <div className="page-heading invoice-page-heading"><div><p className="eyebrow">BILLING AND PAYMENTS</p><h1>Invoices</h1><p className="muted">Create bills for trips and track what has been paid.</p></div><Link className="button primary" href="/invoices/new"><span>＋</span> New invoice</Link></div>
    {params.error && <div className="notice error">{params.error}</div>}
    {params.updated && <div className="notice success">Invoice status updated.</div>}
    <section className="invoice-metrics" aria-label="Invoice totals">
      <article className="invoice-metric"><span>Outstanding</span><b>{money(outstanding)}</b><small>{invoices.filter((invoice) => invoice.status === "draft" || invoice.status === "sent").length} unpaid invoices</small></article>
      <article className="invoice-metric overdue-metric"><span>Overdue</span><b>{money(overdue.reduce((total, invoice) => total + Number(invoice.amount), 0))}</b><small>{overdue.length} past due</small></article>
      <article className="invoice-metric paid-metric"><span>Paid</span><b>{money(paid)}</b><small>{invoices.filter((invoice) => invoice.status === "paid").length} paid invoices</small></article>
    </section>

    <form className="invoice-filters panel" action="/invoices">
      <label className="invoice-search">Search<input name="q" defaultValue={params.q} placeholder="Invoice number or client" /></label>
      <label className="invoice-filter-status">Status<select name="status" defaultValue={params.status || "all"}><option value="all">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="overdue">Overdue</option><option value="paid">Paid</option><option value="void">Void</option></select></label>
      <button className="button secondary" type="submit">Filter</button>
    </form>

    <section className="invoice-list" aria-label="Invoices">
      {filtered.length ? filtered.map((invoice) => {
        const status = displayStatus(invoice, today);
        return <article className="invoice-card panel" key={invoice.id}>
          <div className="invoice-card-top"><div><span className={`status-badge ${status}`}>{status === "overdue" ? "Overdue" : status[0].toUpperCase() + status.slice(1)}</span><p className="invoice-number">{invoice.invoice_number}</p></div><b className="invoice-card-amount">{money(Number(invoice.amount), invoice.currency)}</b></div>
          <Link className="invoice-client" href={`/invoices/${invoice.id}`}><b>{invoice.client_name}</b><span>{invoice.description}</span></Link>
          <div className="invoice-card-meta"><span>Issued <b>{formatDate(invoice.issued_on)}</b></span><span>Due <b>{formatDate(invoice.due_on)}</b></span></div>
          <div className="invoice-card-actions"><form action={updateInvoiceStatusAction} className="invoice-status-form"><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="return_to" value="/invoices" /><label><span className="sr-only">Status for {invoice.invoice_number}</span><select name="status" defaultValue={invoice.status}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option></select></label><button className="button secondary small-button" type="submit">Update status</button></form>{(invoice.status === "draft" || invoice.status === "sent") && <form action={updateInvoiceStatusAction}><input type="hidden" name="invoice_id" value={invoice.id} /><input type="hidden" name="status" value="paid" /><input type="hidden" name="return_to" value="/invoices" /><button className="button primary small-button" type="submit">Mark paid</button></form>}{invoice.status === "draft" && <Link href={`/invoices/${invoice.id}/edit`} className="text-link">Edit draft</Link>}<Link href={`/invoices/${invoice.id}`} className="text-link">View invoice →</Link></div>
        </article>;
      }) : <div className="panel invoice-empty"><span className="empty-icon">＄</span><h2>{invoices.length ? "No invoices match those filters" : "No invoices yet"}</h2><p>{invoices.length ? "Try another search or status." : "Create your first invoice to start tracking payments."}</p>{!invoices.length && <Link className="button primary" href="/invoices/new">Create invoice</Link>}</div>}
    </section>
  </>;
}
