import { redirect } from "next/navigation";
import { setPasswordAction } from "@/app/actions/auth";
import { getSignedInProfile } from "@/lib/auth";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, profile } = await getSignedInProfile();
  if (!user) redirect("/login?error=Open%20the%20invitation%20link%20from%20your%20email%20first.");
  if (!profile) redirect("/login?unlinked=1");
  const { error } = await searchParams;

  return (
    <main className="login-screen">
      <ThemeToggle className="login-theme-toggle" />
      <section className="login-panel">
        <div className="brand-mark">RSCJ</div>
        <p className="eyebrow">RSCJ SCHEDULER</p>
        <h1>Choose your password.</h1>
        <p className="muted">Set a password for {profile.email}, then sign in to the shared schedule.</p>
        {error && <div className="notice error">{error}</div>}
        <form action={setPasswordAction} className="stack-form login-form">
          <label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <label>Confirm new password<input name="password_confirmation" type="password" minLength={8} autoComplete="new-password" required /></label>
          <button className="button primary full" type="submit">Save password <span aria-hidden="true">→</span></button>
        </form>
        <div className="login-foot"><span className="status-dot online" /> Use at least 8 characters</div>
      </section>
      <aside className="login-aside">
        <div className="login-aside-orb orb-one" /><div className="login-aside-orb orb-two" />
        <p className="eyebrow">ONE TEAM · ONE SCHEDULE</p>
        <h2>Your workspace is ready.</h2>
        <p>After saving your password, you can review trips, update assignments, and keep the day moving.</p>
      </aside>
    </main>
  );
}
