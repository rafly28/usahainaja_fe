import { describe, expect, it } from "vitest";
import { inventoryApi } from "./api.inventory";

type FetchCall = { url: string; init?: RequestInit };

/** Mengambil satu panggilan fetch berdasarkan pola URL agar assertion tidak bergantung pada indeks. */
function callMatching(calls: FetchCall[], fragment: string): FetchCall {
  const match = calls.find((call) => call.url.includes(fragment));
  if (!match) throw new Error(`tidak ada request yang cocok dengan ${fragment}`);
  return match;
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Stub fetch yang juga melayani /api/auth/csrf supaya request mutation bisa
 * melewati proteksi CSRF tanpa boilerplate tambahan di setiap test.
 */
function stubFetch(calls: FetchCall[], body: unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/api/auth/csrf")) {
      return jsonResponse({ csrf_token: "test-csrf-token" });
    }
    return jsonResponse(body);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

describe("inventoryApi", () => {
  it("meneruskan filter pergerakan sesuai kontrak", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, { movements: [], pagination: { page: 2, limit: 25, total: 0 } });

    await inventoryApi.movements({
      product_public_code: "prd-000001",
      location: "loc-default",
      movement_type: "ADJUSTMENT",
      date_from: "2026-08-01",
      date_to: "2026-08-31",
      page: 2,
      limit: 25,
    });

    restore();
    const url = new URL(callMatching(calls, "/api/inventory/movements").url, "http://localhost");
    expect(url.pathname).toBe("/api/inventory/movements");
    expect(url.searchParams.get("product_public_code")).toBe("prd-000001");
    expect(url.searchParams.get("movement_type")).toBe("ADJUSTMENT");
    expect(url.searchParams.get("date_from")).toBe("2026-08-01");
    expect(url.searchParams.get("date_to")).toBe("2026-08-31");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("menghapus filter kosong agar query string tetap bersih", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, { items: [] });

    await inventoryApi.list({ search: "", lowStock: false });
    restore();

    const url = new URL(callMatching(calls, "/api/inventory/products").url, "http://localhost");
    expect(url.searchParams.has("search")).toBe(false);
    expect(url.searchParams.has("low_stock")).toBe(false);
  });

  it("membaca low_stock sebagai true saat diminta", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, { items: [] });

    await inventoryApi.list({ lowStock: true });
    restore();

    const url = new URL(callMatching(calls, "/api/inventory/products").url, "http://localhost");
    expect(url.searchParams.get("low_stock")).toBe("true");
  });

  it("mengembalikan daftar dan metadata pagination untuk adjustment", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, {
      items: [{ adjustment_number: "ADJ-000001", status: "DRAFT" }],
      pagination: { page: 1, limit: 25, total: 1 },
    });

    const result = await inventoryApi.adjustments({ status: "DRAFT" });
    restore();

    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(new URL(callMatching(calls, "/api/inventory/adjustments").url, "http://localhost").searchParams.get("status")).toBe("DRAFT");
  });

  it("membaca daftar movement dari kunci movements", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, {
      movements: [{ product_code: "PRD-1", direction: "IN" }],
      pagination: { page: 1, limit: 25, total: 1 },
    });

    const result = await inventoryApi.movements();
    restore();

    expect(result.items).toHaveLength(1);
  });

  it("mengirim batch item pada stok awal", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, { adjustment_number: "OPEN-000001" });

    await inventoryApi.openingStock({
      location_code: "LOC-DEFAULT",
      items: [{ product_code: "PRD-1", quantity: "10" }],
    });
    restore();

    const payload = JSON.parse(String(callMatching(calls, "/api/inventory/opening-stock").init?.body));
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items[0].product_code).toBe("PRD-1");
  });

  it("mengirim hanya hasil hitung fisik untuk opname", async () => {
    const calls: FetchCall[] = [];
    const restore = stubFetch(calls, { adjustment_number: "OPN-000001" });

    await inventoryApi.createOpname({
      location_code: "LOC-DEFAULT",
      items: [{ product_code: "PRD-1", counted_quantity: "7" }],
    });
    restore();

    const payload = JSON.parse(String(callMatching(calls, "/api/inventory/opnames").init?.body));
    expect(payload.items[0].counted_quantity).toBe("7");
    expect(payload.items[0].system_quantity).toBeUndefined();
  });
});