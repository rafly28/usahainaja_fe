import { useCallback, useEffect, useState } from "react";
import { Alert, LoadingPage } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Business, Session } from "../../types";
import { BusinessChooser } from "./BusinessChooser";
import { BusinessOnboarding } from "./BusinessOnboarding";
import { Workspace } from "../workspace/Workspace";

export function AuthenticatedArea({
  session,
  refreshSession,
  onLogout,
}: {
  session: Session;
  refreshSession: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBusinesses(await api.businesses.list());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses, session.user.email]);

  async function refreshEverything() {
    await Promise.all([refreshSession(), loadBusinesses()]);
  }

  async function chooseBusiness(code: string) {
    await api.auth.switchBusiness(code);
    await refreshSession();
  }

  if (loading) return <LoadingPage label="Menyiapkan daftar usaha..." />;

  if (error) {
    return (
      <main className="center-page">
        <div className="error-card">
          <Alert>{error}</Alert>
          <h1>Ruang usaha belum dapat dibuka</h1>
          <p>Coba muat ulang data. Jika kendala berlanjut, pastikan backend sedang berjalan.</p>
          <div className="form-actions">
            <button className="button button--secondary" type="button" onClick={() => void onLogout()}>Keluar</button>
            <button className="button button--primary" type="button" onClick={() => void loadBusinesses()}>Coba lagi</button>
          </div>
        </div>
      </main>
    );
  }

  if (businesses.length === 0) {
    return <BusinessOnboarding onCreated={refreshEverything} onLogout={onLogout} />;
  }

  if (!session.active_business) {
    return <BusinessChooser businesses={businesses} onChoose={chooseBusiness} onLogout={onLogout} />;
  }

  return (
    <Workspace
      key={session.active_business.code ?? session.active_business.business_code ?? session.active_business.name}
      user={session.user}
      activeBusiness={session.active_business}
      businesses={businesses}
      onSwitchBusiness={chooseBusiness}
      onBusinessUpdated={refreshEverything}
      onLogout={onLogout}
    />
  );
}
