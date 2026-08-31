import { getModuleLabel, type BusinessModule, type BusinessProfile } from "./businessProfile";

export function BusinessProfileDashboard({
  profile,
  modules,
}: {
  profile: BusinessProfile;
  modules: BusinessModule[];
}) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">PROFIL USAHA</p>
        <h1>{profile.dashboardTitle}</h1>
        <p className="muted">{profile.dashboardDescription}</p>
      </div>

      <section className="profile-plan content-card" aria-labelledby="profile-plan-title">
        <div className="profile-plan__intro">
          <span className="profile-plan__badge">{profile.label}</span>
          <div>
            <h2 id="profile-plan-title">Langkah awal yang disiapkan</h2>
            <p>Ruang kerja akan bertambah mengikuti modul yang diaktifkan untuk usaha ini.</p>
          </div>
        </div>
        <ol className="profile-plan__steps">
          {profile.onboardingSteps.map((step, index) => (
            <li key={step}><span>{index + 1}</span>{step}</li>
          ))}
        </ol>
        <div className="profile-plan__modules">
          <strong>Modul profil</strong>
          {modules.length > 0 ? (
            <div>{modules.map((module) => <span key={module}>{getModuleLabel(module)}</span>)}</div>
          ) : (
            <p>Belum ada modul aktif. Pilihan modul akan tersedia pada pengaturan usaha.</p>
          )}
        </div>
      </section>
    </div>
  );
}
