import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RestockPage } from "./RestockPage";
import { type Product } from "../../types";

const mockProducts: Product[] = [
  {
    code: "PROD-1",
    public_code: "PROD-1",
    name: "Kopi Arabika",
    sku: "KOP-001",
    unit_symbol: "KG",
    default_purchase_price: "95000",
    default_selling_price: "120000",
    stock: 10,
  },
];

describe("RestockPage (L3)", () => {
  it("renders purchase list section with status pills and actions hierarchy", async () => {
    const onPurchaseCreated = vi.fn();
    const onGoToProducts = vi.fn();

    render(
      <RestockPage
        products={mockProducts}
        onPurchaseCreated={onPurchaseCreated}
        onGoToProducts={onGoToProducts}
      />
    );

    expect(screen.getByText("Pembelian")).toBeTruthy();
    expect(screen.getByText("Daftar pembelian")).toBeTruthy();
    expect(screen.getByText("Item pembelian")).toBeTruthy();
    expect(screen.getByText("Ringkasan biaya")).toBeTruthy();

    // Action hierarchy: "Terima barang" is primary, "Simpan draf" is secondary
    const receiveButton = screen.getByRole("button", { name: "Terima barang" });
    const draftButton = screen.getByRole("button", { name: "Simpan draf" });

    expect(receiveButton.classList.contains("button--primary")).toBe(true);
    expect(draftButton.classList.contains("button--secondary")).toBe(true);
  });
});
