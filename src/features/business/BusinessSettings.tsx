import { useEffect, useState } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Business } from "../../types";
import { StoreIdentity } from "../documents/StoreIdentity";
import {
  businessModules,
  getBusinessProfile,
  getEnabledModules,
  getModuleLabel,
  type BusinessModule,
} from "./businessProfile";

const MAX_LOGO_BYTES = 1_000_000;

const MODULE_IMPACTS: Record<BusinessModule, string> = {
  CATALOG: "Katalog produk dan master referensi barang.",
  INVENTORY: "Stok harian, opname, dan kartu mutasi.",
  SALES: "Modul inti. Menonaktifkan modul ini menyembunyikan kasir dan struk penjualan, data tidak dihapus.",
  PURCHASE: "Menonaktifkan Pembelian menyembunyikan riwayat restock, data tidak dihapus.",
  FINANCE: "Pencatatan kas dan akun keuangan usaha.",
  BOOKING: "Layanan booking dan jadwal operasional.",
  REPORTING: "Laporan performa penjualan dan ringkasan usaha.",
};

type SettingsSection = "profile" | "modules" | "preferences";

export function BusinessSettings({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: () => Promise<void>;
}) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");
  const [businessName, setBusinessName] = useState(business.name);
  const [businessType, setBusinessType] = useState(getBusinessProfile(business.business_type).type);
  const [modules, setModules] = useState<BusinessModule[]>(getEnabledModules(business));
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [logoError, setLogoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initialModules = getEnabledModules(business);
  const hasChanges =
    businessName !== business.name ||
    businessType !== getBusinessProfile(business.business_type).type ||
    logoUrl !== (business.logo_url ?? "") ||
    modules.length !== initialModules.length ||
    modules.some((m) => !initialModules.includes(m));

  useEffect(() => {
    setBusinessName(business.name);
    setBusinessType(getBusinessProfile(business.business_type).type);
    setModules(getEnabledModules(business));
    setLogoUrl(business.logo_url ?? "");
  }, [business]);

  function discardChanges() {
    setBusinessName(business.name);
    setBusinessType(getBusinessProfile(business.business_type).type);
    setModules(getEnabledModules(business));
    setLogoUrl(business.logo_url ?? "");
    setError("");
    setSuccess("");
    setLogoError("");
  }

  function toggleModule(module: BusinessModule) {
    setModules((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module],
    );
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
      setSuccess("Profil, modul, dan preferensi usaha berhasil diperbarui.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="content-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">KONFIGURASI</p>
          <h1>Pengaturan</h1>
          <p className="muted">Profil usaha, modul aktif, dan preferensi operasional.</p>
        </div>
      </div>

      <div className="settings">
        {/* SUBNAV KIRI */}
        <nav aria-label="Menu Pengaturan">
          <ul className="subnav">
            <li>
              <button
                type="button"
                className={activeSection === "profile" ? "is-active" : ""}
                onClick={() => setActiveSection("profile")}
              >
                Profil usaha
              </button>
            </li>
            <li>
              <button
                type="button"
                className={activeSection === "modules" ? "is-active" : ""}
                onClick={() => setActiveSection("modules")}
              >
                Modul aktif
              </button>
            </li>
            <li>
              <button
                type="button"
                className={activeSection === "preferences" ? "is-active" : ""}
                onClick={() => setActiveSection("preferences")}
              >
                Preferensi
              </button>
            </li>
          </ul>
        </nav>

        {/* PANEL KANAN */}
        <div>
          {hasChanges && (
            <div className="unsaved-bar" role="status" aria-live="polite">
              <span>Ada perubahan belum disimpan</span>
              <div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={discardChanges}
                  disabled={submitting}
                >
                  Buang
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => void submit()}
                  disabled={submitting}
                >
                  {submitting && <Spinner />} Simpan
                </button>
              </div>
            </div>
          )}

          {error && <div style={{ marginBottom: "var(--space-4)" }}><Alert tone="error">{error}</Alert></div>}
          {success && <div style={{ marginBottom: "var(--space-4)" }}><Alert tone="success">{success}</Alert></div>}

          {/* SECTION 1: PROFIL USAHA */}
          {activeSection === "profile" && (
            <section className="content-card">
              <div className="content-card__header">
                <div>
                  <h2>Profil usaha</h2>
                  <p>Identitas usaha yang tampil pada struk dan dokumen cetak.</p>
                </div>
              </div>

              <div style={{ padding: "var(--space-5)" }}>
                <div className="form-grid-2">
                  <label className="field">
                    <span>Nama usaha <em>*</em></span>
                    <input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                    />
                  </label>

                  <label className="field">
                    <span>Tipe usaha</span>
                    <span className="readonly-box">
                      {getBusinessProfile(business.business_type).label}
                      <small>tetap, memengaruhi menu</small>
                    </span>
                  </label>
                </div>

                <div style={{ marginTop: "var(--space-5)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--line-soft)" }}>
                  <h3 style={{ fontSize: "var(--text-md)", marginBottom: "var(--space-2)" }}>Logo usaha</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", marginBottom: "var(--space-4)" }}>
                    Logo dipakai pada kop struk transaksi dan lembar cetak A4.
                  </p>

                  <StoreIdentity
                    name={businessName || business.name}
                    logoUrl={logoUrl}
                    documentLabel="Pratinjau kop dokumen"
                    storeType={getBusinessProfile(business.business_type).label}
                  />

                  <div className="form-grid-2" style={{ marginTop: "var(--space-4)" }}>
                    <label className="field">
                      <span>Alamat gambar URL (opsional)</span>
                      <input
                        value={logoUrl.startsWith("data:") ? "" : logoUrl}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          setLogoError("");
                        }}
                        placeholder="https://contoh.com/logo.png"
                      />
                    </label>

                    <label className="field">
                      <span>Unggah berkas</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => pickLogoFile(e.target.files?.[0])}
                      />
                      <small>Maksimal 1 MB (PNG, JPG, SVG).</small>
                    </label>
                  </div>

                  {logoError && (
                    <p style={{ color: "var(--status-danger-text)", fontSize: "var(--text-xs)", marginTop: "var(--space-2)" }}>
                      {logoError}
                    </p>
                  )}

                  {logoUrl && (
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <button
                        type="button"
                        className="button button--ghost"
                        onClick={() => {
                          setLogoUrl("");
                          setLogoError("");
                        }}
                      >
                        Hapus logo
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void submit()}
                    disabled={submitting || !hasChanges}
                  >
                    {submitting && <Spinner />} Simpan perubahan
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2: MODUL AKTIF */}
          {activeSection === "modules" && (
            <section className="content-card">
              <div className="content-card__header">
                <div>
                  <h2>Modul aktif</h2>
                  <p>Menonaktifkan modul menyembunyikan menu, bukan menghapus data.</p>
                </div>
              </div>

              <div style={{ padding: "var(--space-5)" }}>
                {businessModules.map((module) => {
                  const isActive = modules.includes(module);
                  return (
                    <div key={module} className="module-row">
                      <div>
                        <strong>{getModuleLabel(module)}</strong>
                        <p>{MODULE_IMPACTS[module]}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        className={`switch ${isActive ? "is-on" : ""}`}
                        onClick={() => toggleModule(module)}
                      >
                        <i aria-hidden="true" />
                        <span>{isActive ? "Aktif" : "Nonaktif"}</span>
                      </button>
                    </div>
                  );
                })}

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void submit()}
                    disabled={submitting || !hasChanges}
                  >
                    {submitting && <Spinner />} Simpan perubahan
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: PREFERENSI */}
          {activeSection === "preferences" && (
            <section className="content-card">
              <div className="content-card__header">
                <div>
                  <h2>Preferensi</h2>
                  <p>Zona waktu memengaruhi stempel waktu seluruh dokumen transaksi.</p>
                </div>
              </div>

              <div style={{ padding: "var(--space-5)" }}>
                <div className="form-grid-2">
                  <label className="field">
                    <span>Zona waktu</span>
                    <input type="text" value="Asia/Jakarta" readOnly disabled />
                    <small>Waktu Indonesia Barat (WIB), UTC+07.</small>
                  </label>

                  <label className="field">
                    <span>Mata uang</span>
                    <input type="text" value="IDR" readOnly disabled />
                    <small>Rupiah Indonesia, simbol Rp.</small>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => void submit()}
                    disabled={submitting || !hasChanges}
                  >
                    {submitting && <Spinner />} Simpan perubahan
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}