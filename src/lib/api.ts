import type {
  Business,
  CreateProductInput,
  FieldErrors,
  InventoryItem,
  NewPurchase,
  NewSale,
  OpeningStockInput,
  Product,
  Session,
  StockAdjustment,
  StockMovement,
  NewStockAdjustment,
  User,
  Category,
  Location,
  Party,
  PartyContact,
  Unit,
} from "../types";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    fields?: FieldErrors;
  };
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  mutation?: boolean;
  retryCsrf?: boolean;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: FieldErrors;

  constructor(message: string, status: number, code = "REQUEST_FAILED", fields?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let csrfToken: string | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function extractCollection<T>(value: unknown, preferredKeys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];

  const record = asRecord(value);
  if (!record) return [];

  for (const key of [...preferredKeys, "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }

  const nested = record.data;
  if (nested !== value) return extractCollection<T>(nested, preferredKeys);
  return [];
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (response.ok && response.status === 204) return {};
    throw new ApiError("Server mengirim respons yang tidak dikenali.", response.status);
  }

  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Respons server tidak dapat dibaca.", response.status);
  }
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const response = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const envelope = await readEnvelope<{ csrf_token?: string }>(response);
  const token = envelope.data?.csrf_token;

  if (!response.ok || !token) {
    throw new ApiError(
      envelope.error?.message ?? "Tidak dapat menyiapkan keamanan formulir.",
      response.status,
      envelope.error?.code ?? "CSRF_UNAVAILABLE",
      envelope.error?.fields,
    );
  }

  csrfToken = token;
  return token;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, mutation = false, retryCsrf = true, headers: inputHeaders, ...init } = options;
  const headers = new Headers(inputHeaders);
  headers.set("Accept", "application/json");

  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (mutation) headers.set("X-CSRF-Token", await ensureCsrfToken());

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const envelope = await readEnvelope<T>(response);

  if (!response.ok || envelope.success === false || envelope.error) {
    let msg = envelope.error?.message;
    if (!msg) {
      if (response.status === 401) msg = "Sesi telah berakhir atau tidak valid.";
      else if (response.status === 403) msg = "Akses ditolak.";
      else if (response.status === 404) msg = "Data tidak ditemukan.";
      else if (response.status === 409) msg = "Terdapat konflik data.";
      else if (response.status === 422) msg = "Data yang diisi belum benar.";
      else msg = "Permintaan belum berhasil. Silakan coba lagi.";
    }

    const error = new ApiError(
      msg,
      response.status,
      envelope.error?.code,
      envelope.error?.fields,
    );

    const csrfRejected = response.status === 403 && error.code.toUpperCase().includes("CSRF");
    if (mutation && retryCsrf && csrfRejected) {
      csrfToken = null;
      return request<T>(path, { ...options, retryCsrf: false });
    }
    throw error;
  }

  const data = envelope.data as T;
  const record = asRecord(data);
  if (typeof record?.csrf_token === "string") csrfToken = record.csrf_token;
  return data;
}

