import { useCallback, useEffect, useState } from "react";
import { Alert, EmptyState, Spinner } from "../../components/Feedback";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";
import type { Location, Pagination, StockMovement } from "../../types";

const MOVEMENT_TYPES = [
  { value: "", label: "Semua jenis" },
  { value: "OPENING_BALANCE", label: "Stok awal" },
  { value: "PURCHASE", label: "Pembelian" },
  { value: "SALE", label: "Penjualan" },
  { value: "ADJUSTMENT", label: "Penyesuaian" },
  { value: "SPOILAGE", label: "Basi / kedaluwarsa" },
  { value: "DAMAGE", label: "Rusak" },
  { value: "TRANSFER", label: "Transfer lokasi" },
  { value: "RETURN", label: "Retur" },
];

const PAGE_SIZE = 25;

const MOVEMENT_LABELS: Record<string, string> = {
  OPENING_BALANCE: "Stok awal",
  PURCHASE: "Pembelian",
  SALE: "Penjualan",
  ADJUSTMENT: "Penyesuaian",
  SPOILAGE: "Basi / kedaluwarsa",
  DAMAGE: "Rusak",
  TRANSFER: "Transfer lokasi",
  RETURN: "Retur",
};

function movementLabel(type: string): string {
  return MOVEMENT_LABELS[type] ?? type;
}

export function StockMovementsPage({ onGoBack }: { onGoBack?: () => void }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0 });
  const [locations, setLocations] = useState<Location[]>([]);

  const [productCode, setProductCode] = useState("");
  const [locationCode, setLocationCode] = useState("");
  const [movementType, setMovementType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.locations
      .list()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.inventory.movements({
        product_public_code: productCode.trim() || undefined,
        location: locationCode || undefined,
        movement_type: movementType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setMovements(result.items);
      setPagination(result.pagination);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [productCode, locationCode, movementType, dateFrom, dateTo, page]);

  useEffect(() => {
    void fetchMovements();
  }, [fetchMovements]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchMovements();
  }

  function resetFilters() {
    setProductCode("");
    setLocationCode("");
    setMovementType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / (pagination.limit || PAGE_SIZE)));

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
          <p className="muted">Setiap perubahan stok dapat ditelusuri dari ledger yang sama.</p>
        </div>
      </div>

      {error && (
        <Alert>
          <p>{error}</p>
          <button className="link-button" type="button" onClick={() => void fetchMovements()}>
            Coba lagi
          </button>
        </Alert>
      )}

      <form className="content-card" onSubmit={applyFilters} style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="content-card__header">
          <div>
            <h2>Filter</h2>
            <p className="muted">Saring ledger berdasarkan produk, lokasi, jenis, atau tanggal.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Kode produk</span>
            <input value={productCode} onChange={(event) => setProductCode(event.target.value)} placeholder="PRD-000001" />
          </label>
          <label className="field">
            <span>Lokasi</span>
            <select value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
              <option value="">Semua lokasi</option>
              {locations.map((location) => (
                <option key={location.code ?? location.public_code} value={location.code ?? location.public_code}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Jenis pergerakan</span>
            <select value={movementType} onChange={(event) => setMovementType(event.target.value)}>
              {MOVEMENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Dari tanggal</span>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>
          <label className="field">
            <span>Sampai tanggal</span>
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="button button--ghost" onClick={resetFilters}>
            Reset
          </button>
          <button type="submit" className="button button--primary" disabled={loading}>
            Terapkan filter
          </button>
        </div>
      </form>

      {loading && movements.length === 0 ? (
        <div className="flex-center" style={{ minHeight: 200 }}>
          <Spinner />
        </div>
      ) : movements.length === 0 && !error ? (
        <EmptyState
          title="Belum ada pergerakan stok"
          description="Ledger akan terisi otomatis saat ada stok awal, pembelian, penjualan, atau penyesuaian."
        />
      ) : (
        <>
          <div className="card table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Jenis</th>
                  <th>Produk</th>
                  <th>Lokasi</th>
                  <th className="text-right">Kuantitas</th>
                  <th>Alasan</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement, index) => (
                  <tr key={`${movement.product_code}-${movement.occurred_at}-${index}`}>
                    <td className="muted">{formatDateTime(movement.occurred_at)}</td>
                    <td>{movementLabel(movement.movement_type)}</td>
                    <td>
                      <div className="font-medium">{movement.product_name}</div>
                      <div className="text-xs muted">{movement.product_code}</div>
                    </td>
                    <td>{movement.location_name}</td>
                    <td className="text-right">
                      <span className={movement.direction === "IN" ? "color-success" : "color-danger"}>
                        {movement.direction === "IN" ? "+" : "-"}
                        {formatNumber(movement.quantity)} {movement.unit_symbol}
                      </span>
                    </td>
                    <td className="muted text-sm">{movement.reason || "-"}</td>
                    <td>{movement.created_by_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.total > PAGE_SIZE && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
              <span className="muted text-sm">
                Halaman {pagination.page} dari {totalPages} · total {pagination.total} baris
              </span>
              <button
                type="button"
                className="button button--secondary"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Sebelumnya
              </button>
              <button
                type="button"
                className="button button--secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}