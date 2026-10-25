"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";
import { Icon, type IconName } from "@/app/components/Icon";

type NavItem = readonly [href: string, label: string, icon: IconName];

const mainLinks: ReadonlyArray<NavItem> = [
  ["/", "Overview", "home"],
  ["/schedule", "Schedule", "calendar"],
  ["/invoices", "Invoices", "invoice"],
  ["/drivers", "Drivers", "driver"],
  ["/vehicles", "Vehicles", "vehicle"],
  ["/history", "Trip history", "history"],
];

const bossLinks: ReadonlyArray<NavItem> = [
  ["/reports", "Reports", "reports"],
  ["/users", "Team access", "team"],
  ["/settings", "Settings", "settings"],
];

export function NavLinks({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const links = [...mainLinks, ...(profile.role === "boss" ? bossLinks : [])];
  return <nav className="nav-links" aria-label="Main navigation">
    {links.map(([href, label, icon]) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link key={href} className={`nav-link ${active ? "active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
        <span className="nav-icon" aria-hidden="true"><Icon name={icon} /></span><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
