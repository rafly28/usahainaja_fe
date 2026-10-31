import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockAdjustmentsPage } from "./StockAdjustmentsPage";

vi.mock("../../lib/api", () => ({
  api: {
    products: {
      list: vi.fn().mockResolvedValue([
        {
          code: "PRD-000001",
          name: "Air Mineral",
          is_stock_tracked: true,
          unit_symbol: "PCS",
        },
      ]),
    },
    locations: {
      list: vi.fn().mockResolvedValue([
        { code: "LOC-DEFAULT", name: "Lokasi Utama", is_default: true },
      ]),
    },
    inventory: {
      adjustments: vi.fn().mockResolvedValue({
        items: [
          {
            adjustment_number: "ADJ-20261017-001",
            adjustment_date: "2026-10-17T10:00:00Z",
            location_code: "LOC-DEFAULT",
            reason: "Koreksi stok",
            status: "DRAFT",
          },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      }),
    },
  },
  errorMessage: (err: unknown) => String(err),
}));

describe("StockAdjustmentsPage (L12)", () => {
  it("renders adjustment form and drafts list with doc-no", async () => {
    const onGoBack = vi.fn();
    const onSuccess = vi.fn();
    render(<StockAdjustmentsPage onGoBack={onGoBack} onSuccess={onSuccess} />);

    // Header & eyebrow
    expect(screen.getByRole("heading", { level: 1, name: "Penyesuaian Stok" })).toBeTruthy();
    expect(screen.getByText("Inventaris")).toBeTruthy();

    // Drafts table
    expect(await screen.findByText("ADJ-20261017-001")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Selesaikan" })).toBeTruthy();
  });
});
