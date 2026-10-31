import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductsPage } from "./ProductsPage";
import type { Product } from "../../types";

const mockProducts: Product[] = [
  {
    code: "PRD-000001",
    name: "Air Mineral",
    sku: "PRD-000001",
    unit_symbol: "PCS",
    default_selling_price: 5000,
    default_purchase_price: 3500,
    min_stock: 0,
    is_stock_tracked: true,
  },
  {
    code: "PRD-000002",
    name: "Apel Fuji",
    sku: "PRD-000002",
    unit_symbol: "KG",
    default_selling_price: 38000,
    default_purchase_price: 28000,
    min_stock: 5,
    is_stock_tracked: true,
  },
];

describe("ProductsPage (L10)", () => {
  it("renders catalog table with single primary CTA and without Kategori column if <50% have it", () => {
    const onCreated = vi.fn();
    const onRetry = vi.fn();

    render(
      <ProductsPage
        products={mockProducts}
        error=""
        success=""
        onCreated={onCreated}
        onRetry={onRetry}
      />
    );

    // Header & Single Primary CTA
    expect(screen.getByRole("heading", { level: 1, name: "Produk" })).toBeTruthy();
    const addBtn = screen.getByRole("button", { name: /Tambah produk/ });
    expect(addBtn.classList.contains("button--primary")).toBe(true);

    // Table headers & content
    expect(screen.getByRole("columnheader", { name: "Produk" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Satuan" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Harga jual" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Stok minimum" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Aksi" })).toBeTruthy();

    // Kategori should NOT be rendered since 0 of 2 have it
    expect(screen.queryByRole("columnheader", { name: "Kategori" })).toBeNull();
    expect(screen.getByText(/Kolom KATEGORI tidak dirender: 0 dari 2 baris punya nilai/)).toBeTruthy();

    // Table rows
    expect(screen.getByText("Air Mineral")).toBeTruthy();
    expect(screen.getByText("Apel Fuji")).toBeTruthy();
    expect(screen.getAllByText("Aktif").length).toBe(2);
  });

  it("renders Kategori column when >= 50% rows have categories", () => {
    const productsWithCategory: Product[] = [
      {
        ...mockProducts[0],
        name: "Air Mineral",
        category_name: "Minuman",
      },
      {
        ...mockProducts[1],
        name: "Apel Fuji",
        category_name: "Buah",
      },
    ];

    render(
      <ProductsPage
        products={productsWithCategory}
        error=""
        success=""
        onCreated={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeTruthy();
    expect(screen.getByText("Minuman")).toBeTruthy();
    expect(screen.getByText("Buah")).toBeTruthy();
  });
});
