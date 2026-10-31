import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockMovementsPage } from "./StockMovementsPage";

vi.mock("../../lib/api", () => ({
  api: {
    locations: {
      list: vi.fn().mockResolvedValue([
        { code: "LOC-DEFAULT", name: "Lokasi Utama", is_default: true },
      ]),
    },
    inventory: {
      movements: vi.fn().mockResolvedValue({
        items: [
          {
            product_code: "PRD-000001",
            product_name: "Air Mineral",
            occurred_at: "2026-10-17T09:00:00Z",
            movement_type: "OPENING_BALANCE",
            direction: "IN",
            quantity: 40,
            unit_symbol: "PCS",
            location_name: "Lokasi Utama",
            location_code: "LOC-DEFAULT",
            reason: "Saldo awal",
            created_by_name: "QC Admin",
          },
        ],
        pagination: { page: 1, limit: 25, total: 1 },
      }),
    },
  },
  errorMessage: (err: unknown) => String(err),
}));

describe("StockMovementsPage (L12)", () => {
  it("renders stock movements ledger with tabular numbers and direction pills", async () => {
    const onGoBack = vi.fn();
    render(<StockMovementsPage onGoBack={onGoBack} />);

    // Heading & eyebrow
    expect(screen.getByRole("heading", { level: 1, name: "Riwayat Pergerakan Stok" })).toBeTruthy();
    expect(screen.getByText("Inventaris")).toBeTruthy();

    // Table item
    expect(await screen.findByText("Air Mineral")).toBeTruthy();
    expect(screen.getByText("+40")).toBeTruthy();
    expect(screen.getByText("PCS")).toBeTruthy();
    expect(screen.getAllByText("Stok awal").length).toBeGreaterThanOrEqual(1);
  });
});
