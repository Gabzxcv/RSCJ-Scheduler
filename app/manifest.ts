import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RSCJ Scheduler",
    short_name: "RSCJ",
    description: "A clear, shared schedule for drivers, vehicles, trips, and invoices.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#665df2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New trip", url: "/trips/new" },
      { name: "Schedule", url: "/schedule" },
      { name: "Invoices", url: "/invoices" },
    ],
  };
}
