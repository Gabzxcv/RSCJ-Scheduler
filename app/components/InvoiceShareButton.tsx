"use client";

import { useState } from "react";

export function InvoiceShareButton({ invoiceNumber, client, amount, dueDate, email, phone, paymentDetails }: {
  invoiceNumber: string; client: string; amount: string; dueDate: string; email: string; phone: string; paymentDetails: string;
}) {
  const [message, setMessage] = useState("");
  const text = [
    `Invoice ${invoiceNumber} from RSCJ Scheduler`,
    `Bill to: ${client}`,
    `Amount due: ${amount}`,
    `Due date: ${dueDate}`,
    paymentDetails ? `Payment details: ${paymentDetails}` : "",
  ].filter(Boolean).join("\n");

  async function share() {
    setMessage("");
    if (navigator.share) {
      try {
        await navigator.share({ title: `Invoice ${invoiceNumber}`, text });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    if (email) {
      const subject = encodeURIComponent(`Invoice ${invoiceNumber} from RSCJ`);
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${encodeURIComponent(text)}`;
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Invoice summary copied");
    } catch {
      if (phone) window.location.href = `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(text)}`;
      else setMessage("Sharing is not available on this device");
    }
  }

  return <div className="invoice-share-wrap"><button type="button" className="button secondary" onClick={share}>Share invoice</button>{message && <span role="status" className="share-feedback">{message}</span>}</div>;
}
