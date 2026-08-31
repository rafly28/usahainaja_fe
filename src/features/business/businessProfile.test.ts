import { describe, expect, it } from "vitest";
import { getBusinessProfile, getEnabledModules, isModuleEnabled } from "./businessProfile";

describe("business profile", () => {
  it("uses the Retail preset for existing businesses without a type", () => {
    const modules = getEnabledModules({ name: "Toko Lama" });

    expect(getBusinessProfile().type).toBe("RETAIL");
    expect(isModuleEnabled(modules, "CATALOG")).toBe(true);
    expect(isModuleEnabled(modules, "INVENTORY")).toBe(true);
  });

  it("prefers enabled modules returned by the Core API", () => {
    const modules = getEnabledModules({
      name: "Studio Foto",
      business_type: "SERVICE",
      enabled_modules: ["BOOKING", "REPORTING", "BOOKING", "UNKNOWN"],
    });

    expect(modules).toEqual(["BOOKING", "REPORTING"]);
    expect(isModuleEnabled(modules, "INVENTORY")).toBe(false);
  });

  it("keeps Other empty until modules are selected", () => {
    expect(getEnabledModules({ name: "Usaha Baru", business_type: "OTHER" })).toEqual([]);
  });
});
