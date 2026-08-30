import { useMemo, useState, type FormEvent } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import { getProductCode, getProductUnit, type Product } from "../../types";

export function OpeningStockForm({
  products,
  defaultLocationCode = "",
  onRecorded,
}: {
  products: Product[];
  defaultLocationCode?: string;
  onRecorded: (productName: string) => Promise<void> | void;
}) {
  const [productCode, setProductCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [locationCode, setLocationCode] = useState(defaultLocationCode);
  const [reason, setReason] = useState("Persediaan saat mulai memakai UsahainAja");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => getProductCode(product) === productCode),
    [productCode, products],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!productCode) {
      setError("Pilih produk yang akan diberi stok awal.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Jumlah stok harus lebih besar dari 0.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.inventory.openingStock({
        product_code: productCode,
        quantity: parsedQuantity,
        location_code: locationCode.trim() || undefined,
        reason: reason.trim() || undefined,
      });
      await onRecorded(selectedProduct?.name ?? "Produk");
      setQuantity("");
      setProductCode("");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack opening-form" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <label className="field">
        <span>Produk *</span>
        <select value={productCode} onChange={(event) => setProductCode(event.target.value)} required>
          <option value="">Pilih produk</option>
          {products.map((product) => {
            const code = getProductCode(product);
            return <option key={code} value={code}>{product.name} · {code}</option>;
          })}
        </select>
      </label>
      <div className="form-grid form-grid--stock">
        <label className="field">
          <span>Jumlah stok *</span>
          <div className="input-suffix">
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
              required
            />
            <span>{selectedProduct ? getProductUnit(selectedProduct) : "satuan"}</span>
          </div>
        </label>
        <label className="field">
          <span>Kode lokasi</span>
          <input
            value={locationCode}
            onChange={(event) => setLocationCode(event.target.value)}
            placeholder="Lokasi utama (otomatis)"
          />
          <small>Kosongkan untuk memakai lokasi utama bisnis.</small>
        </label>
      </div>
      <label className="field">
        <span>Catatan</span>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} />
      </label>
      <div className="info-note">
        <span aria-hidden="true">i</span>
        Stok awal menghasilkan catatan pergerakan stok dan tidak dapat dicatat dua kali untuk produk serta lokasi yang sama.
      </div>
      <div className="form-actions">
        <button className="button button--primary" disabled={submitting || products.length === 0}>
          {submitting && <Spinner />}
          Catat stok awal
        </button>
      </div>
    </form>
  );
}
