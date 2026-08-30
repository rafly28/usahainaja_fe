import { useState, type FormEvent } from "react";
import { Brand } from "../../components/Brand";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";

type Mode = "login" | "register";

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => Promise<void> }) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setPasswordConfirmation("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register" && name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (mode === "register" && password !== passwordConfirmation) {
      setError("Konfirmasi password belum sama.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await api.auth.login({ email: email.trim().toLowerCase(), password });
      } else {
        await api.auth.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      }
      await onAuthenticated();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Tentang UsahainAja">
        <Brand />
        <div className="auth-story__content">
          <p className="eyebrow eyebrow--light">OPERASIONAL USAHA, SATU TEMPAT</p>
          <h1>Usaha lebih tertata. Kepala lebih lega.</h1>
          <p>
            Pantau produk dan stok harian tanpa spreadsheet yang tercecer. Mulai dari hal
            sederhana, tumbuh sesuai kebutuhanmu.
          </p>
          <div className="auth-story__preview" aria-hidden="true">
            <div className="preview-card preview-card--wide">
              <span>Stok hari ini</span>
              <strong>Semua tercatat</strong>
              <i />
            </div>
            <div className="preview-card">
              <span>Produk aktif</span>
              <strong>24</strong>
            </div>
            <div className="preview-card preview-card--accent">
              <span>Perlu dicek</span>
              <strong>2 item</strong>
            </div>
          </div>
        </div>
        <small>Dibuat untuk usaha yang sedang bertumbuh.</small>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <p className="eyebrow">SELAMAT DATANG</p>
          <h2>{mode === "login" ? "Masuk ke ruang usahamu" : "Mulai rapikan usahamu"}</h2>
          <p className="muted">
            {mode === "login"
              ? "Gunakan akun yang sudah terdaftar."
              : "Buat akun pemilik, lalu siapkan bisnis pertamamu."}
          </p>

          <div className="segmented" aria-label="Pilih formulir autentikasi">
            <button
              type="button"
              className={mode === "login" ? "is-active" : ""}
              onClick={() => changeMode("login")}
            >
              Masuk
            </button>
            <button
              type="button"
              className={mode === "register" ? "is-active" : ""}
              onClick={() => changeMode("register")}
            >
              Daftar
            </button>
          </div>

          <form className="form-stack" onSubmit={submit}>
            {error && <Alert>{error}</Alert>}
            {mode === "register" && (
              <label className="field">
                <span>Nama lengkap</span>
                <input
                  autoComplete="name"
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Siti Rahma"
                  required
                  minLength={2}
                />
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                autoFocus={mode === "login"}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 8 karakter"
                required
                minLength={8}
              />
            </label>
            {mode === "register" && (
              <label className="field">
                <span>Ulangi password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Ketik ulang password"
                  required
                  minLength={8}
                />
              </label>
            )}
            <button className="button button--primary button--full" disabled={submitting}>
              {submitting && <Spinner />}
              {mode === "login" ? "Masuk" : "Buat akun"}
            </button>
          </form>
          <p className="auth-footnote">
            Dengan melanjutkan, data usaha tetap dipisahkan aman dari bisnis lainnya.
          </p>
        </div>
      </section>
    </main>
  );
}
