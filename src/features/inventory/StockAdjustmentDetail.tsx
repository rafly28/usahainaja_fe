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
  title?: string;
  adjustmentType?: string;
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
            <p>
              {KIND_LABELS[adjustment.adjustment_kind] ?? adjustment.adjustment_kind} ·{" "}
              {adjustment.status} · {formatDateTime(adjustment.adjustment_date)}
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
          <table>
            <thead>
              <tr>
                <th scope="col">Produk</th>
                <th scope="col" className="num">
                  Sistem
                </th>
                <th scope="col" className="num">
                  Hitung fisik
                </th>
                <th scope="col" className="num">
                  Selisih
                </th>
                <th scope="col">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {adjustment.items.map((item) => {
                const mark = item.product_name?.trim().slice(0, 2).toUpperCase() || "PR";
                const isIncoming = item.direction === "IN";
                return (
                  <tr key={`${item.product_code}-${item.quantity}`}>
                    <td>
                      <div className="product-cell">
                        <span className="product-cell__mark">{mark}</span>
                        <div>
                          <strong>{item.product_name}</strong>
                          <small>{item.product_code}</small>
                        </div>
                      </div>
                    </td>
                    <td className="num">
                      {item.system_quantity !== undefined && item.system_quantity !== null
                        ? formatNumber(item.system_quantity)
                        : "—"}
                    </td>
                    <td className="num">
                      {item.counted_quantity !== undefined && item.counted_quantity !== null
                        ? formatNumber(item.counted_quantity)
                        : "—"}
                    </td>
                    <td className="num">
                      <span
                        className={`status-pill ${
                          isIncoming ? "status-pill--ok" : "status-pill--warn"
                        }`}
                      >
                        <i />
                        {isIncoming ? "+" : "−"}
                        {formatNumber(item.quantity)}
                      </span>
                    </td>
                    <td>{item.unit_symbol}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}