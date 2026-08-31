import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage } from "../../lib/api";
import { getProductCode, getProductUnit, type Product } from "../../types";

export function StockAdjustmentsPage({
  onGoBack,
  onSuccess,
}: {
  onGoBack: () => void;
  onSuccess: (message: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [locationCode] = useState("LOC-DEFAULT");
  const [reason, setReason] = useState("CORRECTION");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<
    { product_code: string; quantity: string; direction: string }[]
  >([{ product_code: "", quantity: "", direction: "OUT" }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.products
      .list()
      .then(setProducts)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoadingProducts(false));
  }, []);

  const addItem = () => {
    setItems([...items, { product_code: "", quantity: "", direction: "OUT" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: "product_code" | "direction" | "quantity", value: string) => {
    const newItems = [...items];
    const current = newItems[index];
    if (current) {
      newItems[index] = { ...current, [field]: value };
      setItems(newItems);
    }
  };

  const activeProducts = useMemo(() => products.filter((p) => p.is_stock_tracked), [products]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Pilih minimal 1 produk.");
      return;
    }
    
    // validate
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      if (!item.product_code) return setError(`Baris ${i + 1}: Produk harus dipilih.`);
      if (Number(item.quantity) <= 0) return setError(`Baris ${i + 1}: Kuantitas harus lebih dari 0.`);
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const payloadItems = items.map((it) => {
        const prod = products.find((p) => getProductCode(p) === it.product_code);
        return {
          product_code: it.product_code || "",
          quantity: it.quantity || "",
          direction: it.direction || "OUT",
          unit_symbol: prod ? getProductUnit(prod) : "",
        };
      });

      const adjustment = await api.inventory.createAdjustment({
        location_code: locationCode,
        reason,
        notes,
        items: payloadItems,
      });

      await api.inventory.completeAdjustment(adjustment.adjustment_number);
      
      setSuccess(true);
      setItems([{ product_code: "", quantity: "", direction: "OUT" }]);
      setNotes("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack max-w-3xl">
      <div className="page-heading">
        <button className="button button--secondary" onClick={onGoBack} type="button" style={{ padding: "0 12px" }}>
          Kembali
        </button>
        <div>
          <h1>Penyesuaian Stok</h1>
          <p className="muted">Koreksi stok barang akibat hilang, rusak, atau salah catat.</p>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && (
        <Alert tone="success">
          Penyesuaian stok berhasil disimpan. <button className="link-button" type="button" onClick={() => onSuccess("Penyesuaian stok berhasil disimpan.")}>Lihat Riwayat</button>
        </Alert>
      )}

      {loadingProducts ? (
        <div className="flex-center" style={{ minHeight: 200 }}>
          <Spinner />
        </div>
      ) : (
        <form className="content-card form-stack" onSubmit={handleSubmit} style={{ padding: 24, gap: 24 }}>
          <div>
            <label className="field">
              <span>Alasan Penyesuaian *</span>
              <select required value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="CORRECTION">Koreksi Stok</option>
                <option value="DAMAGE">Barang Rusak</option>
                <option value="SPOILAGE">Barang Basi / Kedaluwarsa</option>
                <option value="LOST">Barang Hilang</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </label>
            
            <label className="field" style={{ marginTop: 16 }}>
              <span>Keterangan Tambahan</span>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Misal: Ditemukan saat audit bulanan"
                rows={2}
              />
            </label>

            <div className="divider" style={{ margin: "24px 0" }} />

            <h3 style={{ marginBottom: 16 }}>Daftar Barang</h3>
            
            {items.map((item, index) => {
              const selectedProduct = activeProducts.find((p) => getProductCode(p) === item.product_code);
              return (
                <div key={index} style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
                  <label className="field" style={{ flex: 2, marginBottom: 0 }}>
                    <span className="sr-only">Produk</span>
                    <select
                      required
                      value={item.product_code}
                      onChange={(e) => updateItem(index, "product_code", e.target.value)}
                    >
                      <option value="">-- Pilih Produk --</option>
                      {activeProducts.map((p) => (
                        <option key={getProductCode(p)} value={getProductCode(p)}>
                          {p.name} {getProductCode(p) ? `(${getProductCode(p)})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  
                  <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <span className="sr-only">Arah</span>
                    <select
                      required
                      value={item.direction}
                      onChange={(e) => updateItem(index, "direction", e.target.value)}
                    >
                      <option value="OUT">Kurangi (-)</option>
                      <option value="IN">Tambah (+)</option>
                    </select>
                  </label>

                  <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <span className="sr-only">Kuantitas</span>
                    <div className="input-suffix">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      />
                      <span>{selectedProduct ? getProductUnit(selectedProduct) : "Unit"}</span>
                    </div>
                  </label>

                  {items.length > 1 && (
                    <button 
                      type="button" 
                      className="button button--ghost" 
                      onClick={() => removeItem(index)}
                      style={{ height: 38, padding: "0 12px", color: "var(--color-danger)" }}
                      aria-label="Hapus"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              );
            })}

            <button type="button" className="button button--secondary" onClick={addItem} style={{ alignSelf: "flex-start", marginTop: 8 }}>
              <Icon name="plus" size={16} /> Tambah Baris
            </button>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            <button type="button" className="button button--ghost" onClick={onGoBack}>
              Batal
            </button>
            <button type="submit" className="button button--primary" disabled={submitting || activeProducts.length === 0}>
              {submitting ? "Menyimpan..." : "Simpan Penyesuaian"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
