import type {
  Business,
  BusinessMember,
  CashAccount,
  Category,
  Contact,
  CreateProductInput,
  Location,
  NewPurchase,
  NewSale,
  Party,
  PartyContact,
  PaymentInput,
  Product,
  ReceivePurchaseInput,
  Session,
  Unit,
  UnitConversion,
  User,
} from "../types";
import { inventoryApi } from "./api.inventory";
import { extractCollection, queryPath, request, setCsrfToken } from "./http";

// Error dan helper transport tetap diekspor dari api.ts agar konsumen lama tidak berubah.
export { ApiError, extractCollection, errorMessage, isUnauthorized } from "./http";

type SaleSummary = {
  receipt_number: string;
  sale_date: string;
  status: string;
  payment_status?: string;
  grand_total: string;
};

type PurchaseSummary = {
  purchase_number: string;
  purchase_date: string;
  status: string;
  payment_status?: string;
  grand_total: string;
};

/**
 * Permukaan API dipisah per domain agar setiap file tetap mudah dibaca.
 * Endpoint inventaris, adjustment, dan opname ada di api.inventory.ts.
 */
export const api = {
  inventory: inventoryApi,

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
      if (data?.csrf_token) setCsrfToken(data.csrf_token);
      return data;
    },
    login: async (input: { email: string; password: string }) => {
      const data = await request<{
        user: User;
        active_business?: Business | null;
        business_required?: boolean;
        csrf_token?: string;
      }>("/api/auth/login", { method: "POST", body: input });
      if (data?.csrf_token) setCsrfToken(data.csrf_token);
      return data;
    },
    logout: async () => {
      await request<{ message?: string }>("/api/auth/logout", {
        method: "POST",
        mutation: true,
      });
      setCsrfToken(null);
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
  members: {
    list: async () => {
      const data = await request<unknown>("/api/businesses/current/members");
      return extractCollection<BusinessMember>(data, ["items", "members"]);
    },
    invite: (input: { email: string; role: string }) =>
      request<BusinessMember>("/api/businesses/current/members", { method: "POST", body: input, mutation: true }),
    update: (userCode: string, input: { role: string; status: string }) =>
      request<BusinessMember>(`/api/businesses/current/members/${userCode}`, { method: "PATCH", body: input, mutation: true }),
  },
  masterData: {
    categories: async () => {
      const data = await request<unknown>("/api/categories");
      return extractCollection<Category>(data, ["items", "categories"]);
    },
    createCategory: (input: { name: string; category_type: string; parent_code?: string }) =>
      request<Category>("/api/categories", { method: "POST", body: input, mutation: true }),
    updateCategory: (code: string, input: { name: string; category_type: string; parent_code?: string; status: string }) =>
      request<Category>(`/api/categories/${code}`, { method: "PATCH", body: input, mutation: true }),
    units: async () => {
      const data = await request<unknown>("/api/units");
      return extractCollection<Unit>(data, ["items", "units"]);
    },
    createUnit: (input: { name: string; symbol: string; unit_type: string }) =>
      request<Unit>("/api/units", { method: "POST", body: input, mutation: true }),
    updateUnit: (code: string, input: { name: string; symbol: string; unit_type: string; status: string }) =>
      request<Unit>(`/api/units/${code}`, { method: "PATCH", body: input, mutation: true }),
    unitConversions: async () => {
      const data = await request<unknown>("/api/unit-conversions");
      return extractCollection<UnitConversion>(data, ["items", "conversions", "unit_conversions"]);
    },
    createUnitConversion: (input: { product_code?: string; from_unit_code: string; to_unit_code: string; multiplier: string }) =>
      request<UnitConversion>("/api/unit-conversions", { method: "POST", body: input, mutation: true }),
    locations: async () => {
      const data = await request<unknown>("/api/locations");
      return extractCollection<Location>(data, ["items", "locations"]);
    },
    createLocation: (input: { name: string; type: string; address?: string; is_default: boolean }) =>
      request<Location>("/api/locations", { method: "POST", body: input, mutation: true }),
    updateLocation: (code: string, input: { name: string; type: string; address?: string; is_default: boolean; status: string }) =>
      request<Location>(`/api/locations/${code}`, { method: "PATCH", body: input, mutation: true }),
    parties: async () => {
      const data = await request<unknown>("/api/parties");
      return extractCollection<Party>(data, ["items", "parties"]);
    },
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
      return extractCollection<Product>(data, ["items", "products"]);
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
  locations: {
    list: async () => {
      const data = await request<unknown>("/api/locations");
      return extractCollection<Location>(data, ["items", "locations"]);
    },
  },
  contacts: {
    list: async () => {
      const data = await request<unknown>("/api/contacts");
      return extractCollection<Contact>(data, ["items", "contacts"]);
    },
  },
  cashAccounts: {
    list: async () => {
      const data = await request<unknown>("/api/cash-accounts");
      return extractCollection<CashAccount>(data, ["items", "cash_accounts"]);
    },
  },
  sales: {
    list: async (params: { page?: number; limit?: number } = {}) => {
      const data = await request<unknown>(queryPath("/api/sales", { page: params.page, limit: params.limit }));
      return extractCollection<SaleSummary>(data, ["items"]);
    },
    create: (input: NewSale) =>
      request<{ receipt_number: string }>("/api/sales", {
        method: "POST",
        body: input,
        mutation: true,
      }),
    get: (receiptNumber: string) =>
      request<{ receipt_number: string; status: string; grand_total: string; paid_total?: string }>(`/api/sales/${receiptNumber}`),
    checkout: (receiptNumber: string, input: PaymentInput) =>
      request<{ receipt_number: string }>(`/api/sales/${receiptNumber}/checkout`, {
        method: "POST",
        body: input,
        mutation: true,
      }),
    receipt: (receiptNumber: string) =>
      request<unknown>(`/api/sales/${receiptNumber}/receipt`),
    void: (receiptNumber: string, reason: string) =>
      request<void>(`/api/sales/${receiptNumber}/void`, {
        method: "POST",
        body: { reason },
        mutation: true,
      }),
    cancel: (receiptNumber: string) =>
      request<void>(`/api/sales/${receiptNumber}/cancel`, {
        method: "POST",
        body: {},
        mutation: true,
      }),
  },
  purchases: {
    list: async (params: { page?: number; limit?: number } = {}) => {
      const data = await request<unknown>(queryPath("/api/purchases", { page: params.page, limit: params.limit }));
      return extractCollection<PurchaseSummary>(data, ["items"]);
    },
    create: (input: NewPurchase) =>
      request<{ purchase_number: string; items?: { line_number: number; product_code: string; quantity: string }[] }>("/api/purchases", {
        method: "POST",
        body: input,
        mutation: true,
      }),
    get: (purchaseNumber: string) =>
      request<{ purchase_number: string; status: string; grand_total: string; paid_total?: string; outstanding_total?: string }>(`/api/purchases/${purchaseNumber}`),
    order: (purchaseNumber: string) =>
      request<void>(`/api/purchases/${purchaseNumber}/order`, {
        method: "POST",
        body: {},
        mutation: true,
      }),
    receive: (purchaseNumber: string, input?: ReceivePurchaseInput) =>
      request<{ receipt_number: string }>(`/api/purchases/${purchaseNumber}/receive`, {
        method: "POST",
        body: input ?? {},
        mutation: true,
      }),
    pay: (purchaseNumber: string, input: PaymentInput) =>
      request<void>(`/api/purchases/${purchaseNumber}/payments`, {
        method: "POST",
        body: input,
        mutation: true,
      }),
    cancel: (purchaseNumber: string) =>
      request<void>(`/api/purchases/${purchaseNumber}/cancel`, {
        method: "POST",
        body: {},
        mutation: true,
      }),
    receipt: (purchaseNumber: string) =>
      request<unknown>(`/api/purchases/${purchaseNumber}/receipt`),
    void: (purchaseNumber: string, reason: string) =>
      request<void>(`/api/purchases/${purchaseNumber}/void`, {
        method: "POST",
        body: { reason },
        mutation: true,
      }),
  },
};
