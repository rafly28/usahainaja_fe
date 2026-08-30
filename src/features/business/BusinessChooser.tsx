import { useState } from "react";
import { Brand } from "../../components/Brand";
import { Alert, Spinner } from "../../components/Feedback";
import { getBusinessCode, type Business } from "../../types";
import { errorMessage } from "../../lib/api";

export function BusinessChooser({
  businesses,
  onChoose,
  onLogout,
}: {
  businesses: Business[];
  onChoose: (businessCode: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [switching, setSwitching] = useState("");
  const [error, setError] = useState("");

  async function choose(business: Business) {
    const code = getBusinessCode(business);
    if (!code) {
      setError("Kode bisnis tidak tersedia. Muat ulang halaman dan coba lagi.");
      return;
    }
    setSwitching(code);
    setError("");
    try {
      await onChoose(code);
    } catch (caught) {
      setError(errorMessage(caught));
      setSwitching("");
    }
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <Brand compact />
        <button className="button button--ghost" type="button" onClick={() => void onLogout()}>
          Keluar
        </button>
      </header>
      <section className="onboarding-card business-chooser">
        <p className="eyebrow">PILIH RUANG USAHA</p>
        <h1>Mau mengurus usaha yang mana?</h1>
        <p className="muted">Data setiap usaha tersimpan terpisah dan aman.</p>
        {error && <Alert>{error}</Alert>}
        <div className="business-list">
          {businesses.map((business) => {
            const code = getBusinessCode(business);
            return (
              <button key={code} type="button" onClick={() => void choose(business)} disabled={Boolean(switching)}>
                <span className="business-avatar">{business.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{business.name}</strong>
                  <small>{business.role ?? "Anggota"} · {code}</small>
                </span>
                {switching === code ? <Spinner /> : <span aria-hidden="true">→</span>}
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
