import type { Business } from "../../types";

export const businessModules = [
  "CATALOG",
  "INVENTORY",
  "SALES",
  "PURCHASE",
  "FINANCE",
  "BOOKING",
  "REPORTING",
] as const;

export type BusinessModule = (typeof businessModules)[number];
export type BusinessProfileType = "RETAIL" | "SERVICE" | "ENTERTAINMENT" | "OTHER";

export type BusinessProfile = {
  type: BusinessProfileType;
  label: string;
  description: string;
  dashboardTitle: string;
  dashboardDescription: string;
  onboardingSteps: string[];
  defaultModules: BusinessModule[];
};

const profiles: Record<BusinessProfileType, BusinessProfile> = {
  RETAIL: {
    type: "RETAIL",
    label: "Toko / Retail",
    description: "Produk fisik dan stok harian",
    dashboardTitle: "Stok usaha",
    dashboardDescription: "Lihat kondisi persediaan dan item yang perlu segera dicek.",
    onboardingSteps: ["Tambahkan produk", "Catat stok awal", "Terima pembelian", "Mulai kasir"],
    defaultModules: ["CATALOG", "INVENTORY", "SALES", "PURCHASE", "FINANCE", "REPORTING"],
  },
  SERVICE: {
    type: "SERVICE",
    label: "Jasa",
    description: "Layanan, klien, dan jadwal",
    dashboardTitle: "Ruang layanan",
    dashboardDescription: "Siapkan alur layanan dan client sebelum menerima booking.",
    onboardingSteps: ["Tambahkan layanan", "Catat client", "Atur booking", "Pantau pelunasan"],
    defaultModules: ["BOOKING", "FINANCE", "REPORTING"],
  },
  ENTERTAINMENT: {
    type: "ENTERTAINMENT",
    label: "Event / Hiburan",
    description: "Booking dan kebutuhan acara",
    dashboardTitle: "Ruang event",
    dashboardDescription: "Siapkan kebutuhan acara, klien, dan jadwal penampilan.",
    onboardingSteps: ["Tambahkan layanan event", "Catat client", "Konfirmasi booking", "Kelola biaya acara"],
    defaultModules: ["BOOKING", "FINANCE", "REPORTING"],
  },
  OTHER: {
    type: "OTHER",
    label: "Lainnya",
    description: "Pilih modul yang benar-benar diperlukan",
    dashboardTitle: "Atur ruang usaha",
    dashboardDescription: "Pilih modul yang sesuai agar ruang kerja tetap ringkas dan relevan.",
    onboardingSteps: ["Pilih modul", "Atur data awal", "Undang tim", "Mulai operasional"],
    defaultModules: [],
  },
};

export const businessTypeOptions = Object.values(profiles).map(({ type, label, description }) => ({
  value: type,
  label,
  description,
}));

const moduleLabels: Record<BusinessModule, string> = {
  CATALOG: "Katalog",
  INVENTORY: "Persediaan",
  SALES: "Penjualan",
  PURCHASE: "Pembelian",
  FINANCE: "Keuangan",
  BOOKING: "Booking",
  REPORTING: "Laporan",
};

function isBusinessModule(value: string): value is BusinessModule {
  return (businessModules as readonly string[]).includes(value);
}

export function getBusinessProfile(type?: string): BusinessProfile {
  const normalized = type?.trim().toUpperCase();
  if (!normalized) return profiles.RETAIL;
  if (normalized in profiles) return profiles[normalized as BusinessProfileType];
  return profiles.OTHER;
}

export function getEnabledModules(business: Business): BusinessModule[] {
  if (Array.isArray(business.enabled_modules)) {
    return [...new Set(business.enabled_modules.filter(isBusinessModule))];
  }
  return getBusinessProfile(business.business_type).defaultModules;
}

export function isModuleEnabled(modules: BusinessModule[], module: BusinessModule): boolean {
  return modules.includes(module);
}

export function getModuleLabel(module: BusinessModule): string {
  return moduleLabels[module];
}
