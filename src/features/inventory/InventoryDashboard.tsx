import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Alert, EmptyState } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { formatNumber, isLowStock } from "../../lib/format";
import { getProductCode, getProductUnit, type InventoryItem } from "../../types";

export function InventoryDashboard({
  inventory,
  error,
  onRetry,
  onGoToProducts,
  onGoToOpeningStock,
  onGoToMovements,
  onGoToAdjustments,
  onGoToOpname,
  onGoToDocuments,
}: {
  inventory: InventoryItem[];
  error: string;
  onRetry: () => void;
  onGoToProducts: () => void;
  onGoToOpeningStock: () => void;
  onGoToMovements: () => void;
  onGoToAdjustments?: () => void;
  onGoToOpname: () => void;
  onGoToDocuments?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [serverInventory, setServerInventory] = useState(inventory);

  useEffect(() => {
    setServerInventory(inventory);
  }, [inventory]);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setServerInventory(inventory);
      return;
    }
    let isMounted = true;
    const handler = setTimeout(() => {
      api.inventory
        .list({ search: term })
        .then((res) => {
          if (isMounted) setServerInventory(res);
        })
        .catch(console.error);
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [search, inventory]);

  const filtered = useMemo(() => {
    return serverInventory.filter((item) => {
      if (!onlyLowStock) return true;
      if (typeof item.is_low_stock === "boolean") return item.is_low_stock;
      return isLowStock(item.quantity ?? item.stock, item.min_stock);
    });
  }, [serverInventory, onlyLowStock]);

  const lowStockCount = inventory.filter((item) => {
    if (typeof item.is_low_stock === "boolean") return item.is_low_stock;
    return isLowStock(item.quantity ?? item.stock, item.min_stock);
  }).length;

  const locations = new Set(inventory.map((item) => item.location_code).filter(Boolean)).size;

  const stockValue = useMemo(() => {
    return inventory.reduce((sum, item) => {
      const qty = Number(item.quantity ?? item.stock ?? 0);
      const cost = Number(
        (item as Record<string, unknown>).default_purchase_price ??
          (item as Record<string, unknown>).purchase_price ??
          (item as Record<string, unknown>).cost_price ??
          0
      );
      return sum + (Number.isFinite(qty) && Number.isFinite(cost) ? qty * cost : 0);
    }, 0);
  }, [inventory]);

  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "Hari ini";
    }
  }, []);

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">Ringkasan · {todayFormatted}</span>
          <h1>Ringkasan</h1>
          <p>Stok dan pergerakan hari ini di Lokasi Utama.</p>
        </div>
        <div className="page-head__actions">
          <button className="button button--secondary" type="button" onClick={onGoToMovements}>
            Riwayat stok
          </button>
          {onGoToAdjustments && (
            <button className="button button--secondary" type="button" onClick={onGoToAdjustments}>
              Penyesuaian
            </button>
          )}
          <button className="button button--secondary" type="button" onClick={onGoToOpname}>
            Stok opname
          </button>
          {onGoToDocuments && (
            <button className="button button--secondary" type="button" onClick={onGoToDocuments}>
              Dokumen
            </button>
          )}
          <button className="button button--primary" type="button" onClick={onGoToOpeningStock}>
            Catat stok awal
          </button>
        </div>
      </div>

      {error && (
        <Alert>
          <p>{error}</p>
          <button className="link-button" type="button" onClick={onRetry}>
            Coba lagi
          </button>
        </Alert>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <span>Produk tercatat</span>
          <div className="stat-card__value">
            <strong>{inventory.length}</strong>
            <small>item di inventory</small>
          </div>
        </div>
        <div className={`stat-card ${lowStockCount > 0 ? "stat-card--warn" : ""}`}>
          <span>Stok menipis</span>
          <div className="stat-card__value">
            <strong>{lowStockCount}</strong>
            <small>item di bawah minimum</small>
          </div>
        </div>
        <div className="stat-card">
          <span>Nilai stok</span>
          <div className="stat-card__value">
            <strong>{formatNumber(stockValue)}</strong>
            <small>Rupiah, harga beli</small>
          </div>
        </div>
        <div className="stat-card">
          <span>Lokasi tercatat</span>
          <div className="stat-card__value">
            <strong>{locations || 1}</strong>
            <small>tempat penyimpanan</small>
          </div>
        </div>
      </div>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <h2>Stok per produk</h2>
            <p>{filtered.length} produk terdaftar di Lokasi Utama.</p>
          </div>
          <div className="table-tools">
            <label className="search-field">
              <Icon name="search" size={18} />
              <span className="sr-only">Cari produk</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk atau SKU"
              />
            </label>
            <label className="filter-check">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(event) => setOnlyLowStock(event.target.checked)}
              />
              Stok menipis
            </label>
          </div>
        </div>

        {inventory.length === 0 && !error ? (
          <EmptyState
            title="Belum ada produk tercatat"
            description="Buat produk terlebih dahulu, lalu catat jumlah stok saat ini."
            action={
              <button className="button button--primary" type="button" onClick={onGoToProducts}>
                Tambah produk pertama
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Tidak ada hasil"
            description="Ubah kata pencarian atau matikan filter stok menipis."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Produk</th>
                  <th scope="col">Lokasi</th>
                  <th scope="col" className="num">
                    Jumlah
                  </th>
                  <th scope="col" className="num">
                    Minimum
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col" className="actions">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const quantity = item.quantity ?? item.stock ?? 0;
                  const low = isLowStock(quantity, item.min_stock);
                  const code = getProductCode(item);
                  const mark = item.name.trim().slice(0, 2).toUpperCase() || "PR";
                  return (
                    <tr key={`${code}-${item.location_code ?? "default"}`}>
                      <td>
                        <div className="product-cell">
                          <span className="product-cell__mark">{mark}</span>
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.sku || code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <strong>{item.location_name || "Lokasi Utama"}</strong>
                          <small>{item.location_code || "LOC-DEFAULT"}</small>
                        </div>
                      </td>
                      <td className="num">
                        {formatNumber(quantity)}
                        <span className="unit">{getProductUnit(item)}</span>
                      </td>
                      <td className="num">
                        {formatNumber(item.min_stock ?? 0)}
                        <span className="unit">{getProductUnit(item)}</span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            low ? "status-pill--warn" : "status-pill--ok"
                          }`}
                        >
                          <i />
                          {low ? "Perlu dicek" : "Aman"}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          type="button"
                          className="link-button"
                          onClick={onGoToMovements}
                        >
                          Riwayat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <span>
            Menampilkan {filtered.length} dari {serverInventory.length} produk.
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
            Diperbarui baru saja
            <button type="button" className="link-button" onClick={onRetry}>
              Muat ulang
            </button>
          </span>
        </div>
      </section>
    </div>
  );
}
