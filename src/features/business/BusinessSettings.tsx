import { useEffect, useState } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Business } from "../../types";
import { StoreIdentity } from "../documents/StoreIdentity";
import {
  businessModules,
  businessTypeOptions,
  getBusinessProfile,
  getEnabledModules,
  getModuleLabel,
  type BusinessModule,
} from "./businessProfile";

/** Batas ukuran gambar sebelum dibaca jadi data URI, agar halaman tidak berat. */
const MAX_LOGO_BYTES = 1_000_000;

export function BusinessSettings({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: () => Promise<void>;
}) {
  const [businessType, setBusinessType] = useState(getBusinessProfile(business.business_type).type);
  const [modules, setModules] = useState<BusinessModule[]>(getEnabledModules(business));
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [logoError, setLogoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setBusinessType(getBusinessProfile(business.business_type).type);
    setModules(getEnabledModules(business));
    setLogoUrl(business.logo_url ?? "");
  }, [business]);

  function changeBusinessType(nextType: string) {
    const profile = getBusinessProfile(nextType);
    setBusinessType(profile.type);
    setModules(profile.defaultModules);
    setSuccess("");
  }

  function toggleModule(module: BusinessModule) {
    setModules((current) => current.includes(module)
      ? current.filter((item) => item !== module)
      : [...current, module]);
    setSuccess("");
  }

  function pickLogoFile(file: File | undefined) {
    setLogoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Berkas yang dipilih bukan gambar.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Ukuran gambar maksimal 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(typeof reader.result === "string" ? reader.result : "");
      setSuccess("");
    };
    reader.onerror = () => setLogoError("Gagal membaca gambar.");
    reader.readAsDataURL(file);
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.businesses.updateConfiguration({
        business_type: businessType,
        enabled_modules: modules,
        logo_url: logoUrl.trim(),
      });
      await onSaved();
      setSuccess("Profil, modul, dan logo usaha berhasil diperbarui.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-stack page-stack--narrow" aria-labelledby="business-settings-title">
      <div className="page-heading">
        <p className="eyebrow">PENGATURAN USAHA</p>
        <h1 id="business-settings-title">Profil dan modul</h1>
        <p className="muted">Atur ruang kerja sesuai operasional usahamu. Modul tidak aktif disembunyikan dan tidak dapat diakses lewat API.</p>
      </div>

      <div className="content-card business-settings">
        {error && <Alert>{error}</Alert>}
        {success && <p className="success-banner" role="status">{success}</p>}

        <fieldset className="module-settings">
          <legend>Logo usaha</legend>
          <p>Logo dipakai pada struk dan dokumen cetak. Kalau dikosongkan, nama usaha yang ditampilkan.</p>
          <div className="logo-settings">
            <StoreIdentity name={business.name} logoUrl={logoUrl} documentLabel="Pratinjau kop dokumen" />
            <div className="logo-settings__controls">
              <label className="field">
                <span>Alamat gambar (opsional)</span>
                <input
                  value={logoUrl.startsWith("data:") ? "" : logoUrl}
                  onChange={(event) => {
                    setLogoUrl(event.target.value);
                    setLogoError("");
                  }}
                  placeholder="https://contoh.com/logo.png"
                  disabled={submitting}
                />
              </label>
              <label className="field">
                <span>Atau unggah gambar</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={submitting}
                  onChange={(event) => pickLogoFile(event.target.files?.[0])}
                />
                <small>Maksimal 1 MB. Gambar disimpan sebagai data URI agar tetap tampil saat dokumen dicetak.</small>
              </label>
              {logoError && <p className="muted text-sm" style={{ color: "var(--red-700)" }}>{logoError}</p>}
              {logoUrl && (
                <button
                  type="button"
                  className="button button--ghost"
                  disabled={submitting}
                  onClick={() => {
                    setLogoUrl("");
                    setLogoError("");
                    setSuccess("");
                  }}
                >
                  Hapus logo
                </button>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="business-type-fieldset">
          <legend>Jenis usaha</legend>
          <div className="business-type-grid">
            {businessTypeOptions.map((option) => (
              <label key={option.value} className={`choice-card ${businessType === option.value ? "is-selected" : ""}`}>
                <input
                  type="radio"
                  name="business-type-settings"
                  value={option.value}
                  checked={businessType === option.value}
                  disabled={submitting}
                  onChange={() => changeBusinessType(option.value)}
                />
                <span className="choice-card__check" aria-hidden="true" />
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="module-settings">
          <legend>Modul yang digunakan</legend>
          <p>Pilih hanya modul yang relevan. Saat jenis usaha diubah, pilihan awal mengikuti profil baru dan masih bisa disesuaikan.</p>
          <div className="module-settings__grid">
            {businessModules.map((module) => (
              <label key={module} className={`module-toggle ${modules.includes(module) ? "is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={modules.includes(module)}
                  disabled={submitting}
                  onChange={() => toggleModule(module)}
                />
                <span>{getModuleLabel(module)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="form-actions">
          <button className="button button--primary" type="button" onClick={() => void submit()} disabled={submitting}>
            {submitting && <Spinner />} Simpan pengaturan
          </button>
        </div>
      </div>
    </section>
  );
}