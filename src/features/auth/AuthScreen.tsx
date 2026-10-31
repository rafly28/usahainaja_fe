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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
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
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (mode === "register" && password !== passwordConfirmation) {
      setError("Konfirmasi kata sandi belum sama.");
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
          <p className="eyebrow eyebrow--light">Operasional usaha, satu tempat</p>
          <h2>Usaha lebih tertata. Kepala lebih lega.</h2>
          <p>
            Stok, penjualan, pembelian, dan kas tercatat rapi. Laporan harian
            siap dibaca tanpa menghitung ulang di buku.
          </p>
          <div className="auth-story__preview" aria-hidden="true">
            <div className="preview-card">
              <span>Produk aktif</span>
              <strong>3</strong>
              <small>item terdaftar</small>
            </div>
            <div className="preview-card">
              <span>Stok menipis</span>
              <strong>0</strong>
              <small>item di bawah minimum</small>
            </div>
            <div className="preview-card">
              <span>Omzet hari ini</span>
              <strong>153.500</strong>
              <small>Rupiah</small>
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
          <p className="eyebrow">Selamat datang</p>
          <h1>{mode === "login" ? "Masuk ke ruang usahamu" : "Mulai rapikan usahamu"}</h1>
          <p className="muted">
            {mode === "login"
              ? "Gunakan akun yang sudah terdaftar."
              : "Buat akun pemilik, lalu siapkan bisnis pertamamu."}
          </p>

          <div className="segmented" role="tablist" aria-label="Pilih formulir autentikasi">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "is-active" : ""}
              onClick={() => changeMode("login")}
            >
              Masuk
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
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
                <span>Nama lengkap <em>*</em></span>
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
              <span>Email <em>*</em></span>
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
              <span>Kata sandi <em>*</em></span>
              <span className="field-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="field-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </span>
              <small>Minimal 8 karakter.</small>
            </label>
            {mode === "register" && (
              <label className="field">
                <span>Ulangi kata sandi <em>*</em></span>
                <span className="field-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    placeholder="Ketik ulang kata sandi"
                    required
                    minLength={8}
                  />
                </span>
              </label>
            )}
            {mode === "login" && (
              <div className="form-row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setError("Untuk mengatur ulang kata sandi, hubungi admin sistem atau pemilik usaha.")}
                >
                  Lupa kata sandi?
                </button>
              </div>
            )}
            <button className="button button--primary button--full" disabled={submitting}>
              {submitting && <Spinner />}
              {mode === "login" ? "Masuk" : "Buat akun"}
            </button>
          </form>
          <p className="auth-footnote">
            Setiap usaha memiliki data terpisah. Anda hanya melihat data usaha tempat akun ini terdaftar.
          </p>
        </div>
      </section>
    </main>
  );
}
