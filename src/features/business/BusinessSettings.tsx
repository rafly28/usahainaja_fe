import { useEffect, useState } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Business } from "../../types";
import {
  businessModules,
  businessTypeOptions,
  getBusinessProfile,
  getEnabledModules,
  getModuleLabel,
  type BusinessModule,
} from "./businessProfile";

export function BusinessSettings({
  business,
  onSaved,
}: {
  business: Business;
  onSaved: () => Promise<void>;
}) {
  const [businessType, setBusinessType] = useState(getBusinessProfile(business.business_type).type);
  const [modules, setModules] = useState<BusinessModule[]>(getEnabledModules(business));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setBusinessType(getBusinessProfile(business.business_type).type);
    setModules(getEnabledModules(business));
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

  async function submit() {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await api.businesses.updateConfiguration({ business_type: businessType, enabled_modules: modules });
      await onSaved();
      setSuccess("Profil dan modul usaha berhasil diperbarui.");
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
