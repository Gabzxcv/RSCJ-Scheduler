import { requireProfile } from "@/lib/auth";
import { loadWorkspaceSettings } from "@/lib/data";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { DEFAULT_TIMEZONE } from "@/lib/time";
import type { Invoice } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireProfile();
  const { id } = await params;
  const [{ data, error }, settings] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    loadWorkspaceSettings(supabase),
  ]);
  if (error) return new Response("Could not load the invoice.", { status: 500 });
  if (!data) return new Response("Invoice not found.", { status: 404 });

  const invoice = data as Invoice;
  const bytes = await buildInvoicePdf(invoice, settings, settings?.timezone || DEFAULT_TIMEZONE);
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoice.invoice_number.replace(/[^A-Za-z0-9._-]/g, "_")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
