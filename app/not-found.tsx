import Link from "next/link";

export default function NotFound() {
  return <main className="error-screen"><div className="error-card"><div className="empty-icon">⌕</div><p className="eyebrow">NOT FOUND</p><h1>We couldn’t find that page</h1><p className="muted">It may have been moved or the link may be out of date.</p><Link className="button primary" href="/">Back to overview <span>→</span></Link></div></main>;
}
