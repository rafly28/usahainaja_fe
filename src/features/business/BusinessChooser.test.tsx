import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BusinessChooser } from "./BusinessChooser";
import type { Business } from "../../types";

const mockBusinesses: Business[] = [
  {
    code: "BIZ001",
    name: "Toko QC",
    role: "OWNER",
  },
  {
    code: "BIZ002",
    name: "Kafe Kopi QC",
    role: "STAFF",
  },
];

describe("BusinessChooser (L12)", () => {
  it("renders business chooser screen with list and switches business on click", async () => {
    const onChoose = vi.fn();
    const onLogout = vi.fn();

    render(
      <BusinessChooser
        businesses={mockBusinesses}
        onChoose={onChoose}
        onLogout={onLogout}
      />
    );

    // Eyebrow & Title
    expect(screen.getByText("PILIH RUANG USAHA")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Mau mengurus usaha yang mana?" })).toBeTruthy();

    // Businesses list
    expect(screen.getByText("Toko QC")).toBeTruthy();
    expect(screen.getByText("Kafe Kopi QC")).toBeTruthy();

    // Choose business
    fireEvent.click(screen.getByText("Toko QC"));
    expect(onChoose).toHaveBeenCalledWith("BIZ001");
  });
});
