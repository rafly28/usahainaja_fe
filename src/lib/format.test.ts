import { describe, expect, it } from "vitest";
import { isLowStock, numeric } from "./format";

describe("format helpers", () => {
  it("membaca decimal dari API tanpa kehilangan comparison", () => {
    expect(numeric("12.500")).toBe(12.5);
  });

  it("menganggap jumlah sama dengan minimum sebagai stok rendah", () => {
    expect(isLowStock("5", "5")).toBe(true);
    expect(isLowStock("6", "5")).toBe(false);
  });

  it("tidak memberi warning ketika minimum nol", () => {
    expect(isLowStock("0", "0")).toBe(false);
  });
});
