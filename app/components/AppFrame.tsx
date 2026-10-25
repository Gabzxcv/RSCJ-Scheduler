import Link from "next/link";
import type { Profile } from "@/lib/types";
import { signOutAction } from "@/app/actions/auth";
import { NavLinks } from "@/app/components/NavLinks";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { MobileNav } from "@/app/components/MobileNav";
import { AutoRefresh } from "@/app/components/AutoRefresh";

export function AppFrame({ profile, businessName, unreadCount, children }: { profile: Profile; businessName: string; unreadCount: number; children: React.ReactNode }) {
  const initials = profile.display_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || profile.email.slice(0, 1).toUpperCase();
  return <div className="app-frame">
    <aside className="sidebar">
      <Link className="side-brand" href="/"><span className="brand-mark small">RSCJ</span><span><b>RSCJ Scheduler</b><small>{businessName}</small></span></Link>
      <div className="side-label">WORKSPACE</div>
      <NavLinks profile={profile} />
      <div className="sidebar-spacer" />
      <div className="sidebar-help"><div className="help-icon">?</div><div><b>Need a hand?</b><span>See the quick user guide</span></div><Link href="/guide" aria-label="Open user guide">↗</Link></div>
      <div className="side-user"><div className="avatar">{initials}</div><div className="user-copy"><b>{profile.display_name || "Workspace user"}</b><small>{profile.role === "boss" ? "Boss" : "Secretary"}</small></div><form action={signOutAction}><button className="icon-button" title="Sign out" aria-label="Sign out">⇥</button></form></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark small">RSCJ</span><b>RSCJ Scheduler</b></div><div className="topbar-spacer" /><span className="topbar-date">Transport operations <i className="status-dot online" /></span><ThemeToggle /><Link className="notification-bell" href="/notifications" aria-label={`${unreadCount} unread notifications`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}</Link><Link className="button primary top-add" href="/trips/new"><span aria-hidden="true">＋</span> New trip</Link><form action={signOutAction} className="top-signout"><button className="icon-button" title="Sign out" aria-label="Sign out">⇥</button></form></header>
      <main className="page-content">{children}</main>
      <footer className="app-footer">RSCJ Scheduler <span>·</span> Schedule operations, made clear</footer>
    </div>
    <MobileNav profile={profile} />
    <AutoRefresh />
  </div>;
}
