"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { ActionState, InvoiceStatus } from "@/lib/types";

const read = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const invoiceStatuses: InvoiceStatus[] = ["draft", "sent", "paid", "void"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const invoiceFields = ["trip_id", "client_name", "client_phone", "client_email", "billing_address", "issued_on", "due_on", "currency", "notes"] as const;

function submittedValues(formData: FormData) {
  return {
    ...Object.fromEntries(invoiceFields.map((key) => [key, read(formData, key)])),
    item_description: formData.getAll("item_description").map(String),
    item_quantity: formData.getAll("item_quantity").map(String),
    item_rate: formData.getAll("item_rate").map(String),
  };
}

export async function saveInvoiceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const values = submittedValues(formData);
  const invoiceId = read(formData, "invoice_id");
  const client_name = read(formData, "client_name");
  const issued_on = read(formData, "issued_on");
  const due_on = read(formData, "due_on");
  const currency = read(formData, "currency").toUpperCase();
  const trip_id = read(formData, "trip_id") || null;
  const descriptions = formData.getAll("item_description").map((item) => String(item).trim());
  const quantities = formData.getAll("item_quantity").map((item) => Number(item));
  const rates = formData.getAll("item_rate").map((item) => Number(item));
  const itemCount = Math.max(descriptions.length, quantities.length, rates.length);
  if (itemCount > 25) return { error: "An invoice can have up to 25 line items.", values };
  const line_items = Array.from({ length: itemCount }, (_, index) => {
    const unit_price = Math.round(rates[index] * 100) / 100;
    return {
      description: descriptions[index] ?? "",
      quantity: quantities[index],
      unit_price,
      total: Math.round(quantities[index] * unit_price * 100) / 100,
    };
  });
  const amount = Math.round(line_items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const description = descriptions.filter(Boolean).join(" · ");

  if (!client_name) return { error: "Enter the client or organization to bill.", values };
  if (!line_items.length || line_items.some((item) => !item.description)) return { error: "Add a description to every invoice item.", values };
  if (line_items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price < 0)) return { error: "Enter a valid positive quantity and a rate of zero or more for every item.", values };
  if (!datePattern.test(issued_on) || !datePattern.test(due_on)) return { error: "Enter valid issue and due dates.", values };
  if (due_on < issued_on) return { error: "The due date cannot be before the issue date.", values };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Invoice total must be greater than zero.", values };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Choose a valid three-letter currency code.", values };

  if (trip_id) {
    const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("id", trip_id).maybeSingle();
    if (tripError || !trip) return { error: "That trip could not be found. Refresh the page and try again.", values };
  }

  const { data: settings } = await supabase.from("app_settings").select("payment_details").eq("singleton", true).maybeSingle();
  const invoiceData = {
    trip_id,
    client_name,
    client_email: read(formData, "client_email"),
    client_phone: read(formData, "client_phone"),
    billing_address: read(formData, "billing_address"),
    description,
    line_items,
    issued_on,
    due_on,
    amount: Math.round(amount * 100) / 100,
    currency,
    notes: read(formData, "notes"),
    payment_details: settings?.payment_details ?? "",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const invoiceQuery = invoiceId
    ? await supabase.from("invoices").update(invoiceData).eq("id", invoiceId).eq("status", "draft").select("id").maybeSingle()
    : await supabase.from("invoices").insert({ ...invoiceData, created_by: user.id }).select("id").single();
  const { data: invoice, error } = invoiceQuery;

  if (error || !invoice) return { error: error?.message || (invoiceId ? "Only draft invoices can be edited." : "Could not create the invoice."), values };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  redirect(`/invoices/${invoice.id}?${invoiceId ? "updated=1" : "created=1"}`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const id = read(formData, "invoice_id");
  const status = read(formData, "status") as InvoiceStatus;
  const returnTo = read(formData, "return_to");
  const returnPath = id && returnTo === "/invoices" ? "/invoices" : `/invoices/${id}`;
  if (!id || !invoiceStatuses.includes(status)) redirect("/invoices?error=Choose%20a%20valid%20invoice%20status");

  const { data: updated, error } = await supabase.from("invoices").update({
    status,
    paid_at: status === "paid" ? new Date().toISOString() : null,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error || !updated) redirect(`${returnPath}?error=${encodeURIComponent(error?.message || "Invoice not found.")}`);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`${returnPath}?updated=1`);
}
