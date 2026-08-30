import type { ReactNode } from "react";

export function Spinner({ label = "Memuat" }: { label?: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function LoadingPage({ label = "Menyiapkan ruang kerja..." }: { label?: string }) {
  return (
    <main className="center-page">
      <div className="loading-card" role="status">
        <div className="loading-card__logo">U</div>
        <Spinner />
        <p>{label}</p>
      </div>
    </main>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span aria-hidden="true">{tone === "error" ? "!" : "✓"}</span>
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__illustration" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
