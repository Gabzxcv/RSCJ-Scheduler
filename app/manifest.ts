import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RSCJ Scheduler",
    short_name: "RSCJ",
    description: "Manage transport trips, drivers, and vehicles.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6fa",
    theme_color: "#665df2",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
