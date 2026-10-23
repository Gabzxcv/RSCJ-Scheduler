"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { ActionState, InvoiceStatus } from "@/lib/types";

const read = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const invoiceStatuses: InvoiceStatus[] = ["draft", "sent", "paid", "void"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function createInvoiceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const client_name = read(formData, "client_name");
  const description = read(formData, "description");
  const issued_on = read(formData, "issued_on");
  const due_on = read(formData, "due_on");
  const amount = Number(read(formData, "amount"));
  const currency = read(formData, "currency").toUpperCase();
  const trip_id = read(formData, "trip_id") || null;

  if (!client_name) return { error: "Enter the client or organization to bill." };
  if (!description) return { error: "Add a description for this invoice." };
  if (!datePattern.test(issued_on) || !datePattern.test(due_on)) return { error: "Enter valid issue and due dates." };
  if (due_on < issued_on) return { error: "The due date cannot be before the issue date." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than zero." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Choose a valid three-letter currency code." };

  if (trip_id) {
    const { data: trip, error: tripError } = await supabase.from("trips").select("id").eq("id", trip_id).maybeSingle();
    if (tripError || !trip) return { error: "That trip could not be found. Refresh the page and try again." };
  }

  const { data: invoice, error } = await supabase.from("invoices").insert({
    trip_id,
    client_name,
    client_email: read(formData, "client_email"),
    client_phone: read(formData, "client_phone"),
    billing_address: read(formData, "billing_address"),
    description,
    issued_on,
    due_on,
    amount: Math.round(amount * 100) / 100,
    currency,
    notes: read(formData, "notes"),
    created_by: user.id,
    updated_by: user.id,
  }).select("id").single();

  if (error || !invoice) return { error: error?.message || "Could not create the invoice." };
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?created=1`);
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
