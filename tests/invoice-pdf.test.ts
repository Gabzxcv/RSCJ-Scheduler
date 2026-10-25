import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInvoicePdf } from "../lib/invoice-pdf";
import type { Invoice } from "../lib/types";

const invoice: Invoice = {
  id: "1", invoice_number: "RSCJ-202610-00001", trip_id: null, client_name: "Peña Logistics 山田 Ltd.",
  client_email: "a@example.com", client_phone: "0917 123 4567", billing_address: "Makati City",
  description: "Transport service to Batangas", issued_on: "2026-10-24", due_on: "2026-11-07",
  amount: 1500, currency: "PHP", status: "sent", notes: "GCash 0917 123 4567\n" + "Thank you. ".repeat(200),
  paid_at: null, created_by: "u", updated_by: "u", created_at: "", updated_at: "",
};

test("invoice PDF builds for accents, non-Latin text, and very long notes", async () => {
  const bytes = await buildInvoicePdf(invoice, { business_name: "RSCJ Transport", timezone: "Asia/Manila" }, "Asia/Manila");
  assert.equal(Buffer.from(bytes.slice(0, 5)).toString("latin1"), "%PDF-");
  assert.ok(bytes.length > 1000);
});

test("invoice PDF builds with no settings and each status", async () => {
  for (const status of ["draft", "sent", "paid", "void"] as const) {
    const bytes = await buildInvoicePdf({ ...invoice, status, notes: "" }, null, "Asia/Manila");
    assert.ok(bytes.length > 1000, status);
  }
});
