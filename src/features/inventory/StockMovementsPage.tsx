import { useEffect, useState } from "react";
import { Alert, EmptyState, Spinner } from "../../components/Feedback";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";
import { StockMovement } from "../../types";

export function StockMovementsPage({ onGoBack }: { onGoBack?: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.inventory.movements();
      setMovements(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const getMovementLabel = (type: string) => {
    const labels: Record<string, string> = {
      OPENING_BALANCE: "Stok Awal",
      PURCHASE: "Pembelian",
      SALE: "Penjualan",
      ADJUSTMENT: "Penyesuaian",
      SPOILAGE: "Basi / Kedaluwarsa",
      DAMAGE: "Rusak",
      TRANSFER: "Transfer Lokasi",
      RETURN: "Retur",
    };
    return labels[type] || type;
  };

  return (
    <div className="page-stack">
      <div className="page-heading">
        {onGoBack && (
          <button className="button button--secondary" onClick={onGoBack} type="button" style={{ padding: "0 12px" }}>
            Kembali
          </button>
        )}
        <div>
          <h1>Riwayat Pergerakan Stok</h1>
          <p className="muted">Lihat arus keluar-masuk barang pada semua lokasi.</p>
        </div>
      </div>

      {error && (
        <Alert>
          <p>{error}</p>
          <button className="link-button" type="button" onClick={fetchMovements}>
            Coba lagi
          </button>
        </Alert>
      )}

      {loading && movements.length === 0 ? (
        <div className="flex-center" style={{ minHeight: 200 }}>
          <Spinner />
        </div>
      ) : movements.length === 0 && !error ? (
        <EmptyState
          title="Belum Ada Riwayat Stok"
          description="Riwayat pergerakan akan otomatis tercatat ketika ada transaksi yang mengubah stok."
        />
      ) : (
        <div className="card table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Jenis</th>
                <th>Produk</th>
                <th>Lokasi</th>
                <th className="text-right">Kuantitas</th>
                <th>Alasan / Keterangan</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, i) => (
                <tr key={`${m.product_code}-${m.occurred_at}-${i}`}>
                  <td className="muted">{formatDateTime(m.occurred_at)}</td>
                  <td>{getMovementLabel(m.movement_type)}</td>
                  <td>
                    <div className="font-medium">{m.product_name}</div>
                    <div className="text-xs muted">{m.product_code}</div>
                  </td>
                  <td>{m.location_name}</td>
                  <td className="text-right">
                    <span className={m.direction === "IN" ? "color-success" : "color-danger"}>
                      {m.direction === "IN" ? "+" : "-"}
                      {formatNumber(m.quantity)} {m.unit_symbol}
                    </span>
                  </td>
                  <td className="muted text-sm">{m.reason || "-"}</td>
                  <td>{m.created_by_name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
