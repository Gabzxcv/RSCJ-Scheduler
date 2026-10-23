"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Profile } from "@/lib/types";

export function MobileNav({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = ["/", "/schedule", "/trips/new", "/invoices"];
  const bossLinks: ReadonlyArray<readonly [string, string, string]> = profile.role === "boss"
    ? [["/reports", "Reports", "▤"], ["/users", "Team access", "♧"], ["/settings", "Settings", "⚙"]]
    : [];
  const moreLinks: ReadonlyArray<readonly [string, string, string]> = [
    ["/drivers", "Drivers", "♙"],
    ["/vehicles", "Vehicles", "▱"],
    ["/history", "Trip history", "◷"],
    ["/notifications", "Notifications", "♧"],
    ...bossLinks,
    ["/guide", "User guide", "?"],
  ];
  const moreActive = !primary.some((path) => path === "/" ? pathname === path : pathname.startsWith(path));

  return <>
    {moreOpen && <div className="mobile-menu-backdrop" onClick={() => setMoreOpen(false)}>
      <section className="mobile-menu-sheet" role="dialog" aria-modal="true" aria-label="More navigation" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-menu-sheet-heading"><div><p className="eyebrow">WORKSPACE</p><h2>More</h2></div><button type="button" className="icon-button mobile-menu-close" onClick={() => setMoreOpen(false)} aria-label="Close menu">×</button></div>
        <div className="mobile-menu-grid">{moreLinks.map(([href, label, icon]) => <Link key={href} href={href} className="mobile-menu-link" onClick={() => setMoreOpen(false)}><span aria-hidden="true">{icon}</span><b>{label}</b></Link>)}</div>
      </section>
    </div>}
    <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
      <Link href="/" className={pathname === "/" ? "active" : ""} aria-current={pathname === "/" ? "page" : undefined}><span aria-hidden="true">⌂</span><small>Home</small></Link>
      <Link href="/schedule" className={pathname.startsWith("/schedule") ? "active" : ""} aria-current={pathname.startsWith("/schedule") ? "page" : undefined}><span aria-hidden="true">▦</span><small>Schedule</small></Link>
      <Link href="/trips/new" className="mobile-new-trip" aria-label="Create trip"><span aria-hidden="true">＋</span><small>New trip</small></Link>
      <Link href="/invoices" className={pathname.startsWith("/invoices") ? "active" : ""} aria-current={pathname.startsWith("/invoices") ? "page" : undefined}><span aria-hidden="true">＄</span><small>Invoices</small></Link>
      <button type="button" className={moreActive || moreOpen ? "active" : ""} aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}><span aria-hidden="true">•••</span><small>More</small></button>
    </nav>
  </>;
}
