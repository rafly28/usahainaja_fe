import { useMemo, useState } from "react";
import { Alert } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { getProductCode, type Product, type SaleItem } from "../../types";

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
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    setSubmitting(true);
    setError("");
    try {
      const response = await api.sales.create({
        location_code: "LOC-DEFAULT", // Typically user selects this, hardcoded for now
        payment_status: paymentStatus,
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
        onSaleCreated(response.receipt_number);
        setCart([]);
        setDiscountTotal(0);
        setTaxTotal(0);
      }
    } catch (caught) {
      setError(errorMessage(caught));
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
          {filtered.map((product) => (
            <button
              key={getProductCode(product)}
              className="pos-item-card"
              onClick={() => addToCart(product)}
            >
              <div className="pos-item-card__abbr">
                {product.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="pos-item-card__info">
                <strong>{product.name}</strong>
                <p>{formatCurrency(product.default_selling_price)}</p>
                <small className={Number(product.quantity) <= 0 ? "text-danger" : "text-muted"}>
                  Stok: {Number(product.quantity)}
                </small>
              </div>
            </button>
          ))}
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

          <div className="pos-cart__payment">
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as "PAID" | "UNPAID")}
              className="payment-select"
            >
              <option value="PAID">Lunas (Tunai/Transfer)</option>
              <option value="UNPAID">Belum Dibayar (Kasbon)</option>
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
