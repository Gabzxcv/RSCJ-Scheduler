"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/lib/types";

const mainLinks = [
  ["/", "Overview", "⌂"],
  ["/schedule", "Schedule", "▦"],
  ["/drivers", "Drivers", "♙"],
  ["/vehicles", "Vehicles", "▱"],
  ["/history", "Trip history", "◷"],
] as const;

export function NavLinks({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const links = [...mainLinks, ...(profile.role === "boss" ? [
    ["/reports", "Reports", "▤"],
    ["/users", "Team access", "♧"],
    ["/settings", "Settings", "⚙"],
  ] as const : [])];
  return <nav className="nav-links" aria-label="Main navigation">
    {links.map(([href, label, icon]) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link key={href} className={`nav-link ${active ? "active" : ""}`} href={href} aria-current={active ? "page" : undefined}>
        <span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>
      </Link>;
    })}
  </nav>;
}
