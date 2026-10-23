import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return <main className="login-screen">
    <ThemeToggle className="login-theme-toggle" />
    <section className="login-panel">
      <div className="brand-mark">RSCJ</div>
      <p className="eyebrow">RSCJ SCHEDULER</p>
      <h1>Reset your password.</h1>
      <p className="muted">Enter your account email and we’ll send a password reset link if it matches a workspace account.</p>
      {sent && <div className="notice success">If an account uses that address, a reset link is on its way. Check your inbox and spam folder.</div>}
      {error && <div className="notice error">{error}</div>}
      <form action={forgotPasswordAction} className="stack-form login-form">
        <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></label>
        <button className="button primary full" type="submit">Send reset link <span aria-hidden="true">→</span></button>
      </form>
      <div className="login-foot"><Link href="/login">← Back to sign in</Link></div>
    </section>
    <aside className="login-aside"><div className="login-aside-orb orb-one" /><div className="login-aside-orb orb-two" /><p className="eyebrow">ACCOUNT ACCESS</p><h2>Get back to the schedule.</h2><p>Use the secure link in your email to choose a new password.</p></aside>
  </main>;
}
