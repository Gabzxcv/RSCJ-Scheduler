import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";
import { dateKey, formatDate } from "@/lib/time";
import type { Invoice } from "@/lib/types";

// The built-in PDF fonts only cover Western characters; anything else prints as "?" instead of failing.
const printable = (value: string) => value.replace(/[\r\t]/g, " ").replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "?");

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of printable(text).split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}


/** Builds a single-page A4 invoice PDF. Uses only built-in fonts, so it needs no setup. */
export async function buildInvoicePdf(invoice: Invoice, settings: { business_name?: string | null; timezone?: string | null } | null, timezone: string) {
  const businessName = settings?.business_name || "RSCJ Transport";
  const today = dateKey(new Date(), timezone);
  const overdue = (invoice.status === "draft" || invoice.status === "sent") && invoice.due_on < today;
  const statusLabel = overdue ? "OVERDUE" : invoice.status.toUpperCase();
  const money = `${invoice.currency} ${Number(invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${invoice.invoice_number} — ${businessName}`);
  pdf.setProducer("RSCJ Scheduler");
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.145, 0.22), muted = rgb(0.4, 0.44, 0.52), primary = rgb(0.4, 0.365, 0.95), line = rgb(0.9, 0.91, 0.94);
  const left = 48, right = 595.28 - 48, width = right - left;
  let y = 841.89 - 56;

  const text = (value: string, x: number, yy: number, size: number, font = regular, color = ink) => page.drawText(printable(value), { x, y: yy, size, font, color });
  const textRight = (value: string, xRight: number, yy: number, size: number, font = regular, color = ink) => {
    const clean = printable(value);
    page.drawText(clean, { x: xRight - font.widthOfTextAtSize(clean, size), y: yy, size, font, color });
  };

  // Header
  page.drawRectangle({ x: left, y: y - 6, width: 34, height: 34, color: primary });
  text("RSCJ", left + (34 - bold.widthOfTextAtSize("RSCJ", 9.5)) / 2, y + 7, 9.5, bold, rgb(1, 1, 1));
  text(businessName, left + 46, y + 12, 14, bold);
  text("Transportation services", left + 46, y - 2, 9, regular, muted);
  textRight("INVOICE", right, y + 12, 18, bold, muted);
  textRight(invoice.invoice_number, right, y - 3, 10, bold);
  y -= 34;
  page.drawRectangle({ x: left, y, width, height: 2, color: primary });
  y -= 34;

  // Bill to + dates
  text("BILL TO", left, y, 8, bold, muted);
  text("ISSUE DATE", right - 150, y, 8, bold, muted);
  textRight(formatDate(invoice.issued_on, timezone), right, y, 10);
  let leftY = y - 18;
  for (const lineText of wrap(invoice.client_name, bold, 13, 280)) { text(lineText, left, leftY, 13, bold); leftY -= 17; }
  const detailLines = [invoice.billing_address, invoice.client_email, invoice.client_phone].filter(Boolean);
  for (const detail of detailLines) for (const lineText of wrap(detail, regular, 10, 280)) { text(lineText, left, leftY, 10, regular, muted); leftY -= 14; }
  text("DUE DATE", right - 150, y - 20, 8, bold, muted);
  textRight(formatDate(invoice.due_on, timezone), right, y - 20, 10);
  text("STATUS", right - 150, y - 40, 8, bold, muted);
  textRight(statusLabel, right, y - 40, 10, bold, invoice.status === "paid" ? rgb(0.14, 0.54, 0.43) : overdue || invoice.status === "void" ? rgb(0.72, 0.26, 0.38) : ink);
  y = Math.min(leftY, y - 56) - 24;

  // Line item
  page.drawRectangle({ x: left, y: y - 6, width, height: 0.8, color: line });
  text("DESCRIPTION", left, y + 6, 8, bold, muted);
  textRight("AMOUNT", right, y + 6, 8, bold, muted);
  y -= 24;
  const descLines = wrap(invoice.description, regular, 11, width - 140);
  descLines.forEach((lineText, index) => { text(lineText, left, y - index * 15, 11); });
  textRight(money, right, y, 11, bold);
  y -= Math.max(descLines.length, 1) * 15 + 8;
  page.drawRectangle({ x: left, y, width, height: 0.8, color: line });
  y -= 30;
  textRight(`Total due   ${money}`, right, y, 15, bold);
  y -= 40;

  // Notes
  if (invoice.notes) {
    page.drawRectangle({ x: left, y: y + 14, width, height: 0.8, color: line });
    text("NOTES / PAYMENT INSTRUCTIONS", left, y, 8, bold, muted);
    y -= 16;
    for (const lineText of wrap(invoice.notes, regular, 10.5, width)) {
      if (y < 90) break;
      text(lineText, left, y, 10.5, regular, muted);
      y -= 14.5;
    }
  }

  if (invoice.status === "paid") {
    page.drawText("PAID", { x: 140, y: 170, size: 96, font: bold, color: rgb(0.14, 0.54, 0.43), opacity: 0.16, rotate: degrees(18) });
  }
  textRight("Thank you for your business.", right, 52, 9, regular, muted);
  text(`${invoice.invoice_number} · generated ${formatDate(new Date(), timezone)}`, left, 52, 8, regular, muted);

  return pdf.save();
}
