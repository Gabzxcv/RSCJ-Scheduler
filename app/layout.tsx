import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./touch.css";
import { ServiceWorkerRegister } from "@/app/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "RSCJ Scheduler — Transport schedule manager",
  description: "A clear, shared schedule for drivers, vehicles, and trips.",
  applicationName: "RSCJ Scheduler",
  appleWebApp: { capable: true, title: "RSCJ", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1e29" },
  ],
};

// Runs before first paint so dark-mode users never see a white flash. A saved
// choice wins; otherwise the device's light/dark setting is used.
const themeScript = `(function(){try{var t=localStorage.getItem("rscj-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body>{children}<ServiceWorkerRegister /><SpeedInsights /></body>
  </html>;
}
