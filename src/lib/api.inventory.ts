import type {
  InventoryItem,
  MovementFilters,
  NewStockAdjustment,
  NewStockOpname,
  OpeningStockInput,
  Pagination,
  StockAdjustment,
  StockMovement,
} from "../types";
import { extractCollection, queryPath, request } from "./http";

type Paged<T> = {
  items?: T[];
  movements?: T[];
  pagination?: Pagination;
};

/** Membaca daftar + metadata pagination dari satu bentuk payload yang seragam. */
function readPaged<T>(payload: Paged<T>, keys: string[] = []): { items: T[]; pagination: Pagination } {
  const items = extractCollection<T>(payload, keys);
  const pagination = payload.pagination ?? { page: 1, limit: items.length, total: items.length };
  return { items, pagination };
}

export const inventoryApi = {
  list: async (params: { search?: string; lowStock?: boolean; location?: string; page?: number; limit?: number } = {}) => {
    const data = await request<Paged<InventoryItem>>(
      queryPath("/api/inventory/products", {
        search: params.search,
        low_stock: params.lowStock ? true : undefined,
        location: params.location,
        page: params.page,
        limit: params.limit,
      }),
    );
    return extractCollection<InventoryItem>(data, ["items"]);
  },

  listPaged: async (params: { search?: string; lowStock?: boolean; location?: string; page?: number; limit?: number } = {}) => {
    const data = await request<Paged<InventoryItem>>(
      queryPath("/api/inventory/products", {
        search: params.search,
        low_stock: params.lowStock ? true : undefined,
        location: params.location,
        page: params.page,
        limit: params.limit,
      }),
    );
    return readPaged<InventoryItem>(data);
  },

  openingStock: (input: OpeningStockInput) =>
    request<unknown>("/api/inventory/opening-stock", {
      method: "POST",
      body: input,
      mutation: true,
    }),

  movements: async (filters: MovementFilters = {}) => {
    const data = await request<Paged<StockMovement>>(
      queryPath("/api/inventory/movements", {
        product_public_code: filters.product_public_code,
        location: filters.location,
        movement_type: filters.movement_type,
        date_from: filters.date_from,
        date_to: filters.date_to,
        page: filters.page,
        limit: filters.limit,
      }),
    );
    return readPaged<StockMovement>(data, ["movements"]);
  },

  createAdjustment: (input: NewStockAdjustment) =>
    request<StockAdjustment>("/api/inventory/adjustments", {
      method: "POST",
      body: input,
      mutation: true,
    }),

  adjustments: async (params: { status?: string; adjustment_kind?: string; page?: number; limit?: number } = {}) => {
    const data = await request<Paged<StockAdjustment>>(
      queryPath("/api/inventory/adjustments", {
        status: params.status,
        adjustment_kind: params.adjustment_kind,
        page: params.page,
        limit: params.limit,
      }),
    );
    return readPaged<StockAdjustment>(data);
  },

  adjustment: (adjustmentNumber: string) =>
    request<StockAdjustment>(`/api/inventory/adjustments/${adjustmentNumber}`),

  completeAdjustment: (number: string) =>
    request<unknown>(`/api/inventory/adjustments/${number}/complete`, {
      method: "POST",
      body: {},
      mutation: true,
    }),

  createOpname: (input: NewStockOpname) =>
    request<StockAdjustment>("/api/inventory/opnames", {
      method: "POST",
      body: input,
      mutation: true,
    }),

  opnames: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const data = await request<Paged<StockAdjustment>>(
      queryPath("/api/inventory/opnames", {
        status: params.status,
        page: params.page,
        limit: params.limit,
      }),
    );
    return readPaged<StockAdjustment>(data);
  },

  opname: (opnameNumber: string) => request<StockAdjustment>(`/api/inventory/opnames/${opnameNumber}`),

  completeOpname: (number: string) =>
    request<unknown>(`/api/inventory/opnames/${number}/complete`, {
      method: "POST",
      body: {},
      mutation: true,
    }),
};

export type InventoryApi = typeof inventoryApi;