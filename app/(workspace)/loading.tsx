export default function WorkspaceLoading() {
  return <div className="loading-skeleton" role="status" aria-live="polite" aria-label="Loading">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-line" />
    <div className="skeleton-grid"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
    <div className="skeleton skeleton-panel" />
  </div>;
}
