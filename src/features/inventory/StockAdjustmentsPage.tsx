import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, EmptyState, Spinner } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { formatDateTime } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";
import { getProductCode, getProductUnit, type Product, type StockAdjustment } from "../../types";
import { StockAdjustmentDetail } from "./StockAdjustmentDetail";

const ADJUSTMENT_REASONS = [
  { value: "CORRECTION", label: "Koreksi stok" },
  { value: "DAMAGE", label: "Barang rusak" },
  { value: "SPOILAGE", label: "Basi / kedaluwarsa" },
  { value: "LOST", label: "Barang hilang" },
  { value: "OTHER", label: "Lainnya" },
];

type DraftLine = { product_code: string; quantity: string; direction: string };

export function StockAdjustmentsPage({
  onGoBack,
  onSuccess,
}: {
  onGoBack: () => void;
  onSuccess: (message: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [locations, setLocations] = useState<{ code: string; name: string; is_default?: boolean }[]>([]);

  const [locationCode, setLocationCode] = useState("");
  const [reason, setReason] = useState("CORRECTION");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ product_code: "", quantity: "", direction: "OUT" }]);

  const [drafts, setDrafts] = useState<StockAdjustment[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api.products
      .list()
      .then(setProducts)
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setLoadingProducts(false));
    api.locations
      .list()
      .then((items) => {
        const mapped = (items ?? [])
          .map((location) => ({
            code: location.code ?? location.public_code ?? "",
            name: location.name,
            is_default: location.is_default,
          }))
          .filter((location) => location.code);
        setLocations(mapped);
        const fallback = mapped.find((location) => location.is_default) ?? mapped[0];
        if (fallback) setLocationCode(fallback.code);
      })
      .catch((caught) => setError(errorMessage(caught)));
  }, []);

  const loadDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const result = await api.inventory.adjustments({ status: "DRAFT", limit: 25 });
      setDrafts(result.items);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const trackedProducts = useMemo(() => products.filter((product) => product.is_stock_tracked), [products]);

  function updateLine(index: number, field: keyof DraftLine, value: string) {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, [field]: value } : line)));
  }

  function addLine() {
    setLines((current) => [...current, { product_code: "", quantity: "", direction: "OUT" }]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, position) => position !== index));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lines.length === 0) {
      setError("Pilih minimal 1 produk.");
      return;
    }
    for (const [index, line] of lines.entries()) {
      if (!line.product_code) {
        setError(`Baris ${index + 1}: Produk harus dipilih.`);
        return;
      }
      if (!(Number(line.quantity) > 0)) {
        setError(`Baris ${index + 1}: Kuantitas harus lebih dari 0.`);
        return;
      }
    }
    if (!locationCode) {
      setError("Pilih lokasi terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const items = lines.map((line) => {
        const product = trackedProducts.find((candidate) => getProductCode(candidate) === line.product_code);
        return {
          product_code: line.product_code,
          quantity: line.quantity,
          direction: line.direction,
          unit_symbol: product ? getProductUnit(product) : "",
        };
      });
      const adjustment = await api.inventory.createAdjustment({
        location_code: locationCode,
        reason,
        notes: notes.trim() || undefined,
        items,
      });
      setSuccess(`Draft ${adjustment.adjustment_number} dibuat. Selesaikan untuk menerapkan ke stok.`);
      setLines([{ product_code: "", quantity: "", direction: "OUT" }]);
      setNotes("");
      await loadDrafts();
      onSuccess(`Draft penyesuaian ${adjustment.adjustment_number} dibuat.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function complete(adjustmentNumber: string) {
    setCompleting(adjustmentNumber);
    setError("");
    setSuccess("");
    try {
      await api.inventory.completeAdjustment(adjustmentNumber);
      setSuccess(`Penyesuaian ${adjustmentNumber} selesai dan stok sudah diperbarui.`);
      setSelected("");
      await loadDrafts();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setCompleting("");
    }
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">Inventaris</span>
          <h1>Penyesuaian Stok</h1>
          <p>Buat draft lebih dulu, lalu selesaikan saat stok fisik sudah dicek.</p>
        </div>
        <div className="page-head__actions">
          <button className="button button--secondary" onClick={onGoBack} type="button">
            Kembali
          </button>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      {loadingProducts ? (
        <div className="flex-center" style={{ minHeight: 200 }}>
          <Spinner />
        </div>
      ) : (
        <form className="content-card" onSubmit={submit}>
          <div className="content-card__header">
            <div>
              <h2>Buat Draft Penyesuaian</h2>
              <p>Pilih lokasi dan barang yang mengalami perubahan stok fisik.</p>
            </div>
          </div>
          <div style={{ padding: "var(--space-5)" }}>
            <div className="form-grid-2">
              <label className="field">
                <span>Lokasi *</span>
                <select required value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
                  <option value="">-- Pilih Lokasi --</option>
                  {locations.map((location) => (
                    <option key={location.code} value={location.code}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Alasan Penyesuaian *</span>
                <select required value={reason} onChange={(event) => setReason(event.target.value)}>
                  {ADJUSTMENT_REASONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field" style={{ marginTop: "var(--space-4)" }}>
              <span>Keterangan Tambahan</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Misal: ditemukan berbeda saat audit bulanan"
                rows={2}
              />
            </label>

            <div style={{ margin: "var(--space-5) 0", borderTop: "1px solid var(--line)" }} />

            <h3 style={{ marginBottom: "var(--space-4)" }}>Daftar Barang</h3>

            {lines.map((line, index) => {
              const selectedProduct = trackedProducts.find((product) => getProductCode(product) === line.product_code);
              return (
                <div key={index} style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)", alignItems: "flex-end" }}>
                  <label className="field" style={{ flex: 2, marginBottom: 0 }}>
                    <span className="sr-only">Produk</span>
                    <select
                      required
                      value={line.product_code}
                      onChange={(event) => updateLine(index, "product_code", event.target.value)}
                    >
                      <option value="">-- Pilih Produk --</option>
                      {trackedProducts.map((product) => (
                        <option key={getProductCode(product)} value={getProductCode(product)}>
                          {product.name} {getProductCode(product) ? `(${getProductCode(product)})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <span className="sr-only">Arah</span>
                    <select required value={line.direction} onChange={(event) => updateLine(index, "direction", event.target.value)}>
                      <option value="OUT">Kurangi (−)</option>
                      <option value="IN">Tambah (+)</option>
                    </select>
                  </label>

                  <label className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <span className="sr-only">Kuantitas</span>
                    <div className="input-suffix">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(event) => updateLine(index, "quantity", event.target.value)}
                      />
                      <span>{selectedProduct ? getProductUnit(selectedProduct) : "Unit"}</span>
                    </div>
                  </label>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => removeLine(index)}
                      style={{ height: 38, padding: "0 12px", color: "var(--action-danger-soft-text, #c92a2a)" }}
                      aria-label="Hapus"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              className="button button--secondary"
              onClick={addLine}
              style={{ alignSelf: "flex-start", marginTop: "var(--space-2)" }}
            >
              <Icon name="plus" size={16} /> Tambah Baris
            </button>

            <div className="form-actions" style={{ marginTop: "var(--space-5)" }}>
              <button type="button" className="button button--ghost" onClick={onGoBack}>
                Batal
              </button>
              <button type="submit" className="button button--primary" disabled={submitting || trackedProducts.length === 0}>
                {submitting ? "Menyimpan draft..." : "Simpan Draft"}
              </button>
            </div>
          </div>
        </form>
      )}

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <h2>Draft menunggu diselesaikan</h2>
            <p>Stok baru berubah setelah draft diselesaikan.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => void loadDrafts()}>
            Muat ulang
          </button>
        </div>

        {loadingDrafts ? (
          <div className="flex-center" style={{ minHeight: 120 }}>
            <Spinner />
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState title="Tidak ada draft" description="Draft yang dibuat akan muncul di sini sampai diselesaikan." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Nomor</th>
                  <th scope="col">Dibuat</th>
                  <th scope="col">Lokasi</th>
                  <th scope="col">Alasan</th>
                  <th scope="col" className="actions">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.adjustment_number}>
                    <td className="doc-no">{draft.adjustment_number}</td>
                    <td style={{ color: "var(--text-muted)" }}>{formatDateTime(draft.adjustment_date)}</td>
                    <td>{draft.location_code}</td>
                    <td>{draft.reason}</td>
                    <td className="actions">
                      <div style={{ display: "inline-flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => setSelected(selected === draft.adjustment_number ? "" : draft.adjustment_number)}
                        >
                          {selected === draft.adjustment_number ? "Tutup" : "Rincian"}
                        </button>
                        <button
                          type="button"
                          className="button button--primary"
                          disabled={completing === draft.adjustment_number}
                          onClick={() => void complete(draft.adjustment_number)}
                        >
                          {completing === draft.adjustment_number ? "Menyelesaikan..." : "Selesaikan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && <StockAdjustmentDetail adjustmentNumber={selected} onGoBack={() => setSelected("")} />}
    </div>
  );
}