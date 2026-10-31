import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MasterDataPage } from "./MasterDataPage";

describe("MasterDataPage (L6)", () => {
  it("renders inline-flex tablist and switches tabs", () => {
    render(<MasterDataPage role="OWNER" />);

    expect(screen.getByRole("tablist", { name: "Jenis data usaha" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Kategori" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Satuan" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Konversi" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Lokasi" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Relasi" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Tim usaha" })).toBeTruthy();

    // Click Satuan tab
    fireEvent.click(screen.getByRole("tab", { name: "Satuan" }));
    expect(screen.getByRole("heading", { name: /Tambah satuan/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Daftar satuan/ })).toBeTruthy();
  });
});
