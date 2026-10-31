import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, EmptyState } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage, ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { getProductCode, getProductUnit, type Product, type SaleItem, type Location, type Contact, type CashAccount } from "../../types";

type CartItem = SaleItem & {
  name: string;
  unit: string;
  maxStock: number;
};

export function CashierPage({
  products,
  onSaleCreated,
  onGoToProducts,
  onGoToHistory,
}: {
  products: Product[];
  onSaleCreated: (receiptNumber: string) => void;
  onGoToProducts: () => void;
  onGoToHistory?: () => void;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const [pendingReceipt, setPendingReceipt] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [locRes, conRes, cashRes] = await Promise.all([
          api.locations.list(),
          api.contacts.list(),
          api.cashAccounts.list(),
        ]);
        setLocations(locRes || []);
        setContacts((conRes || []).filter(c => c.contact_type === "CUSTOMER" || c.contact_type === "BOTH"));
        setCashAccounts(cashRes || []);
        
        if (locRes && locRes.length > 0) setLocationCode(locRes[0]?.code ?? locRes[0]?.public_code ?? "");
        if (cashRes && cashRes.length > 0) setCashAccountCode(cashRes[0]?.code ?? cashRes[0]?.public_code ?? "");
      } catch (err) {
        console.error("Failed to load initial data", err);
        setError("Gagal memuat lokasi/kas. Periksa koneksi lalu muat ulang.");
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
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);
  const totalItemCount = cart.reduce((sum, item) => sum + Number(item.quantity), 0);

  function addToCart(product: Product) {
    if (submitting) return;
    const code = getProductCode(product);
    const stockQty = Number(product.quantity ?? product.stock ?? 0);
    const unit = getProductUnit(product);

    if (product.is_stock_tracked !== false && stockQty <= 0) {
      setError(`Stok ${product.name} habis.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_code === code);
      if (existing) {
        if (product.is_stock_tracked !== false && Number(existing.quantity) >= stockQty) {
          setError(`Stok ${product.name} tersisa ${stockQty} ${unit}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product_code === code ? { ...item, quantity: Number(item.quantity) + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          product_code: code,
          name: product.name,
          unit,
          quantity: 1,
          unit_price: Number(product.default_selling_price || 0),
          discount: 0,
          maxStock: stockQty,
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
      prev.map((item) => {
        if (item.product_code === code) {
          if (item.maxStock > 0 && quantity > item.maxStock) {
            setError(`Stok ${item.name} tersisa ${item.maxStock} ${item.unit}.`);
            return { ...item, quantity: item.maxStock };
          }
          return { ...item, quantity };
        }
        return item;
      }),
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
    let receiptNumber: string | null = pendingReceipt;
    try {
      if (!receiptNumber) {
        const response = await api.sales.create({
          location_code: locationCode,
          customer_code: customerCode || undefined,
          discount_total: Math.max(0, discountTotal),
          tax_total: Math.max(0, taxTotal),
          items: cart.map((c) => ({
            product_code: c.product_code,
            quantity: c.quantity,
            unit_price: c.unit_price,
            discount: c.discount,
          })),
        });
        receiptNumber = response?.receipt_number ?? null;
        if (!receiptNumber) {
          setError("Penjualan dibuat tetapi nomor struk tidak kembali. Cek riwayat sebelum retry.");
          return;
        }
        setPendingReceipt(receiptNumber);
      }

      await api.sales.checkout(receiptNumber, {
        amount: grandTotal,
        cash_account_code: cashAccountCode,
      });

      onSaleCreated(receiptNumber);
      setPendingReceipt(null);
      setCart([]);
      setDiscountTotal(0);
      setTaxTotal(0);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409 && caught.code === "INSUFFICIENT_STOCK") {
        setError("Gagal checkout: Stok produk tidak mencukupi di lokasi yang dipilih.");
      } else if (receiptNumber) {
        setError(`${errorMessage(caught)} (Draft ${receiptNumber} tersimpan, silakan coba Bayar lagi.)`);
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPending() {
    if (!pendingReceipt) return;
    setSubmitting(true);
    setError("");
    try {
      await api.sales.checkout(pendingReceipt, {
        amount: grandTotal,
        cash_account_code: cashAccountCode,
      });
      onSaleCreated(pendingReceipt);
      setPendingReceipt(null);
      setCart([]);
      setDiscountTotal(0);
      setTaxTotal(0);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  // F2 and F4 shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0 && !submitting) {
          void checkout();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const activeLocation = locations.find(
    (l) => (l.code ?? l.public_code) === locationCode,
  );
  const locationLabel = activeLocation?.name || "Lokasi Utama";

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow" style={{ color: "#5b6660" }}>Transaksi</span>
          <h1>Kasir (POS)</h1>
          <p>{locationLabel} · Pilih produk untuk menambahkannya ke keranjang pesanan.</p>
        </div>
        {onGoToHistory && (
          <div className="page-head__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onGoToHistory}
            >
              Riwayat transaksi
            </button>
          </div>
        )}
      </div>

      <div className="pos-layout">
        <div>
          <div className="pos-toolbar">
            <div className="search-field">
              <Icon name="search" size={16} />
              <input
                ref={searchInputRef}
                autoFocus
                placeholder="Cari nama, SKU, atau pindai barcode... (F2)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="pos-grid">
            {filtered.map((product) => {
              const code = getProductCode(product);
              const inCart = cart.find((item) => item.product_code === code);
              const stockQty = Number(product.quantity ?? product.stock ?? 0);
              const isOutOfStock = product.is_stock_tracked !== false && stockQty <= 0;
              const isLowStock = !isOutOfStock && stockQty < 5;
              const unit = getProductUnit(product);

              return (
                <button
                  key={code}
                  type="button"
                  className={`pos-item ${inCart ? "is-in-cart" : ""}`}
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock}
                >
                  <span className="pos-item__head">
                    <span>{product.category_name || (product.sku ? `SKU: ${product.sku}` : "PRODUK")}</span>
                    {inCart && <span className="pos-item__badge">{inCart.quantity}x</span>}
                  </span>
                  <strong title={product.name}>{product.name}</strong>
                  <span className="pos-item__price">
                    {formatCurrency(product.default_selling_price)}
                  </span>
                  <span className="pos-item__stock">
                    <span className={`status-pill ${isOutOfStock ? "status-pill--danger" : isLowStock ? "status-pill--warn" : "status-pill--ok"}`}>
                      <i />
                      {isOutOfStock ? "Habis" : isLowStock ? "Menipis" : "Aman"}
                    </span>
                    {isOutOfStock ? "Stok habis" : `${stockQty} ${unit} tersedia`}
                  </span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="pos-empty-search">
                Produk tidak ditemukan.{" "}
                <button type="button" className="link-button" onClick={onGoToProducts}>
                  Tambah produk baru
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="cart">
          <div className="cart__header">
            <h2>Pesanan saat ini</h2>
            <button
              type="button"
              className="link-button link-button--danger"
              onClick={() => {
                if (cart.length === 0) return;
                if (window.confirm("Kosongkan keranjang pesanan?")) setCart([]);
              }}
            >
              Kosongkan
            </button>
          </div>

          <div className="cart__items">
            {cart.length === 0 ? (
              <div className="cart__empty">
                <EmptyState
                  title="Belum ada produk dipilih"
                  description="Pilih produk dari katalog di sebelah kiri atau tekan F2 untuk mencari."
                />
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_code} className="cart-item">
                  <strong>{item.name}</strong>
                  <span className="cart-item__total">
                    {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                  </span>
                  <span className="cart-item__qty">
                    {formatCurrency(item.unit_price)} per {item.unit}
                    <span className="stepper">
                      <button
                        type="button"
                        aria-label="Kurangi kuantitas"
                        onClick={() => updateQuantity(item.product_code, Number(item.quantity) - 1)}
                      >
                        -
                      </button>
                      <b>{item.quantity}</b>
                      <button
                        type="button"
                        aria-label="Tambah kuantitas"
                        onClick={() => updateQuantity(item.product_code, Number(item.quantity) + 1)}
                      >
                        +
                      </button>
                    </span>
                  </span>
                  <span className="cart-item__qty">
                    {item.maxStock > 0 ? `Sisa ${Math.max(0, item.maxStock - Number(item.quantity))} ${item.unit}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="cart__summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row summary-row--edit">
              <span>Diskon</span>
              <span className="money-input">
                Rp
                <input
                  type="number"
                  min="0"
                  className="num"
                  value={discountTotal || ""}
                  onChange={(e) => setDiscountTotal(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </span>
            </div>
            <div className="summary-row summary-row--edit">
              <span>Pajak</span>
              <span className="money-input">
                Rp
                <input
                  type="number"
                  min="0"
                  className="num"
                  value={taxTotal || ""}
                  onChange={(e) => setTaxTotal(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                />
              </span>
            </div>
            <div className="summary-grand" aria-live="polite">
              <span>Total Tagihan</span>
              <strong>{formatCurrency(grandTotal)}</strong>
            </div>
          </div>

          {error && (
            <div style={{ padding: "var(--space-3) var(--space-5) 0" }}>
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          {pendingReceipt && (
            <div style={{ padding: "var(--space-3) var(--space-5) 0" }}>
              <Alert tone="error">
                Draft {pendingReceipt} tersimpan.{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => void retryPending()}
                  disabled={submitting}
                >
                  Coba bayar lagi
                </button>
              </Alert>
            </div>
          )}

          <div className="cart__payment">
            <label className="field">
              <span>Lokasi <em>*</em></span>
              <select value={locationCode} onChange={(e) => setLocationCode(e.target.value)} required>
                <option value="" disabled>Pilih Lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.code ?? loc.public_code} value={loc.code ?? loc.public_code}>{loc.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Pelanggan</span>
              <select value={customerCode} onChange={(e) => setCustomerCode(e.target.value)}>
                <option value="">Pelanggan Umum (Opsional)</option>
                {contacts.map((c) => (
                  <option key={c.code ?? c.public_code} value={c.code ?? c.public_code}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Kas <em>*</em></span>
              <select value={cashAccountCode} onChange={(e) => setCashAccountCode(e.target.value)} required>
                <option value="" disabled>Pilih Akun Kas</option>
                {cashAccounts.map((ca) => (
                  <option key={ca.code ?? ca.public_code} value={ca.code ?? ca.public_code}>{ca.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="cart__foot">
            <div className="cart__foot-note">
              <span>{totalItemCount} item</span>
              <span><kbd>F4</kbd> bayar</span>
            </div>
            <button
              type="button"
              className="button button--primary button--full button--tall"
              onClick={() => void checkout()}
              disabled={submitting || cart.length === 0}
            >
              {submitting ? "Memproses..." : `Bayar Sekarang · ${formatCurrency(grandTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
