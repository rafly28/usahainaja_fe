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
}: {
  inventory: InventoryItem[];
  error: string;
  onRetry: () => void;
  onGoToProducts: () => void;
  onGoToOpeningStock: () => void;
  onGoToMovements: () => void;
  onGoToAdjustments: () => void;
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
      api.inventory.list({ search: term }).then(res => {
        if (isMounted) setServerInventory(res);
      }).catch(console.error);
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [search, inventory]);

  const filtered = useMemo(() => {
    return serverInventory.filter((item) => {
      const quantity = item.quantity ?? item.stock;
      return !onlyLowStock || isLowStock(quantity, item.min_stock);
    });
  }, [serverInventory, onlyLowStock]);

  const lowStockCount = inventory.filter((item) => isLowStock(item.quantity ?? item.stock, item.min_stock)).length;
  const locations = new Set(inventory.map((item) => item.location_code).filter(Boolean)).size;

  return (
    <div className="page-stack">
      <div className="page-heading page-heading--split">
        <div>
          <p className="eyebrow">RINGKASAN HARI INI</p>
          <h1>Stok usaha</h1>
          <p className="muted">Lihat kondisi persediaan dan item yang perlu segera dicek.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="button button--secondary" type="button" onClick={onGoToMovements}>
            Riwayat Stok
          </button>
          <button className="button button--secondary" type="button" onClick={onGoToAdjustments}>
            Penyesuaian
          </button>
          <button className="button button--primary" type="button" onClick={onGoToOpeningStock}>
            <Icon name="plus" size={18} /> Catat stok awal
          </button>
        </div>
      </div>

      {error && <Alert><p>{error}</p><button className="link-button" type="button" onClick={onRetry}>Coba lagi</button></Alert>}

      <div className="metric-grid">
        <article className="metric-card">
          <span className="metric-card__icon metric-card__icon--green"><Icon name="box" /></span>
          <div><span>Produk tercatat</span><strong>{inventory.length}</strong><small>di inventory</small></div>
        </article>
        <article className="metric-card">
          <span className="metric-card__icon metric-card__icon--orange">!</span>
          <div><span>Perlu perhatian</span><strong>{lowStockCount}</strong><small>stok minimum</small></div>
        </article>
        <article className="metric-card">
          <span className="metric-card__icon metric-card__icon--blue">◎</span>
          <div><span>Lokasi tercatat</span><strong>{locations}</strong><small>tempat penyimpanan</small></div>
        </article>
      </div>

      <section className="content-card">
        <div className="content-card__header">
          <div><h2>Daftar persediaan</h2><p>Stok terbaru berdasarkan lokasi.</p></div>
          <div className="table-tools">
            <label className="search-field">
              <Icon name="search" size={18} />
              <span className="sr-only">Cari persediaan</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk atau SKU" />
            </label>
            <label className="filter-check">
              <input type="checkbox" checked={onlyLowStock} onChange={(event) => setOnlyLowStock(event.target.checked)} />
              Stok menipis
            </label>
          </div>
        </div>

        {inventory.length === 0 && !error ? (
          <EmptyState
            title="Belum ada persediaan"
            description="Buat produk terlebih dahulu, lalu catat jumlah stok saat ini."
            action={<button className="button button--secondary" type="button" onClick={onGoToProducts}>Buat produk pertama</button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="Tidak ada hasil" description="Ubah kata pencarian atau matikan filter stok menipis." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Produk</th><th>Lokasi</th><th>Jumlah</th><th>Minimum</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((item) => {
                  const quantity = item.quantity ?? item.stock;
                  const low = isLowStock(quantity, item.min_stock);
                  return (
                    <tr key={`${getProductCode(item)}-${item.location_code ?? "all"}`}>
                      <td><div className="product-cell"><span>{item.name.slice(0, 1).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.sku || getProductCode(item)}</small></div></div></td>
                      <td><strong className="table-primary">{item.location_name || "Lokasi utama"}</strong><small className="table-secondary">{item.location_code}</small></td>
                      <td><strong>{formatNumber(quantity)}</strong> <span className="unit">{getProductUnit(item)}</span></td>
                      <td>{formatNumber(item.min_stock)} <span className="unit">{getProductUnit(item)}</span></td>
                      <td><span className={`status-pill ${low ? "status-pill--warning" : "status-pill--good"}`}><i />{low ? "Perlu dicek" : "Aman"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
