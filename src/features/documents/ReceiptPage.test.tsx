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
    location_code: "LOC-DEFAULT",
    status: "COMPLETED",
    payment_status: "PAID",
    customer_code: null,
    subtotal: "2000.00",
    discount_total: "0.00",
    tax_total: "0.00",
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
    vi.mocked(api.purchases.receipt).mockResolvedValue({
      receipt: { ...salePayload.receipt, receipt_number: undefined, purchase_number: "PUR-000001" },
    });
  });

  it("menampilkan logo dan nama toko pada kop dokumen", async () => {
    render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        businessType="Toko / Retail"
        onGoBack={() => {}}
      />,
    );

    expect(await screen.findByText("Toko Kopi Nusantara")).toBeTruthy();
    // Tanpa logo, kop memakai badge inisial nama toko.
    expect(screen.getByText("TKN")).toBeTruthy();
    // Tipe usaha muncul di kop mengikuti mockup design system (Layar 08).
    expect(screen.getByText("Toko / Retail")).toBeTruthy();
    // Label jenis dokumen muncul di judul halaman dan meta "Jenis".
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
        businessType="Toko / Retail"
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

  it("menampilkan meta layout mockup: Jenis, Tanggal, Pelanggan Umum, Lokasi", async () => {
    render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    expect(screen.getByText("Jenis")).toBeTruthy();
    expect(screen.getByText("Pelanggan")).toBeTruthy();
    // Pelanggan tanpa data ditampilkan sebagai "Umum" (A10, mockup Layar 08).
    expect(screen.getByText("Umum")).toBeTruthy();
    expect(screen.getByText("LOC-DEFAULT")).toBeTruthy();
    expect(screen.getByText("PAID")).toBeTruthy();
  });

  it("memakai sel angka .num dengan format Rupiah pada tabel item", async () => {
    const { container } = render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    // Header kolom angka ikut rata kanan mengikuti sel isinya (design system §4.2).
    const numHeaders = container.querySelectorAll<HTMLTableSectionElement>("thead th.num");
    expect(numHeaders).toHaveLength(3);
    expect(container.querySelectorAll("tbody td.num")).toHaveLength(3);
    expect(screen.getByText("Rp 1.000")).toBeTruthy();
    // Jumlah = Rp 2.000 muncul di tabel dan kembali pada totals.
    expect(screen.getAllByText("Rp 2.000").length).toBeGreaterThanOrEqual(3);
  });

  it("menampilkan blok totals lengkap dari payload: Subtotal, Diskon, Pajak, Total", async () => {
    render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    expect(screen.getAllByText(/^(Subtotal|Diskon|Pajak)$/)).toHaveLength(3);
    expect(screen.getByText("Total")).toBeTruthy();
    const totals = document.querySelectorAll(".document-totals__row");
    expect(totals.length >= 4).toBe(true);
  });

  it("menyimpan nomor dokumen publik pada kop", async () => {
    const { container } = render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    const value = container.querySelector(".document-head__value");
    expect(value?.textContent).toBe("SL-000001");
  });

  it("menampilkan Supplier Tanpa supplier pada dokumen pembelian", async () => {
    render(
      <ReceiptPage
        documentNumber="PUR-000001"
        documentType="purchase"
        businessName="Toko Kopi Nusantara"
        businessType="Toko / Retail"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    expect(screen.getByText("Supplier")).toBeTruthy();
    expect(screen.getByText("Tanpa supplier")).toBeTruthy();
    // Jenis dokumen muncul di judul halaman dan meta "Jenis".
    expect(screen.getAllByText("Konfirmasi Pembelian")).toHaveLength(2);
  });

  it("dokumen pembelian memakai kuantitas diterima", async () => {
    vi.mocked(api.purchases.receipt).mockResolvedValueOnce({
      receipt: {
        ...salePayload.receipt,
        receipt_number: undefined,
        purchase_number: "PUR-000002",
        items: [
          {
            line_number: 1,
            product_code: "PRD-000001",
            product_name: "Kopi Bubuk",
            quantity: "10.0000",
            received_quantity: "7.0000",
            unit_price: "1000.00",
            subtotal: "7000.00",
          },
        ],
      },
    });

    render(
      <ReceiptPage
        documentNumber="PUR-000002"
        documentType="purchase"
        businessName="Toko Kopi Nusantara"
        businessType="Toko / Retail"
        onGoBack={() => {}}
      />,
    );

    expect(await screen.findByText("7")).toBeTruthy();
  });

  it("nomor dokumen tidak memaksa kolom produk nowrap", async () => {
    render(
      <ReceiptPage
        documentNumber="SL-000001"
        documentType="sale"
        businessName="Toko Kopi Nusantara"
        onGoBack={() => {}}
      />,
    );

    await screen.findByText("Toko Kopi Nusantara");
    const firstCell = document.querySelector(".document-sheet td:first-child");
    expect(firstCell?.className ?? "").not.toContain("nowrap");
  });
});
