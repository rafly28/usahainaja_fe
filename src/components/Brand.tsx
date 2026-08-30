export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`} aria-label="UsahainAja">
      <span className="brand__mark" aria-hidden="true">
        U
      </span>
      <span className="brand__word">
        Usahain<span>Aja</span>
      </span>
    </div>
  );
}
