"use client";

import { useState } from "react";

export function ShareTripButton({ destination, pickup, departure, returnTime, drivers, vehicle }: {
  destination: string; pickup: string; departure: string; returnTime: string; drivers: string; vehicle: string;
}) {
  const [message, setMessage] = useState("");
  const text = [
    `RSCJ trip: ${destination}`,
    `Pickup: ${pickup}`,
    `Departure: ${departure}`,
    `Estimated return: ${returnTime}`,
    `Driver(s): ${drivers || "Not assigned"}`,
    `Vehicle: ${vehicle || "Not assigned"}`,
  ].join("\n");

  async function share() {
    setMessage("");
    if (navigator.share) {
      try {
        await navigator.share({ title: `RSCJ trip to ${destination}`, text });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Trip details copied");
    } catch {
      setMessage("Sharing is not available on this device");
    }
  }

  return <div className="invoice-share-wrap"><button type="button" className="button secondary" onClick={share}>Share trip</button>{message && <span role="status" className="share-feedback">{message}</span>}</div>;
}
