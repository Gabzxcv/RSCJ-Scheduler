import Link from "next/link";
import { redirect } from "next/navigation";
import { getSignedInProfile } from "@/lib/auth";
import { signInAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; unlinked?: string }> }) {
  const { user, profile } = await getSignedInProfile();
  if (user && profile) redirect("/");
  const params = await searchParams;
  return (
    <main className="login-screen">
      <ThemeToggle className="login-theme-toggle" />
      <section className="login-panel">
        <div className="brand-mark">RSCJ</div>
        <p className="eyebrow">RSCJ SCHEDULER</p>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in to manage your drivers, vehicles, and trips.</p>
        {params.unlinked && <div className="notice warning">Your account is not linked to an RSCJ Scheduler profile. Ask the boss to invite you.</div>}
        {params.error && <div className="notice error">{params.error}</div>}
        <form action={signInAction} className="stack-form login-form">
          <label>Email address<input name="email" type="email" autoComplete="username" placeholder="you@company.com" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Your password" required /></label>
          <div className="login-password-help"><Link href="/forgot-password">Forgot password?</Link></div>
          <button className="button primary full" type="submit">Sign in <span aria-hidden="true">→</span></button>
        </form>
        <div className="login-foot"><span className="status-dot online" /> Private workspace · Boss and secretary access</div>
      </section>
      <aside className="login-aside">
        <div className="login-aside-orb orb-one" /><div className="login-aside-orb orb-two" />
        <p className="eyebrow">KEEP EVERY TRIP IN SYNC</p>
        <h2>One clear schedule.<br />A smoother day on the road.</h2>
        <p>See assignments at a glance, catch conflicts before they happen, and keep a record of every change.</p>
        <div className="login-aside-card"><div className="mini-calendar"><span>MON</span><b>18</b></div><div><b>Manila · Batangas</b><small>8:30 AM · Van 03 · 2 drivers</small></div><span className="pill confirmed">Confirmed</span></div>
      </aside>
    </main>
  );
}
