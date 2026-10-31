import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CashierPage } from "./CashierPage";
import { type Product } from "../../types";

const mockProducts: Product[] = [
  {
    code: "PROD-1",
    public_code: "PROD-1",
    name: "Air Mineral",
    sku: "AIR-001",
    unit_symbol: "PCS",
    default_selling_price: "5000",
    stock: 40,
  },
  {
    code: "PROD-2",
    public_code: "PROD-2",
    name: "Apel Fuji",
    sku: "APL-001",
    unit_symbol: "KG",
    default_selling_price: "38000",
    stock: 20,
  },
];

describe("CashierPage (L4)", () => {
  it("renders POS layout with explicit field labels and uniform Diskon/Pajak labels", () => {
    const onSaleCreated = vi.fn();
    const onGoToProducts = vi.fn();

    render(
      <CashierPage
        products={mockProducts}
        onSaleCreated={onSaleCreated}
        onGoToProducts={onGoToProducts}
      />
    );

    // Header & search
    expect(screen.getByText("Kasir (POS)")).toBeTruthy();
    expect(screen.getByPlaceholderText(/Cari nama, SKU/)).toBeTruthy();

    // Summary labels
    expect(screen.getByText("Subtotal")).toBeTruthy();
    expect(screen.getByText("Diskon")).toBeTruthy();
    expect(screen.getByText("Pajak")).toBeTruthy();
    expect(screen.queryByText("Pajak (Tax)")).toBeNull();
    expect(screen.getByText("Total Tagihan")).toBeTruthy();

    // Required field labels
    expect(screen.getAllByText(/Lokasi/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pelanggan/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Kas/).length).toBeGreaterThan(0);

    // Primary CTA disabled when empty
    const payBtn = screen.getByRole("button", { name: /Bayar Sekarang/ }) as HTMLButtonElement;
    expect(payBtn.disabled).toBe(true);

    // Empty state rendered
    expect(screen.getByText("Belum ada produk dipilih")).toBeTruthy();
  });

  it("adds item to cart and updates primary CTA with total", () => {
    const onSaleCreated = vi.fn();
    const onGoToProducts = vi.fn();

    render(
      <CashierPage
        products={mockProducts}
        onSaleCreated={onSaleCreated}
        onGoToProducts={onGoToProducts}
      />
    );

    const productCard = screen.getByRole("button", { name: /Air Mineral/ });
    fireEvent.click(productCard);

    // Empty state should be gone
    expect(screen.queryByText("Belum ada produk dipilih")).toBeNull();

    // Pay button becomes enabled
    const payBtn = screen.getByRole("button", { name: /Bayar Sekarang/ }) as HTMLButtonElement;
    expect(payBtn.disabled).toBe(false);
  });
});
