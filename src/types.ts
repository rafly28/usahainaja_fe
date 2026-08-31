export type User = {
  id?: string;
  name: string;
  email: string;
};



export interface StockMovement {
  movement_type: string;
  direction: string;
  quantity: string;
  unit_symbol: string;
  product_code: string;
  product_name: string;
  location_code: string;
  location_name: string;
  reason?: string;
  occurred_at: string;
  created_by_name?: string;
}

export interface NewStockAdjustmentItem {
  product_code: string;
  quantity: string;
  unit_symbol: string;
  direction: string;
}

export interface NewStockAdjustment {
  location_code: string;
  reason: string;
  notes?: string;
  items: NewStockAdjustmentItem[];
}

export interface StockAdjustmentItem {
  product_code: string;
  product_name: string;
  quantity: string;
  unit_symbol: string;
  direction: string;
}

export interface StockAdjustment {
  adjustment_number: string;
  location_code: string;
  reason: string;
  status: string;
  notes?: string;
  adjustment_date: string;
  items: StockAdjustmentItem[];
}

export type Business = {
  code?: string;
  business_code?: string;
  public_code?: string;
  name: string;
  business_type?: string;
  timezone?: string;
  currency?: string;
  role?: string;
  enabled_modules?: string[];
  default_location?: {
    code: string;
    name: string;
  } | null;
};

export type Category = { code: string; name: string; category_type: string; parent_code?: string | null; status: string };
export type Unit = { code: string; name: string; symbol: string; unit_type: string; status: string };
export type Location = { code: string; name: string; type: string; address?: string; is_default: boolean; status: string };
export type PartyContact = { type: string; label?: string; value: string; is_primary: boolean };
export type Party = { code: string; party_type: string; display_name: string; legal_name?: string; status: string; relationships: string[]; contacts: PartyContact[] };

export type Session = {
  user: User;
  active_business: Business | null;
};

export type Product = {
  code?: string;
  public_code?: string;
  product_code?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  default_purchase_price?: number | string | null;
  default_selling_price?: number | string | null;
  min_stock?: number | string | null;
  is_stock_tracked?: boolean;
  base_unit?: string;
  base_unit_symbol?: string;
  unit_symbol?: string;
  stock?: number | string;
  quantity?: number | string;
};

export type InventoryItem = {
  product_code?: string;
  public_code?: string;
  code?: string;
  name: string;
  sku?: string | null;
  unit_symbol?: string;
  base_unit?: string;
  base_unit_symbol?: string;
  quantity?: number | string;
  stock?: number | string;
  min_stock?: number | string | null;
  location_code?: string;
  location_name?: string;
};

export type FieldErrors = Record<string, string | string[]>;

export type CreateProductInput = {
  name: string;
  sku?: string;
  barcode?: string;
  base_unit_symbol?: string;
  default_purchase_price?: number;
  default_selling_price?: number;
  min_stock?: number;
  is_stock_tracked: boolean;
};

export type OpeningStockInput = {
  product_code: string;
  quantity: number;
  location_code?: string;
  reason?: string;
};

export type SaleItem = {
  product_code: string;
  quantity: string | number;
  unit_price: string | number;
  discount: string | number;
  notes?: string;
};

export type NewSale = {
  location_code: string;
  customer_code?: string;
  payment_status: "UNPAID" | "PARTIAL" | "PAID";
  discount_total: string | number;
  tax_total: string | number;
  notes?: string;
  items: SaleItem[];
};

export type PurchaseItem = {
  product_code: string;
  quantity: string | number;
  unit_price: string | number;
  discount: string | number;
  notes?: string;
};

export type NewPurchase = {
  location_code: string;
  supplier_code?: string;
  reference_number?: string;
  payment_status: "UNPAID" | "PARTIAL" | "PAID";
  discount_total: string | number;
  tax_total: string | number;
  notes?: string;
  items: PurchaseItem[];
};

export function getBusinessCode(business: Business | null | undefined): string {
  return business?.business_code ?? business?.code ?? business?.public_code ?? "";
}

export function getProductCode(product: Product | InventoryItem): string {
  return product.product_code ?? product.public_code ?? product.code ?? "";
}

export function getProductUnit(product: Product | InventoryItem): string {
  return product.unit_symbol ?? product.base_unit_symbol ?? product.base_unit ?? "PCS";
}
