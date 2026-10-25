"use client";

import { useState } from "react";
import { Icon } from "@/app/components/Icon";

// Opens the iPhone/iPad share sheet (Messages, WhatsApp, Viber, Mail, ...).
// Browsers without sharing copy the text instead.
export function ShareButton({ title, text, label = "Share", className = "button secondary" }: { title: string; text: string; label?: string; className?: string }) {
  const [note, setNote] = useState("");

  async function share() {
    try {
      if (navigator.share) { await navigator.share({ title, text }); return; }
      await navigator.clipboard.writeText(text);
      setNote("Copied");
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
      setNote("Could not share");
    }
    window.setTimeout(() => setNote(""), 2500);
  }

  return <button type="button" className={className} onClick={share}><Icon name="share" /> {note || label}</button>;
}
