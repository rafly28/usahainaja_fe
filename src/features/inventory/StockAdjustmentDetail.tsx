import { useEffect, useState } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";
import type { StockAdjustment } from "../../types";

const KIND_LABELS: Record<string, string> = {
  MANUAL: "Penyesuaian manual",
  OPNAME: "Hasil hitung fisik",
  OPENING_BALANCE: "Stok awal",
};

/**
 * Rincian satu adjustment atau opname. Komponen ini dipakai ulang oleh halaman
 * penyesuaian stok dan halaman opname agar format datanya sama.
 */
export function StockAdjustmentDetail({
  adjustmentNumber,
  onGoBack,
}: {
  adjustmentNumber: string;
  onGoBack: () => void;
}) {
  const [adjustment, setAdjustment] = useState<StockAdjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    api.inventory
      .adjustment(adjustmentNumber)
      .then((result) => {
        if (mounted) setAdjustment(result);
      })
      .catch((caught) => {
        if (mounted) setError(errorMessage(caught));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [adjustmentNumber]);

  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <h2>Rincian {adjustmentNumber}</h2>
          {adjustment && (
            <p className="muted">
              {KIND_LABELS[adjustment.adjustment_kind] ?? adjustment.adjustment_kind} · {adjustment.status} ·{" "}
              {formatDateTime(adjustment.adjustment_date)}
            </p>
          )}
        </div>
        <button type="button" className="button button--ghost" onClick={onGoBack}>
          Tutup
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="flex-center" style={{ minHeight: 120 }}>
          <Spinner />
        </div>
      ) : adjustment ? (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Produk</th>
                <th className="text-right">Sistem</th>
                <th className="text-right">Hitung fisik</th>
                <th className="text-right">Selisih</th>
                <th>Satuan</th>
              </tr>
            </thead>
            <tbody>
              {adjustment.items.map((item) => (
                <tr key={`${item.product_code}-${item.quantity}`}>
                  <td>
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-xs muted">{item.product_code}</div>
                  </td>
                  <td className="text-right muted">{item.system_quantity ? formatNumber(item.system_quantity) : "-"}</td>
                  <td className="text-right muted">{item.counted_quantity ? formatNumber(item.counted_quantity) : "-"}</td>
                  <td className="text-right">
                    <span className={item.direction === "IN" ? "color-success" : "color-danger"}>
                      {item.direction === "IN" ? "+" : "-"}
                      {formatNumber(item.quantity)}
                    </span>
                  </td>
                  <td>{item.unit_symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}