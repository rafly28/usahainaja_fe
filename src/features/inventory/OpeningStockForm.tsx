import { useMemo, useState, type FormEvent } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import { formatCurrency, formatNumber } from "../../lib/format";
import { getProductCode, getProductUnit, type Business, type Product } from "../../types";

type OpeningStockFormProps = {
  products: Product[];
  business: Business;
  onRecorded: (summary: string) => Promise<void> | void;
  onCancel?: () => void;
};

export function OpeningStockForm({
  products,
  business,
  onRecorded,
  onCancel,
}: OpeningStockFormProps) {
  // Keyed by product code, default empty string "" (NOT 0)
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const locationName = business.default_location?.name || "Lokasi Utama";
  const locationCode = business.default_location?.code || "LOC-DEFAULT";

  function handleQtyChange(code: string, value: string) {
    setQuantities((prev) => ({
      ...prev,
      [code]: value,
    }));
  }

  // Calculate filled items and total value
  const { filledCount, totalValue, itemsToSubmit } = useMemo(() => {
    let filled = 0;
    let total = 0;
    const items: { product_code: string; quantity: number }[] = [];

    for (const product of products) {
      const code = getProductCode(product);
      const val = quantities[code];
      if (val !== undefined && val.trim() !== "") {
        const num = Number(val);
        if (Number.isFinite(num) && num > 0) {
          filled++;
          items.push({ product_code: code, quantity: num });
          const cost = Number(product.default_purchase_price ?? 0);
          if (Number.isFinite(cost) && cost > 0) {
            total += num * cost;
          }
        }
      }
    }

    return { filledCount: filled, totalValue: total, itemsToSubmit: items };
  }, [products, quantities]);

  const emptyCount = products.length - filledCount;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (itemsToSubmit.length === 0) {
      setError("Isi minimal satu baris stok awal sebelum menyimpan.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.inventory.openingStock({
        location_code: locationCode || undefined,
        reason: "Saldo awal inventaris",
        items: itemsToSubmit,
      });
      await onRecorded(`${itemsToSubmit.length} produk`);
      setQuantities({});
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert>{error}</Alert>
        </div>
      )}

      <div className="split split--wide-left">
        <section className="content-card">
          <div className="content-card__header">
            <div>
              <h2>Input stok awal</h2>
              <p>Kolom NILAI dihitung otomatis: kuantitas × harga beli.</p>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Produk</th>
                  <th scope="col">Satuan</th>
                  <th scope="col" className="num">
                    Stok awal
                  </th>
                  <th scope="col" className="num">
                    Nilai
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const code = getProductCode(product);
                  const mark = product.name.trim().slice(0, 2).toUpperCase() || "PR";
                  const qtyValue = quantities[code] ?? "";
                  const numQty = Number(qtyValue);
                  const purchasePrice = Number(product.default_purchase_price ?? 0);
                  const hasPrice = Number.isFinite(purchasePrice) && purchasePrice > 0;
                  const itemValue =
                    qtyValue.trim() !== "" && Number.isFinite(numQty) && hasPrice
                      ? numQty * purchasePrice
                      : null;

                  return (
                    <tr key={code}>
                      <td>
                        <div className="product-cell">
                          <span className="product-cell__mark">{mark}</span>
                          <div>
                            <strong>{product.name}</strong>
                            <small>
                              {product.sku || code}
                              {hasPrice
                                ? ` · ${formatCurrency(purchasePrice)} / ${getProductUnit(product)}`
                                : ""}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{getProductUnit(product)}</td>
                      <td className="num">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={qtyValue}
                          onChange={(e) => handleQtyChange(code, e.target.value)}
                          placeholder="Isi stok awal"
                          aria-label={`Stok awal ${product.name}`}
                          style={{
                            width: "96px",
                            minHeight: "34px",
                            padding: "0 8px",
                            border: "1px solid var(--line-strong)",
                            borderRadius: "var(--radius-sm, 6px)",
                            textAlign: "right",
                            font: "inherit",
                            fontSize: "var(--text-sm)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        />
                      </td>
                      <td
                        className="num"
                        style={itemValue === null ? { color: "var(--text-faint)" } : undefined}
                      >
                        {itemValue !== null ? formatCurrency(itemValue) : "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              {filledCount} dari {products.length} baris terisi
            </span>
            <span>{products.length} baris ditampilkan</span>
          </div>
        </section>

        <section className="content-card">
          <div className="content-card__header">
            <div>
              <h2>Lokasi</h2>
              <p>Lokasi aktif tidak dapat diubah di halaman ini.</p>
            </div>
          </div>
          <div style={{ padding: "var(--space-5)" }}>
            <div className="field">
              <span>Lokasi</span>
              <span className="readonly-box">
                {locationName}
                <small>satu-satunya lokasi</small>
              </span>
            </div>

            <div className="summary-row" style={{ marginTop: "var(--space-5)" }}>
              <span>Baris terisi</span>
              <span>{formatNumber(filledCount)}</span>
            </div>
            <div className="summary-row">
              <span>Baris kosong</span>
              <span>{formatNumber(emptyCount)}</span>
            </div>
            <div className="summary-grand" aria-live="polite">
              <span>Nilai terisi (cuplikan)</span>
              <strong>{formatCurrency(totalValue)}</strong>
            </div>

            <div className="form-actions">
              {onCancel && (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={onCancel}
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                className="button button--primary"
                disabled={submitting || filledCount === 0}
              >
                {submitting && <Spinner />}
                Catat stok awal
              </button>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
