import { useEffect, useMemo, useState } from "react";
import { Alert } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { getProductCode, type Product, type PurchaseItem, type Location, type Contact, type CashAccount } from "../../types";

type RestockItem = PurchaseItem & {
  name: string;
};

export function RestockPage({
  products,
  onPurchaseCreated,
  onGoToProducts,
}: {
  products: Product[];
  onPurchaseCreated: (purchaseNumber: string) => void;
  onGoToProducts: () => void;
}) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<RestockItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [taxTotal, setTaxTotal] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState("");
  
  // Dropdown data
  const [locations, setLocations] = useState<Location[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  
  // Selected values
  const [locationCode, setLocationCode] = useState("");
  const [supplierCode, setSupplierCode] = useState("");
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
        setContacts((conRes || []).filter(c => c.contact_type === 'SUPPLIER' || c.contact_type === 'BOTH'));
        setCashAccounts(cashRes || []);
        
        if (locRes && locRes.length > 0) setLocationCode(locRes[0]?.code ?? locRes[0]?.public_code ?? "");
        if (cashRes && cashRes.length > 0) setCashAccountCode(cashRes[0]?.code ?? cashRes[0]?.public_code ?? "");
      } catch (err) {
        console.error("Failed to load data", err);
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
          unit_price: Number(product.default_purchase_price || 0),
          discount: 0,
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

  function updatePrice(code: string, price: number) {
    setCart((prev) =>
      prev.map((item) => (item.product_code === code ? { ...item, unit_price: price } : item)),
    );
  }

  async function submitAction(action: "draft" | "receive" | "pay") {
    if (cart.length === 0) return;
    if (!locationCode) {
      setError("Pilih lokasi terlebih dahulu.");
      return;
    }
    if (action === "pay" && !cashAccountCode) {
      setError("Pilih akun kas untuk pembayaran.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await api.purchases.create({
        location_code: locationCode,
        supplier_code: supplierCode || undefined,
        payment_status: "UNPAID", // Actually ignored by backend createPurchase but required by type
        reference_number: referenceNumber,
        discount_total: discountTotal,
        tax_total: taxTotal,
        items: cart.map((c) => ({
          product_code: c.product_code,
          quantity: c.quantity,
          unit_price: c.unit_price,
          discount: c.discount,
        })),
      });

      if (response && response.purchase_number) {
        if (action === "receive" || action === "pay") {
          await api.purchases.receive(response.purchase_number);
        }
        if (action === "pay") {
          await api.purchases.pay(response.purchase_number, {
            amount: grandTotal,
            cash_account_code: cashAccountCode,
          });
        }

        onPurchaseCreated(response.purchase_number);
        setCart([]);
        setDiscountTotal(0);
        setTaxTotal(0);
        setReferenceNumber("");
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pos-layout pos-layout--restock">
      <div className="pos-products">
        <div className="page-heading">
          <div>
            <p className="eyebrow">INVENTORI</p>
            <h1>Pembelian (Restock)</h1>
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
            const stockQty = Number(product.quantity ?? product.stock ?? 0);

            return (
              <button
                key={code}
                className={`pos-item-card ${inCart ? "is-in-cart" : ""}`}
                onClick={() => addToCart(product)}
                type="button"
              >
                <div className="pos-item-card__header">
                  <div className="pos-item-card__abbr">
                    {product.name.slice(0, 1).toUpperCase()}
                  </div>
                  {inCart && (
                    <span className="pos-item-card__cart-badge">
                      {inCart.quantity} item
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
                      {formatCurrency(product.default_purchase_price)}
                    </p>
                    <span className="stock-pill stock-pill--muted">
                      Stok saat ini: {stockQty}
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
          <h2>Daftar Restock</h2>
          <button className="link-button" onClick={() => setCart([])}>Kosongkan</button>
        </div>
        
        <div className="pos-cart__meta p-4 border-b border-gray-100">
           <input
            className="input-field w-full"
            placeholder="No. Referensi / Surat Jalan (opsional)"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </div>

        <div className="pos-cart__items">
          {cart.length === 0 ? (
            <div className="pos-cart__empty">
              <Icon name="box" size={48} />
              <p>Belum ada produk yang akan direstock</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_code} className="cart-item cart-item--editable">
                <div className="cart-item__details">
                  <strong>{item.name}</strong>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-sm text-gray-500">Harga:</span>
                    <input 
                      type="number"
                      className="summary-input"
                      value={item.unit_price || ""}
                      onChange={(e) => updatePrice(item.product_code, Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="cart-item__actions">
                  <button onClick={() => updateQuantity(item.product_code, Number(item.quantity) - 1)}>
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity || ""}
                    onChange={(e) => updateQuantity(item.product_code, Number(e.target.value))}
                    style={{ width: "40px", textAlign: "center" }}
                  />
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
            <span>Total Pembayaran</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>

          {error && <div className="mt-2"><Alert tone="error">{error}</Alert></div>}

          <div className="pos-cart__payment" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <select
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              className="payment-select"
            >
              <option value="" disabled>Pilih Lokasi Penerimaan</option>
              {locations.map((loc) => {
                const code = loc.code ?? loc.public_code ?? "";
                return <option key={code} value={code}>{loc.name}</option>;
              })}
            </select>
            <select
              value={supplierCode}
              onChange={(e) => setSupplierCode(e.target.value)}
              className="payment-select"
            >
              <option value="">Pemasok Umum (Opsional)</option>
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
              <option value="" disabled>Pilih Akun Kas (Jika Langsung Bayar)</option>
              {cashAccounts.map((ca) => {
                const code = ca.code ?? ca.public_code ?? "";
                return <option key={code} value={code}>{ca.name}</option>;
              })}
            </select>
            
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                className="button button--secondary button--block"
                onClick={() => void submitAction("draft")}
                disabled={submitting || cart.length === 0}
              >
                Simpan Draft
              </button>
              <button
                className="button button--secondary button--block"
                onClick={() => void submitAction("receive")}
                disabled={submitting || cart.length === 0}
              >
                Terima Barang
              </button>
            </div>
            <button
              className="button button--primary button--large button--block mt-2"
              onClick={() => void submitAction("pay")}
              disabled={submitting || cart.length === 0}
            >
              {submitting ? "Memproses..." : "Terima & Bayar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