function queryPath(path: string, params: Record<string, string | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export const api = {
  auth: {
    me: () => request<Session>("/api/auth/me"),
    register: async (input: { name: string; email: string; password: string }) => {
      const data = await request<{
        user: User;
        active_business?: Business | null;
        csrf_token?: string;
      }>(
        "/api/auth/register",
        { method: "POST", body: input },
      );
      csrfToken = null;
      return data;
    },
    login: async (input: { email: string; password: string }) => {
      const data = await request<{
        user: User;
        active_business?: Business | null;
        business_required?: boolean;
        csrf_token?: string;
      }>("/api/auth/login", { method: "POST", body: input });
      csrfToken = null;
      return data;
    },
    logout: async () => {
      await request<{ message?: string }>("/api/auth/logout", {
        method: "POST",
        mutation: true,
      });
      csrfToken = null;
    },
    switchBusiness: (businessCode: string) =>
      request<{ active_business: Business }>("/api/auth/switch-business", {
        method: "POST",
        body: { business_code: businessCode },
        mutation: true,
      }),
  },
  businesses: {
    list: async () => {
      const data = await request<unknown>("/api/businesses");
      return extractCollection<Business>(data, ["businesses"]);
    },
    create: (input: {
      name: string;
      business_type: string;
      timezone?: string;
      currency?: string;
    }) =>
      request<Business>("/api/businesses", {
        method: "POST",
        body: input,
        mutation: true,
      }),
    updateConfiguration: (input: { business_type: string; enabled_modules: string[] }) =>
      request<Business>("/api/businesses/current/configuration", {
        method: "PUT",
        body: input,
        mutation: true,
      }),
  },
  masterData: {
    categories: () => request<{ items: Category[] }>("/api/categories").then((data) => data.items ?? []),
    createCategory: (input: { name: string; category_type: string; parent_code?: string }) =>
      request<Category>("/api/categories", { method: "POST", body: input, mutation: true }),
    units: () => request<{ items: Unit[] }>("/api/units").then((data) => data.items ?? []),
    createUnit: (input: { name: string; symbol: string; unit_type: string }) =>
      request<Unit>("/api/units", { method: "POST", body: input, mutation: true }),
    locations: () => request<{ items: Location[] }>("/api/locations").then((data) => data.items ?? []),
    createLocation: (input: { name: string; type: string; address?: string; is_default: boolean }) =>
      request<Location>("/api/locations", { method: "POST", body: input, mutation: true }),
    parties: () => request<{ items: Party[] }>("/api/parties").then((data) => data.items ?? []),
    createParty: (input: {
      party_type: string;
      display_name: string;
      relationships: string[];
      contacts: PartyContact[];
    }) => request<Party>("/api/parties", { method: "POST", body: input, mutation: true }),
  },
  products: {
    list: async (search?: string) => {
      const data = await request<unknown>(queryPath("/api/products", { search }));
      return extractCollection<Product>(data, ["products"]);
    },
    create: (input: CreateProductInput) =>
      request<Product>("/api/products", {
        method: "POST",
        body: input,
        mutation: true,
      }),
    update: (code: string, input: CreateProductInput) =>
      request<Product>(`/api/products/${code}`, {
        method: "PATCH",
        body: input,
        mutation: true,
      }),
    delete: (code: string) =>
      request<unknown>(`/api/products/${code}`, {
        method: "DELETE",
        mutation: true,
      }),
  },
  inventory: {
    list: async (params: { search?: string; lowStock?: boolean } = {}) => {
      const data = await request<unknown>(
        queryPath("/api/inventory/products", {
          search: params.search,
          low_stock: params.lowStock ? true : undefined,
        }),
      );
      return extractCollection<InventoryItem>(data, ["items"]);
    },
    openingStock: (input: OpeningStockInput) =>
      request<unknown>("/api/inventory/opening-stock", {
        method: "POST",
        body: input,
        mutation: true,
      }),
    movements: async () => {
      const data = await request<unknown>("/api/inventory/movements");
      return extractCollection<StockMovement>(data, ["movements", "data"]);
    },
    createAdjustment: (input: NewStockAdjustment) =>
      request<StockAdjustment>("/api/inventory/adjustments", {
        method: "POST",
        body: input,
        mutation: true,
      }),
    completeAdjustment: (number: string) =>
      request<unknown>(`/api/inventory/adjustments/${number}/complete`, {
        method: "POST",
        mutation: true,
      }),
  },
  sales: {
    create: (input: NewSale) =>
      request<{ receipt_number: string }>("/api/sales", {
        method: "POST",
        body: input,
        mutation: true,
      }),
  },
  purchases: {
    create: (input: NewPurchase) =>
      request<{ purchase_number: string }>("/api/purchases", {
        method: "POST",
        body: input,
        mutation: true,
      }),
  },
};

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kendala yang tidak terduga.";
}
