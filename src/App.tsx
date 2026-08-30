import { useCallback, useEffect, useState } from "react";
import { Alert } from "./components/Feedback";
import { api, errorMessage, isUnauthorized } from "./lib/api";
import type { Session } from "./types";
import { AuthScreen } from "./features/auth/AuthScreen";
import { AuthenticatedArea } from "./features/business/AuthenticatedArea";
import { LoadingPage } from "./components/Feedback";

type AppState = "loading" | "guest" | "authenticated" | "error";

export default function App() {
  const [state, setState] = useState<AppState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [fatalError, setFatalError] = useState("");

  const refreshSession = useCallback(async () => {
    try {
      const current = await api.auth.me();
      setSession(current);
      setState("authenticated");
      setFatalError("");
    } catch (caught) {
      setSession(null);
      if (isUnauthorized(caught)) {
        setState("guest");
        setFatalError("");
      } else {
        setState("error");
        setFatalError(errorMessage(caught));
      }
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      setSession(null);
      setState("guest");
    }
  }

  if (state === "loading") return <LoadingPage />;
  if (state === "guest") return <AuthScreen onAuthenticated={refreshSession} />;
  if (state === "authenticated" && session) {
    return <AuthenticatedArea session={session} refreshSession={refreshSession} onLogout={logout} />;
  }

  return (
    <main className="center-page">
      <div className="error-card">
        <Alert>{fatalError}</Alert>
        <h1>Aplikasi belum dapat terhubung</h1>
        <p>Pastikan layanan API berjalan, lalu coba kembali.</p>
        <button className="button button--primary" type="button" onClick={() => void refreshSession()}>Coba lagi</button>
      </div>
    </main>
  );
}
