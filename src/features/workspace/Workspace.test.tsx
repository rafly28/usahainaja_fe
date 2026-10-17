import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Workspace } from "./Workspace";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    api: {
      businesses: { list: vi.fn() },
      products: { list: vi.fn().mockResolvedValue([]) },
      inventory: { list: vi.fn().mockResolvedValue([]), listPaged: vi.fn().mockResolvedValue({ items: [], pagination: { page: 1, limit: 25, total: 0 } }) },
      locations: { list: vi.fn().mockResolvedValue([]) },
      contacts: { list: vi.fn().mockResolvedValue([]) },
      cashAccounts: { list: vi.fn().mockResolvedValue([]) },
      sales: {
        list: vi.fn().mockResolvedValue([{ receipt_number: "SL-000001", sale_date: "2026-10-17T10:00:00+07:00", status: "COMPLETED", grand_total: "1000.00" }]),
        receipt: vi.fn().mockResolvedValue({
          receipt: {
            receipt_number: "SL-000001",
            sale_date: "2026-10-17T10:00:00+07:00",
            status: "COMPLETED",
            payment_status: "PAID",
            grand_total: "1000.00",
            items: [],
          },
        }),
      },
      purchases: { list: vi.fn().mockResolvedValue([]), receipt: vi.fn() },
      masterData: {},
      members: { list: vi.fn().mockResolvedValue([]) },
    },
    errorMessage: (error: unknown) => String(error),
  };
});

function renderWorkspace() {
  return render(
    <Workspace
      user={{ name: "Owner", email: "owner@test.com" }}
      activeBusiness={{ code: "BUS-1", name: "Toko Kopi Nusantara", business_type: "RETAIL", enabled_modules: ["CATALOG", "INVENTORY", "SALES", "PURCHASE", "FINANCE", "REPORTING"], role: "OWNER" }}
      businesses={[]}
      onSwitchBusiness={async () => {}}
      onBusinessUpdated={async () => {}}
      onLogout={async () => {}}
    />,
  );
}

describe("Workspace halaman dokumen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hanya menampilkan satu dokumen ketika struk dibuka, bukan hub beserta daftar pembelian", async () => {
    renderWorkspace();

    // Tombol "Dokumen" juga ada di dashboard, jadi ambil yang di navigasi.
    const navigation = await screen.findByRole("navigation", { name: "Navigasi utama" });
    await userEvent.click(within(navigation).getByRole("button", { name: "Dokumen" }));

    // Hub menampilkan judul untuk penjualan dan pembelian sekaligus.
    await screen.findByRole("heading", { name: /Dokumen Transaksi/ });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Penjualan" })).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Pembelian" })).toBeTruthy();
    });

    const saleButton = await screen.findByRole("button", { name: "Buka" });
    await userEvent.click(saleButton);

    // Setelah dokumen dibuka, hub tidak boleh tetap ada sehingga tidak ikut tercetak.
    await screen.findByText("Nomor SL-000001");
    expect(screen.queryByRole("heading", { name: /Dokumen Transaksi/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Pembelian" })).toBeNull();
    expect(screen.getByText("Toko Kopi Nusantara")).toBeTruthy();
  });
});