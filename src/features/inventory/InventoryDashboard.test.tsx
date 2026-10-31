import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InventoryDashboard } from "./InventoryDashboard";
import type { InventoryItem } from "../../types";

const mockInventory: InventoryItem[] = [
  {
    code: "PRD-000001",
    name: "Apel Fuji",
    sku: "SKU-APEL",
    unit_symbol: "KG",
    quantity: 20,
    min_stock: 5,
    location_name: "Lokasi Utama",
    location_code: "LOC-DEFAULT",
    is_low_stock: false,
  },
  {
    code: "PRD-000002",
    name: "Kopi Arabika",
    sku: "SKU-KOPI",
    unit_symbol: "KG",
    quantity: 2,
    min_stock: 5,
    location_name: "Lokasi Utama",
    location_code: "LOC-DEFAULT",
    is_low_stock: true,
  },
];

describe("InventoryDashboard (L9)", () => {
  it("renders dashboard header with single primary CTA and 4 stat cards", () => {
    const onRetry = vi.fn();
    const onGoToProducts = vi.fn();
    const onGoToOpeningStock = vi.fn();
    const onGoToMovements = vi.fn();
    const onGoToOpname = vi.fn();

    render(
      <InventoryDashboard
        inventory={mockInventory}
        error=""
        onRetry={onRetry}
        onGoToProducts={onGoToProducts}
        onGoToOpeningStock={onGoToOpeningStock}
        onGoToMovements={onGoToMovements}
        onGoToOpname={onGoToOpname}
      />
    );

    // Header & Actions
    expect(screen.getByRole("heading", { level: 1, name: "Ringkasan" })).toBeTruthy();
    const ctaPrimary = screen.getByRole("button", { name: "Catat stok awal" });
    expect(ctaPrimary.classList.contains("button--primary")).toBe(true);

    const ctaSecondary = screen.getByRole("button", { name: "Riwayat stok" });
    expect(ctaSecondary.classList.contains("button--secondary")).toBe(true);

    // 4 Stat cards
    expect(screen.getByText("Produk tercatat")).toBeTruthy();
    expect(screen.getAllByText("Stok menipis").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Nilai stok")).toBeTruthy();
    expect(screen.getByText("Lokasi tercatat")).toBeTruthy();

    // Table rows
    expect(screen.getByText("Apel Fuji")).toBeTruthy();
    expect(screen.getByText("Kopi Arabika")).toBeTruthy();
    expect(screen.getByText("Aman")).toBeTruthy();
    expect(screen.getByText("Perlu dicek")).toBeTruthy();

    // Table footer
    expect(screen.getByText(/Menampilkan 2 dari 2 produk/)).toBeTruthy();
  });

  it("renders empty state when inventory is empty", () => {
    const onGoToProducts = vi.fn();
    render(
      <InventoryDashboard
        inventory={[]}
        error=""
        onRetry={vi.fn()}
        onGoToProducts={onGoToProducts}
        onGoToOpeningStock={vi.fn()}
        onGoToMovements={vi.fn()}
        onGoToOpname={vi.fn()}
      />
    );

    expect(screen.getByText("Belum ada produk tercatat")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambah produk pertama" })).toBeTruthy();
  });
});
