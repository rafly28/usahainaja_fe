import { useState, useMemo } from "react";
import { EmptyState, SkeletonRows } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { formatCurrency } from "../../lib/format";

export interface PurchaseDoc {
  purchase_number: string;
  purchase_date: string;
  supplier_name?: string;
  status: string;
  payment_status?: string;
  grand_total: string;
  item_count?: number;
}

export function PurchasesListSection({
  purchases,
  loading,
}: {
  purchases: PurchaseDoc[];
  loading: boolean;
}) {
  const [purchaseSearch, setPurchaseSearch] = useState("");

  const filteredPurchases = useMemo(() => {
    const term = purchaseSearch.trim().toLowerCase();
    if (!term) return purchases;
    return purchases.filter(
      (p) =>
        p.purchase_number.toLowerCase().includes(term) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(term))
    );
  }, [purchases, purchaseSearch]);

  function getStatusBadge(status: string) {
    const s = status.toUpperCase();
    if (s === "RECEIVED" || s === "COMPLETED" || s === "PAID") {
      return (
        <span className="status-pill status-pill--ok">
          <i />
          Diterima
        </span>
      );
    }
    if (s === "PARTIAL") {
      return (
        <span className="status-pill status-pill--warn">
          <i />
          Sebagian
        </span>
      );
    }
    return (
      <span className="status-pill status-pill--neutral">
        <i />
        Draf
      </span>
    );
  }

  return (
    <section className="content-card">
      <div className="content-card__header">
        <div>
          <h2>Daftar pembelian</h2>
          <p>{purchases.length} dokumen pembelian terdaftar.</p>
        </div>
        <div className="search-field" style={{ width: "240px" }}>
          <Icon name="search" size={16} />
          <input
            placeholder="Cari nomor atau supplier"
            value={purchaseSearch}
            onChange={(e) => setPurchaseSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Nomor</th>
              <th scope="col">Supplier</th>
              <th scope="col">Tanggal</th>
              <th scope="col" className="num">
                Total
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows columns={5} rows={3} />
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 0 }}>
                  <EmptyState
                    title="Belum ada dokumen pembelian"
                    description="Pilih produk pada formulir di bawah untuk membuat draf restock baru."
                  />
                </td>
              </tr>
            ) : (
              filteredPurchases.slice(0, 5).map((p) => (
                <tr key={p.purchase_number}>
                  <td className="doc-no">
                    <strong>{p.purchase_number}</strong>
                  </td>
                  <td>{p.supplier_name || "Tanpa supplier"}</td>
                  <td>
                    {p.purchase_date
                      ? new Date(p.purchase_date).toLocaleDateString("id-ID")
                      : "-"}
                  </td>
                  <td className="num">{formatCurrency(p.grand_total)}</td>
                  <td>{getStatusBadge(p.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredPurchases.length > 0 && (
        <div className="table-footer">
          <span>
            Menampilkan {Math.min(5, filteredPurchases.length)} dari{" "}
            {filteredPurchases.length} dokumen.
          </span>
        </div>
      )}
    </section>
  );
}
