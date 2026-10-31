import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockOpnamePage } from "./StockOpnamePage";

describe("StockOpnamePage (L8)", () => {
  it("renders stock opname page with counter bar and client-side difference preview", async () => {
    const onGoBack = vi.fn();
    render(
      <StockOpnamePage
        onGoBack={onGoBack}
        businessName="Toko QC"
        businessType="RETAIL"
      />
    );

    // Header & banner
    expect(screen.getByRole("heading", { level: 1, name: "Stok Opname" })).toBeTruthy();
    expect(screen.getByText(/Selisih dihitung di server/)).toBeTruthy();

    // Counter bar
    expect(screen.getByText(/baris terisi/)).toBeTruthy();

    // Primary CTA
    const submitBtn = screen.getByRole("button", { name: "Simpan dan Terapkan" }) as HTMLButtonElement;
    expect(submitBtn.classList.contains("button--primary")).toBe(true);
    expect(submitBtn.disabled).toBe(true);
  });
});
