import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegistration } from "@/app/components/ServiceWorkerRegistration";
import { OfflineNotice } from "@/app/components/OfflineNotice";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-dm-sans" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "RSCJ Scheduler — Transport schedule manager",
  description: "A clear, shared schedule for drivers, vehicles, and trips.",
  applicationName: "RSCJ Scheduler",
  manifest: "/manifest.webmanifest",
  icons: { apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }] },
  appleWebApp: { capable: true, title: "RSCJ Scheduler", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#12141c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${dmSans.variable} ${manrope.variable}`} suppressHydrationWarning>
    <body>
      <Script id="rscj-theme-init" strategy="beforeInteractive">{"try{var saved=localStorage.getItem('rscj-theme');var theme=saved==='dark'||(!saved&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.dataset.theme=theme}catch(e){document.documentElement.dataset.theme='light'}"}</Script>
      <OfflineNotice />
      {children}
      <ServiceWorkerRegistration />
      <SpeedInsights />
    </body>
  </html>;
}
