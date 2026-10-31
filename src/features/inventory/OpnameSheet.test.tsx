import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpnameSheet, type OpnameSheetItem } from "./OpnameSheet";
import { roundQuantity } from "../../lib/format";

describe("roundQuantity", () => {
  it("PCS dibulatkan bulat, KG satu desimal", () => {
    expect(roundQuantity("12.6", "PCS")).toBe("13");
    expect(roundQuantity("20.55", "KG")).toBe("20.6");
    expect(roundQuantity("20.54", "KG")).toBe("20.5");
  });
});

describe("OpnameSheet", () => {
  const items: OpnameSheetItem[] = [
    {
      productCode: "PRD-000001",
      productName: "Apel Fuji",
      unitSymbol: "KG",
      systemQuantity: "20.5",
      countedQuantity: "17.5",
      differenceQuantity: "-3",
      note: "Kedaluwarsa",
    },
    {
      productCode: "PRD-000002",
      productName: "Kopi Arabika",
      unitSymbol: "KG",
      systemQuantity: "8",
      countedQuantity: "8",
      differenceQuantity: "0",
    },
  ];

  const fixture = {
    storeName: "Toko QC",
    storeType: "Toko / Retail",
    documentNumber: "OPN-2026-0001",
    locationLabel: "Lokasi Utama · LOC-DEFAULT",
    dateLabel: "17 Oktober 2026, 09.42 WIB",
    actorName: "QC UsahainAja",
    status: "COMPLETED",
    notes: "Hitung ulang sore hari",
    items,
    onBack: () => {},
  };

  it("menampilkan baris nol sebagai Sama (0) dan selisih negatif dengan tanda minus", () => {
    render(<OpnameSheet {...fixture} />);
    expect(screen.getByText("Sama (0)")).toBeTruthy();
    expect(screen.getByText("−3")).toBeTruthy();
    expect(screen.getByText("Halaman 1 dari 1")).toBeTruthy();
  });
});
