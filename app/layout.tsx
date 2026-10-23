import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSCJ Scheduler — Transport schedule manager",
  description: "A clear, shared schedule for drivers, vehicles, and trips.",
  applicationName: "RSCJ Scheduler",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
