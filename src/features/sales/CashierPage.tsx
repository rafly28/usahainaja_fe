import { useEffect, useMemo, useState } from "react";
import { Alert } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage, ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { getProductCode, type Product, type SaleItem, type Location, type Contact, type CashAccount } from "../../types";

type CartItem = SaleItem & {
  name: string;
  maxStock: number;
};

export function CashierPage({
  products,
  onSaleCreated,
  onGoToProducts,
}: {
  products: Product[];
  onSaleCreated: (receiptNumber: string) => void;
  onGoToProducts: () => void;
}) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [taxTotal, setTaxTotal] = useState<number>(0);
  
  // Data for dropdowns
  const [locations, setLocations] = useState<Location[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  
  // Selected values
  const [locationCode, setLocationCode] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [cashAccountCode, setCashAccountCode] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [locRes, conRes, cashRes] = await Promise.all([
          api.locations.list(),
          api.contacts.list(),
          api.cashAccounts.list(),
        ]);
        setLocations(locRes || []);
        setContacts((conRes || []).filter(c => c.contact_type === 'CUSTOMER' || c.contact_type === 'BOTH'));
        setCashAccounts(cashRes || []);
        
        if (locRes && locRes.length > 0) setLocationCode(locRes[0]?.code ?? locRes[0]?.public_code ?? "");
        if (cashRes && cashRes.length > 0) setCashAccountCode(cashRes[0]?.code ?? cashRes[0]?.public_code ?? "");
      } catch (err) {
        // Silently ignore or log error
        console.error("Failed to load initial data", err);
      }
    }
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id");
    return products.filter(
      (product) =>
        !term ||
        `${product.name} ${product.sku ?? ""} ${getProductCode(product)}`
          .toLocaleLowerCase("id")
          .includes(term),
    );
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price) - Number(item.discount),
    0,
  );
  const grandTotal = subtotal - discountTotal + taxTotal;

  function addToCart(product: Product) {
    setCart((prev) => {
      const code = getProductCode(product);
      const existing = prev.find((item) => item.product_code === code);
      if (existing) {
        return prev.map((item) =>
          item.product_code === code ? { ...item, quantity: Number(item.quantity) + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          product_code: code,
          name: product.name,
          quantity: 1,
          unit_price: Number(product.default_selling_price || 0),
          discount: 0,
          maxStock: Number(product.quantity || 0),
        },
      ];
    });
    setSearch("");
  }

  function updateQuantity(code: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.product_code !== code));
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product_code === code ? { ...item, quantity } : item)),
    );
  }

  async function checkout() {
    if (cart.length === 0) return;
    if (!locationCode) {
      setError("Pilih lokasi terlebih dahulu.");
      return;
    }
    if (!cashAccountCode) {
      setError("Pilih akun kas untuk pembayaran.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await api.sales.create({
        location_code: locationCode,
        customer_code: customerCode || undefined,
        payment_status: "PAID",
        discount_total: discountTotal,
        tax_total: taxTotal,
        items: cart.map((c) => ({
          product_code: c.product_code,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount: c.discount,
        })),
      });

      if (response && response.receipt_number) {
        await api.sales.checkout(response.receipt_number, {
          amount: grandTotal,
          cash_account_code: cashAccountCode,
        });

        onSaleCreated(response.receipt_number);
        setCart([]);
        setDiscountTotal(0);
        setTaxTotal(0);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409 && caught.code === "INSUFFICIENT_STOCK") {
        setError("Gagal checkout: Stok produk tidak mencukupi di lokasi yang dipilih.");
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pos-layout">
      <div className="pos-products">
        <div className="page-heading">
          <div>
            <p className="eyebrow">TRANSAKSI</p>
            <h1>Kasir (POS)</h1>
          </div>
        </div>

        <div className="pos-search">
          <Icon name="search" size={20} />
          <input
            autoFocus
            placeholder="Cari nama, SKU, atau pindai barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="pos-grid">
          {filtered.map((product) => {
            const code = getProductCode(product);
            const inCart = cart.find((item) => item.product_code === code);
            const stockQty = Number(product.quantity ?? 0);
            const isOutOfStock = stockQty <= 0;

            return (
              <button
                key={code}
                className={`pos-item-card ${inCart ? "is-in-cart" : ""} ${isOutOfStock ? "is-out-of-stock" : ""}`}
                onClick={() => addToCart(product)}
                type="button"
              >
                <div className="pos-item-card__header">
                  <div className="pos-item-card__abbr">
                    {product.name.slice(0, 1).toUpperCase()}
                  </div>
                  {inCart && (
                    <span className="pos-item-card__cart-badge">
                      {inCart.quantity}x
                    </span>
                  )}
                </div>
                <div className="pos-item-card__info">
                  <strong title={product.name}>{product.name}</strong>
                  {product.category_name && (
                    <span className="pos-item-card__category">{product.category_name}</span>
                  )}
                  <div className="pos-item-card__price-row">
                    <p className="pos-item-card__price">
                      {formatCurrency(product.default_selling_price)}
                    </p>
                    <span className={`stock-pill ${isOutOfStock ? "stock-pill--empty" : stockQty < 5 ? "stock-pill--low" : "stock-pill--ok"}`}>
                      {isOutOfStock ? "Habis" : `Stok ${stockQty}`}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="pos-empty-search">
              Produk tidak ditemukan.
              <button type="button" className="link-button" onClick={onGoToProducts}>
                Tambah produk baru
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="pos-cart">
        <div className="pos-cart__header">
          <h2>Pesanan saat ini</h2>
          <button className="link-button" onClick={() => setCart([])}>Kosongkan</button>
        </div>

        <div className="pos-cart__items">
          {cart.length === 0 ? (
            <div className="pos-cart__empty">
              <Icon name="shopping-cart" size={48} />
              <p>Belum ada produk dipilih</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_code} className="cart-item">
                <div className="cart-item__details">
                  <strong>{item.name}</strong>
                  <p>{formatCurrency(item.unit_price)}</p>
                </div>
                <div className="cart-item__actions">
                  <button onClick={() => updateQuantity(item.product_code, Number(item.quantity) - 1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product_code, Number(item.quantity) + 1)}>
                    +
                  </button>
                </div>
                <div className="cart-item__total">
                  {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pos-cart__summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="summary-row text-success">
            <span>Diskon Total</span>
            <input
              type="number"
              className="summary-input"
              value={discountTotal || ""}
              onChange={(e) => setDiscountTotal(Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="summary-row">
            <span>Pajak (Tax)</span>
            <input
              type="number"
              className="summary-input"
              value={taxTotal || ""}
              onChange={(e) => setTaxTotal(Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="summary-row summary-grand">
            <span>Total Tagihan</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>

          {error && <div className="mt-2"><Alert tone="error">{error}</Alert></div>}

          <div className="pos-cart__payment" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <select
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              className="payment-select"
            >
              <option value="" disabled>Pilih Lokasi</option>
              {locations.map((loc) => {
                const code = loc.code ?? loc.public_code ?? "";
                return <option key={code} value={code}>{loc.name}</option>;
              })}
            </select>
            <select
              value={customerCode}
              onChange={(e) => setCustomerCode(e.target.value)}
              className="payment-select"
            >
              <option value="">Pelanggan Umum (Opsional)</option>
              {contacts.map((c) => {
                const code = c.code ?? c.public_code ?? "";
                return <option key={code} value={code}>{c.name}</option>;
              })}
            </select>
            <select
              value={cashAccountCode}
              onChange={(e) => setCashAccountCode(e.target.value)}
              className="payment-select"
            >
              <option value="" disabled>Pilih Akun Kas</option>
              {cashAccounts.map((ca) => {
                const code = ca.code ?? ca.public_code ?? "";
                return <option key={code} value={code}>{ca.name}</option>;
              })}
            </select>
            <button
              className="button button--primary button--large button--block"
              onClick={() => void checkout()}
              disabled={submitting || cart.length === 0}
            >
              {submitting ? "Memproses..." : "Bayar Sekarang"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
