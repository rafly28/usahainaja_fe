import { useState, type FormEvent } from "react";
import { Brand } from "../../components/Brand";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";

const businessTypes = [
  { value: "RETAIL", label: "Toko / Retail", description: "Produk fisik dan stok harian" },
  { value: "SERVICE", label: "Jasa", description: "Layanan, pesanan, dan jadwal" },
  { value: "ENTERTAINMENT", label: "Event / Hiburan", description: "Booking dan kebutuhan acara" },
  { value: "OTHER", label: "Lainnya", description: "Model usaha lainnya" },
];

export function BusinessOnboarding({
  onCreated,
  onLogout,
}: {
  onCreated: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("RETAIL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Nama usaha minimal 2 karakter.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.businesses.create({
        name: name.trim(),
        business_type: businessType,
        timezone: "Asia/Jakarta",
        currency: "IDR",
      });
      await onCreated();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
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
      <section className="onboarding-card">
        <div className="step-indicator"><span /> Langkah 1 dari 1</div>
        <p className="eyebrow">SIAPKAN RUANG USAHA</p>
        <h1>Ceritakan sedikit tentang usahamu</h1>
        <p className="muted">Kami akan menyiapkan lokasi, satuan, dan pengaturan dasar secara otomatis.</p>

        <form className="form-stack onboarding-form" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <label className="field">
            <span>Nama usaha</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Contoh: Toko Buah Maju"
              required
              minLength={2}
            />
            <small>Nama ini akan tampil di ruang kerja timmu.</small>
          </label>

          <fieldset className="business-type-fieldset">
            <legend>Jenis usaha</legend>
            <div className="business-type-grid">
              {businessTypes.map((type) => (
                <label
                  key={type.value}
                  className={`choice-card ${businessType === type.value ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="business-type"
                    value={type.value}
                    checked={businessType === type.value}
                    onChange={() => setBusinessType(type.value)}
                  />
                  <span className="choice-card__check" aria-hidden="true" />
                  <strong>{type.label}</strong>
                  <small>{type.description}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="button button--primary button--full" disabled={submitting}>
            {submitting && <Spinner />}
            Buat ruang usaha
          </button>
        </form>
      </section>
    </main>
  );
}
