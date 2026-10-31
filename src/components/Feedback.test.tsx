import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert, EmptyState, SkeletonRows } from "./Feedback";

describe("Feedback components", () => {
  it("menampilkan alert info tanpa role alert", () => {
    render(<Alert tone="info">Pratinjau</Alert>);
    expect(screen.getByRole("status").textContent).toContain("Pratinjau");
  });

  it("empty state tanpa ilustrasi dan memuat aksi", () => {
    render(
      <EmptyState
        title="Belum ada produk"
        description="Tambah produk pertama."
        action={<button>Tambah</button>}
      />
    );
    expect(screen.queryByText("Belum ada produk")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tambah" })).toBeTruthy();
    expect(document.querySelector(".empty-state__illustration")).toBeNull();
  });

  it("skeleton merender jumlah baris dan kolom", () => {
    render(<SkeletonRows rows={4} columns={5} />);
    expect(document.querySelectorAll(".skeleton-row")).toHaveLength(4);
    expect(document.querySelectorAll(".skeleton-row > span")).toHaveLength(20);
  });
});
