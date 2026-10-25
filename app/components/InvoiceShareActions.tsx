"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";

type Props = { invoiceId: string; invoiceNumber: string; clientName: string; clientEmail: string; clientPhone: string; amountText: string; dueText: string; businessName: string };

// "Share PDF" opens the iPhone/iPad share sheet with the invoice attached as a PDF
// (Messages, WhatsApp, Messenger, Mail, AirDrop, Files...). Browsers that cannot
// share files fall back to downloading the PDF.
export function InvoiceShareActions({ invoiceId, invoiceNumber, clientName, clientEmail, clientPhone, amountText, dueText, businessName }: Props) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const message = `Hi ${clientName}, here is invoice ${invoiceNumber} from ${businessName} for ${amountText}, due ${dueText}. Thank you!`;
  const pdfUrl = `/invoices/${invoiceId}/pdf`;

  async function sharePdf() {
    setBusy(true); setNote("");
    try {
      const response = await fetch(pdfUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error("pdf");
      const blob = await response.blob();
      const file = new File([blob], `${invoiceNumber}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${invoiceNumber}`, text: message });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url; anchor.download = file.name; anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setNote("PDF downloaded");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") setNote("Could not prepare the PDF. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return <>
    <button type="button" className="button primary" onClick={sharePdf} disabled={busy}><Icon name="share" /> {busy ? "Preparing…" : "Share PDF"}</button>
    <a className="button secondary" href={`${pdfUrl}?download=1`}>Download PDF</a>
    {clientEmail && <a className="button secondary" href={`mailto:${clientEmail}?subject=${encodeURIComponent(`Invoice ${invoiceNumber} from ${businessName}`)}&body=${encodeURIComponent(message)}`}>Email client</a>}
    {clientPhone && <a className="button secondary" href={`sms:${clientPhone}?&body=${encodeURIComponent(message)}`}>Text client</a>}
    {note && <span className="share-note" role="status">{note}</span>}
  </>;
}
