import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthScreen } from "./AuthScreen";

describe("AuthScreen", () => {
  it("renders story panel with 3 uniform preview cards and unique form H1", () => {
    const onAuth = vi.fn().mockResolvedValue(undefined);
    render(<AuthScreen onAuthenticated={onAuth} />);

    // 3 preview cards
    expect(screen.getByText("Produk aktif")).toBeTruthy();
    expect(screen.getByText("Stok menipis")).toBeTruthy();
    expect(screen.getByText("Omzet hari ini")).toBeTruthy();
    expect(screen.getByText("153.500")).toBeTruthy();

    // Single H1 in the form panel
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBe(1);
    expect(headings[0]?.textContent).toBe("Masuk ke ruang usahamu");

    // Left story headline is H2
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.some((h) => h.textContent === "Usaha lebih tertata. Kepala lebih lega.")).toBe(true);
  });

  it("toggles password visibility when clicking Tampilkan/Sembunyikan button", () => {
    const onAuth = vi.fn().mockResolvedValue(undefined);
    render(<AuthScreen onAuthenticated={onAuth} />);

    const passwordInput = screen.getByPlaceholderText("Minimal 8 karakter") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByRole("button", { name: "Tampilkan" });
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: "Sembunyikan" })).toBeTruthy();
  });

  it("switches to registration mode with required full name and password confirmation", () => {
    const onAuth = vi.fn().mockResolvedValue(undefined);
    render(<AuthScreen onAuthenticated={onAuth} />);

    const registerTab = screen.getByRole("tab", { name: "Daftar" });
    fireEvent.click(registerTab);

    expect(screen.getByText("Mulai rapikan usahamu")).toBeTruthy();
    expect(screen.getByPlaceholderText("Contoh: Siti Rahma")).toBeTruthy();
    expect(screen.getByPlaceholderText("Ketik ulang kata sandi")).toBeTruthy();
  });
});
