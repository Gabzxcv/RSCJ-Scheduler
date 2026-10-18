"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-screen"><div className="error-card"><div className="empty-icon">!</div><p className="eyebrow">RSCJ SCHEDULER</p><h1>Something went wrong</h1><p className="muted">The page could not load. Check the connection and try again.</p><button className="button primary" onClick={() => reset()}>Try again <span>→</span></button></div></main>;
}
