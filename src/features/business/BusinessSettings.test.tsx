import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BusinessSettings } from "./BusinessSettings";
import { type Business } from "../../types";

const mockBusiness: Business = {
  code: "biz-1",
  name: "Toko QC",
  business_type: "RETAIL",
  currency: "IDR",
  timezone: "Asia/Jakarta",
  logo_url: "",
  role: "OWNER",
};

describe("BusinessSettings (L5)", () => {
  it("renders subnav sections and preferences with timezone and currency", () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    render(<BusinessSettings business={mockBusiness} onSaved={onSaved} />);

    // Subnav buttons
    expect(screen.getByRole("button", { name: "Profil usaha" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Modul aktif" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Preferensi" })).toBeTruthy();

    // Switch to Preferences
    fireEvent.click(screen.getByRole("button", { name: "Preferensi" }));

    // Timezone & currency
    const timezoneInput = screen.getByDisplayValue("Asia/Jakarta");
    const currencyInput = screen.getByDisplayValue("IDR");
    expect(timezoneInput).toBeTruthy();
    expect(currencyInput).toBeTruthy();
  });

  it("shows unsaved-bar when editing fields and switches modules", () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    render(<BusinessSettings business={mockBusiness} onSaved={onSaved} />);

    // Initially no unsaved-bar
    expect(screen.queryByText("Ada perubahan belum disimpan")).toBeNull();

    // Edit business name
    const nameInput = screen.getByDisplayValue("Toko QC");
    fireEvent.change(nameInput, { target: { value: "Toko QC Baru" } });

    // Unsaved-bar appears
    expect(screen.getByText("Ada perubahan belum disimpan")).toBeTruthy();

    // Switch to modules
    fireEvent.click(screen.getByRole("button", { name: "Modul aktif" }));
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThan(0);
  });
});
