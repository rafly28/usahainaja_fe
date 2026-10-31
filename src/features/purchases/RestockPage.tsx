import { useEffect, useMemo, useState } from "react";
import { Alert, EmptyState, SkeletonRows } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage, ApiError } from "../../lib/api";
import { formatCurrency } from "../../lib/format";
import { getProductCode, getProductUnit, type Product, type PurchaseItem, type Location, type Contact, type CashAccount } from "../../types";

type RestockItem = PurchaseItem & {
  name: string;
  unit?: string;
};

interface PurchaseDoc {
  purchase_number: string;
  purchase_date: string;
  supplier_name?: string;
  status: string;
  payment_status?: string;
  grand_total: string;
  item_count?: number;
}

export function RestockPage({
  products,
  onPurchaseCreated,
  onGoToProducts,
}: {
  products: Product[];
  onPurchaseCreated: (purchaseNumber: string) => void;
  onGoToProducts: () => void;
}) {
  const [purchases, setPurchases] = useState<PurchaseDoc[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchaseSearch, setPurchaseSearch] = useState("");

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
  const [pendingPurchase, setPendingPurchase] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingPurchases(true);
        const [locRes, conRes, cashRes, purchaseRes] = await Promise.all([
          api.locations.list(),
          api.contacts.list(),
          api.cashAccounts.list(),
          api.purchases.list().catch(() => []),
        ]);
        setLocations(locRes || []);
        setContacts((conRes || []).filter(c => c.contact_type === "SUPPLIER" || c.contact_type === "BOTH"));
        setCashAccounts(cashRes || []);
        setPurchases((purchaseRes as PurchaseDoc[]) || []);
        
        if (locRes && locRes.length > 0) setLocationCode(locRes[0]?.code ?? locRes[0]?.public_code ?? "");
        if (cashRes && cashRes.length > 0) setCashAccountCode(cashRes[0]?.code ?? cashRes[0]?.public_code ?? "");
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoadingPurchases(false);
      }
    }
    void loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id");
    return products.filter(
      (product) =>
        !term ||
        `${product.name} ${product.sku ?? ""} ${getProductCode(product)}`
          .toLocaleLowerCase("id")
          .includes(term),
    );
  }, [products, search]);

  const filteredPurchases = useMemo(() => {
    const term = purchaseSearch.trim().toLowerCase();
    if (!term) return purchases;
    return purchases.filter(
      (p) =>
        p.purchase_number.toLowerCase().includes(term) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(term)),
    );
  }, [purchases, purchaseSearch]);

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
          unit: getProductUnit(product),
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
    let purchaseNumber: string | null = pendingPurchase;
    let lines: { line_number: number; received_quantity: string | number }[] = [];
    try {
      if (!purchaseNumber) {
        const response = await api.purchases.create({
          location_code: locationCode,
          supplier_code: supplierCode || undefined,
          reference_number: referenceNumber,
          discount_total: Math.max(0, discountTotal),
          tax_total: Math.max(0, taxTotal),
          items: cart.map((c) => ({
            product_code: c.product_code,
            quantity: c.quantity,
            unit_price: c.unit_price,
            discount: c.discount,
          })),
        });

        purchaseNumber = response?.purchase_number ?? null;
        if (!purchaseNumber) {
          setError("Pembelian dibuat tetapi nomor pembelian tidak kembali. Cek riwayat sebelum retry.");
          return;
        }
        setPendingPurchase(purchaseNumber);
        lines = (response.items ?? []).map((it, idx) => ({
          line_number: it.line_number ?? idx + 1,
          received_quantity: it.quantity,
        }));
        if (lines.length === 0) {
          const detail = (await api.purchases.get(purchaseNumber).catch(() => null)) as unknown as {
            items?: { line_number: number; quantity: string }[];
          } | null;
          lines = (detail?.items ?? []).map((it, idx) => ({
            line_number: it.line_number ?? idx + 1,
            received_quantity: it.quantity,
          }));
        }
      }

      if (action === "receive" || action === "pay") {
        if (lines.length === 0) {
          const detail = (await api.purchases.get(purchaseNumber).catch(() => null)) as unknown as {
            items?: { line_number: number; quantity: string }[];
          } | null;
          lines = (detail?.items ?? []).map((it, idx) => ({
            line_number: it.line_number ?? idx + 1,
            received_quantity: it.quantity,
          }));
        }
        await api.purchases.order(purchaseNumber).catch((err: unknown) => {
          if (err instanceof ApiError && err.code === "INVALID_STATE") return;
          throw err;
        });
        await api.purchases.receive(purchaseNumber, {
          reference_number: referenceNumber || undefined,
          items: lines,
        });
      }

      if (action === "pay") {
        await api.purchases.pay(purchaseNumber, {
          amount: grandTotal,
          cash_account_code: cashAccountCode,
        });
      }

      onPurchaseCreated(purchaseNumber);
      setPendingPurchase(null);
      setCart([]);
      setDiscountTotal(0);
      setTaxTotal(0);
      setReferenceNumber("");
    } catch (caught) {
      setError(
        purchaseNumber
          ? `${errorMessage(caught)} (Draft ${purchaseNumber} tersimpan, jangan buat duplikat.)`
          : errorMessage(caught),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    const s = status.toUpperCase();
    if (s === "RECEIVED" || s === "COMPLETED" || s === "PAID") {
      return <span className="status-pill status-pill--ok"><i />Diterima</span>;
    }
    if (s === "PARTIAL") {
      return <span className="status-pill status-pill--warn"><i />Sebagian</span>;
    }
    return <span className="status-pill status-pill--neutral"><i />Draf</span>;
  }

  return (
    <div className="content-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMBELIAN</p>
          <h1>Pembelian</h1>
          <p className="muted">Catat restock dan terima barang dari supplier.</p>
        </div>
      </div>

      {/* 1. DAFTAR PEMBELIAN SEKSI */}
      <section className="content-card">
        <div className="content-card__header">
          <div>
            <h2>Daftar pembelian</h2>
            <p>
              {purchases.length} dokumen pembelian terdaftar.
            </p>
          </div>
          <div className="search-field" style={{ width: "240px" }}>
            <Icon name="search" size={16} />
            <input
              placeholder="Cari nomor atau supplier"
              value={purchaseSearch}
              onChange={(e) => setPurchaseSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Nomor</th>
                <th scope="col">Supplier</th>
                <th scope="col">Tanggal</th>
                <th scope="col" className="num">Total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingPurchases ? (
                <SkeletonRows columns={5} rows={3} />
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <EmptyState
                      title="Belum ada dokumen pembelian"
                      description="Pilih produk pada formulir di bawah untuk membuat draf restock baru."
                    />
                  </td>
                </tr>
              ) : (
                filteredPurchases.slice(0, 5).map((p) => (
                  <tr key={p.purchase_number}>
                    <td className="doc-no"><strong>{p.purchase_number}</strong></td>
                    <td>{p.supplier_name || "Tanpa supplier"}</td>
                    <td>{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString("id-ID") : "-"}</td>
                    <td className="num">{formatCurrency(p.grand_total)}</td>
                    <td>{getStatusBadge(p.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredPurchases.length > 0 && (
          <div className="table-footer">
            <span>Menampilkan {Math.min(5, filteredPurchases.length)} dari {filteredPurchases.length} dokumen.</span>
          </div>
        )}
      </section>

      {/* 2. FORM RESTOCK DUA ZONA (SPLIT) */}
      <div className="split" style={{ marginTop: "var(--space-5)" }}>
        {/* CARD KIRI: ITEM PEMBELIAN */}
        <section className="content-card">
          <div className="content-card__header">
            <div>
              <h2>Item pembelian</h2>
              <p>Pilih produk yang akan dipesan atau direstock</p>
            </div>
          </div>

          <div style={{ padding: "var(--space-5)" }}>
            <div className="pos-search" style={{ marginBottom: "var(--space-4)" }}>
              <Icon name="search" size={18} />
              <input
                placeholder="Cari nama, SKU, atau kode produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {search && filteredProducts.length > 0 && (
              <div
                style={{
                  maxHeight: "160px",
                  overflowY: "auto",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-raised)",
                  marginBottom: "var(--space-4)",
                }}
              >
                {filteredProducts.slice(0, 6).map((product) => {
                  const code = getProductCode(product);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => addToCart(product)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "8px 12px",
                        border: "0",
                        borderBottom: "1px solid var(--line-soft)",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        font: "inherit",
                        fontSize: "var(--text-sm)",
                      }}
                    >
                      <span>
                        <strong>{product.name}</strong>
                        {product.sku && <small style={{ marginLeft: "6px", color: "var(--text-muted)" }}>{product.sku}</small>}
                      </span>
                      <span className="num" style={{ fontWeight: 600 }}>
                        {formatCurrency(product.default_purchase_price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredProducts.length === 0 && search && (
              <div style={{ marginBottom: "var(--space-4)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Produk tidak ditemukan.{" "}
                <button type="button" className="link-button" onClick={onGoToProducts}>
                  Tambah produk baru
                </button>
              </div>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Produk</th>
                    <th scope="col" className="num">Jumlah</th>
                    <th scope="col" className="num">Harga Beli</th>
                    <th scope="col" className="num">Subtotal</th>
                    <th scope="col" className="actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-6)" }}>
                        Belum ada item ditambahkan. Cari produk di atas untuk menambahkan.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.product_code}>
                        <td>
                          <strong>{item.name}</strong>
                          <span className="unit">{item.unit ?? "PCS"}</span>
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity || ""}
                            onChange={(e) => updateQuantity(item.product_code, Number(e.target.value))}
                            className="summary-input"
                            style={{ width: "60px" }}
                          />
                        </td>
                        <td className="num">
                          <input
                            type="number"
                            value={item.unit_price || ""}
                            onChange={(e) => updatePrice(item.product_code, Number(e.target.value))}
                            className="summary-input"
                            style={{ width: "100px" }}
                          />
                        </td>
                        <td className="num">
                          {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                        </td>
                        <td className="actions">
                          <button
                            type="button"
                            className="link-button"
                            style={{ color: "var(--status-danger-text)" }}
                            onClick={() => updateQuantity(item.product_code, 0)}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {error && (
              <div style={{ marginTop: "var(--space-4)" }}>
                <Alert tone="error">{error}</Alert>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => void submitAction("draft")}
                disabled={submitting || cart.length === 0}
              >
                Simpan draf
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={() => void submitAction("receive")}
                disabled={submitting || cart.length === 0}
              >
                Terima barang
              </button>
              {cashAccountCode && (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void submitAction("pay")}
                  disabled={submitting || cart.length === 0}
                >
                  Terima & Bayar
                </button>
              )}
            </div>
          </div>
        </section>

        {/* CARD KANAN: RINGKASAN BIAYA */}
        <section className="content-card">
          <div className="content-card__header">
            <div>
              <h2>Ringkasan biaya</h2>
              <p>Total dan tujuan pengiriman restock</p>
            </div>
          </div>

          <div style={{ padding: "var(--space-5)" }}>
            <div className="summary-row">
              <span>Subtotal item</span>
              <span className="num">{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Biaya tambahan / Pajak</span>
              <input
                type="number"
                className="summary-input"
                value={taxTotal || ""}
                onChange={(e) => setTaxTotal(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="summary-row">
              <span>Diskon supplier</span>
              <input
                type="number"
                className="summary-input"
                value={discountTotal || ""}
                onChange={(e) => setDiscountTotal(Number(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="summary-grand" aria-live="polite">
              <span>Total pembelian</span>
              <strong className="num">{formatCurrency(grandTotal)}</strong>
            </div>

            <div className="form-stack" style={{ gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
              <label className="field">
                <span>Lokasi penerimaan <em>*</em></span>
                <select
                  value={locationCode}
                  onChange={(e) => setLocationCode(e.target.value)}
                  required
                >
                  <option value="" disabled>Pilih Lokasi Penerimaan</option>
                  {locations.map((loc) => {
                    const code = loc.code ?? loc.public_code ?? "";
                    return <option key={code} value={code}>{loc.name}</option>;
                  })}
                </select>
              </label>

              <label className="field">
                <span>Supplier</span>
                <select
                  value={supplierCode}
                  onChange={(e) => setSupplierCode(e.target.value)}
                >
                  <option value="">Tanpa supplier (Pemasok umum)</option>
                  {contacts.map((c) => {
                    const code = c.code ?? c.public_code ?? "";
                    return <option key={code} value={code}>{c.name}</option>;
                  })}
                </select>
              </label>

              <label className="field">
                <span>No. Referensi / Surat Jalan</span>
                <input
                  placeholder="Contoh: SJ-2026-081 (opsional)"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Akun kas pembayaran (opsional)</span>
                <select
                  value={cashAccountCode}
                  onChange={(e) => setCashAccountCode(e.target.value)}
                >
                  <option value="">Bayar nanti (Tempo / Hutang)</option>
                  {cashAccounts.map((ca) => {
                    const code = ca.code ?? ca.public_code ?? "";
                    return <option key={code} value={code}>{ca.name}</option>;
                  })}
                </select>
              </label>
            </div>

            <p className="document-footnote" style={{ marginTop: "var(--space-4)", color: "var(--text-faint)", fontSize: "var(--text-xs)" }}>
              Pembayaran dicatat setelah barang diterima, bukan bersamaan dengan penerimaan.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
