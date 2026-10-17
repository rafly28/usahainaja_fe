import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceiptPage } from "./ReceiptPage";

vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return {
    ...actual,
    api: {
      sales: { receipt: vi.fn() },
      purchases: { receipt: vi.fn() },
    },
  };
});

const { api } = await import("../../lib/api");

const salePayload = {
  receipt: {
    receipt_number: "SL-000001",
    sale_date: "2026-10-17T10:00:00+07:00",
    status: "COMPLETED",
    payment_status: "PAID",
    grand_total: "2000.00",
    paid_total: "2000.00",
    items: [
      {
        line_number: 1,
        product_code: "PRD-000001",
        product_name: "Kopi Bubuk",
        quantity: "2.0000",
        unit_price: "1000.00",
        subtotal: "2000.00",
      },
    ],
  },
};

describe("ReceiptPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.sales.receipt).mockResolvedValue(salePayload);
    vi.mocked(api.purchases.receipt).mockResolvedValue({ receipt: { ...salePayload.receipt, receipt_number: undefined, purchase_number: "PUR-000001" } });
  });

  it("menampilkan logo dan nama toko pada kop dokumen", async () => {
    render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    expect(await screen.findByText("Toko Kopi Nusantara")).toBeTruthy();
    // Tanpa logo, kop memakai badge inisial nama toko.
    expect(screen.getByText("TKN")).toBeTruthy();
    // Label jenis dokumen muncul di judul halaman dan di kop dokumen.
    expect(screen.getAllByText("Struk Penjualan")).toHaveLength(2);
  });

  it("tidak menampilkan kalimat Dicetak dari UsahainAja", async () => {
    const { container } = render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    expect(container.textContent ?? "").not.toContain("Dicetak dari");
  });

  it("menampilkan logo toko bila tersedia dan tidak memakai logo aplikasi", async () => {
    const { container } = render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        businessLogoUrl="data:image/png;base64,iVBORw0KGgo="
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    const logo = container.querySelector<HTMLImageElement>("img.document-logo");
    expect(logo?.getAttribute("src")).toContain("data:image/png");
    expect(container.querySelector(".document-logo--fallback")).toBeNull();
    // Logo aplikasi tidak boleh muncul pada dokumen.
    expect(container.querySelector(".brand")).toBeNull();
  });

  it("memakai badge inisial sebagai fallback ketika logo tidak dimuat", async () => {
    const { container } = render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    expect(container.querySelector(".document-logo--fallback")?.textContent).toBe("TKN");
  });

  it("menandai area tombol dan navigasi sebagai no-print", async () => {
    const { container } = render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    expect(container.querySelector(".document-actions.no-print")).toBeTruthy();
  });
});