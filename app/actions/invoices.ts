"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import type { ActionState, InvoiceStatus } from "@/lib/types";

const read = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const invoiceStatuses: InvoiceStatus[] = ["draft", "sent", "paid", "void"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type InvoiceFields = {
  trip_id: string | null; client_name: string; client_email: string; client_phone: string; billing_address: string;
  description: string; issued_on: string; due_on: string; amount: number; currency: string; notes: string;
};

// Shared checks for creating and editing an invoice.
async function readInvoiceFields(supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"], formData: FormData): Promise<{ error: string } | { fields: InvoiceFields }> {
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

  return { fields: {
    trip_id, client_name, description, issued_on, due_on, currency,
    client_email: read(formData, "client_email"),
    client_phone: read(formData, "client_phone"),
    billing_address: read(formData, "billing_address"),
    amount: Math.round(amount * 100) / 100,
    notes: read(formData, "notes"),
  } };
}

export async function createInvoiceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const parsed = await readInvoiceFields(supabase, formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: invoice, error } = await supabase.from("invoices").insert({
    ...parsed.fields,
    created_by: user.id,
    updated_by: user.id,
  }).select("id").single();

  if (error || !invoice) return { error: error?.message || "Could not create the invoice." };
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}?created=1`);
}

// Only drafts can be edited. Once an invoice is sent, void it and issue a new one so the record stays trustworthy.
export async function updateInvoiceAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireProfile(["boss", "secretary"]);
  const id = read(formData, "invoice_id");
  if (!id) return { error: "That invoice could not be found." };
  const parsed = await readInvoiceFields(supabase, formData);
  if ("error" in parsed) return { error: parsed.error };

  const { data: updated, error } = await supabase.from("invoices").update({
    ...parsed.fields,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "draft").select("id").maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "Only draft invoices can be edited. Void this invoice and create a new one instead." };
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?edited=1`);
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
