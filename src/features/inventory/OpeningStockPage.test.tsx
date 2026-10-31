import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OpeningStockPage } from "./OpeningStockPage";
import type { Business, Product } from "../../types";

const mockBusiness: Business = {
  code: "BIZ001",
  name: "Toko QC",
  business_type: "RETAIL",
  default_location: {
    code: "LOC-DEFAULT",
    name: "Lokasi Utama",
  },
};

const mockProducts: Product[] = [
  {
    code: "PRD-000001",
    name: "Air Mineral",
    sku: "PRD-000001",
    unit_symbol: "PCS",
    default_purchase_price: 3500,
    default_selling_price: 5000,
    min_stock: 0,
    is_stock_tracked: true,
  },
  {
    code: "PRD-000002",
    name: "Apel Fuji",
    sku: "PRD-000002",
    unit_symbol: "KG",
    default_purchase_price: 28000,
    default_selling_price: 38000,
    min_stock: 5,
    is_stock_tracked: true,
  },
];

describe("OpeningStockPage (L11)", () => {
  it("renders page header, neutral banner, and tabular inputs with empty default", () => {
    const onRecorded = vi.fn();
    const onGoToProducts = vi.fn();

    render(
      <OpeningStockPage
        products={mockProducts}
        business={mockBusiness}
        success=""
        onRecorded={onRecorded}
        onGoToProducts={onGoToProducts}
      />
    );

    // Header & Banner
    expect(screen.getByRole("heading", { level: 1, name: "Stok awal" })).toBeTruthy();
    expect(
      screen.getByText(/Pencatatan stok awal membuat riwayat gerakan stok dan tidak dapat ditimpa/)
    ).toBeTruthy();

    // Inputs default to empty ""
    const inputAirMineral = screen.getByLabelText("Stok awal Air Mineral") as HTMLInputElement;
    expect(inputAirMineral.value).toBe("");

    // Submit button is disabled when 0 rows are filled
    const submitBtn = screen.getByRole("button", { name: "Catat stok awal" }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // Filling quantity calculates item value and updates counters
    fireEvent.change(inputAirMineral, { target: { value: "40" } });
    expect(inputAirMineral.value).toBe("40");

    // 40 * 3500 = 140.000
    expect(screen.getAllByText(/Rp 140\.000/).length).toBeGreaterThanOrEqual(1);

    // Submit button is now enabled
    expect(submitBtn.disabled).toBe(false);

    // Readonly location box
    expect(screen.getByText("Lokasi Utama")).toBeTruthy();
    expect(screen.getByText("satu-satunya lokasi")).toBeTruthy();
  });

  it("renders empty state when there are no products", () => {
    render(
      <OpeningStockPage
        products={[]}
        business={mockBusiness}
        success=""
        onRecorded={vi.fn()}
        onGoToProducts={vi.fn()}
      />
    );

    expect(screen.getByText("Produk belum tersedia")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buat produk" })).toBeTruthy();
  });
});
