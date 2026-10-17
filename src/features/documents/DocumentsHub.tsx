import { useCallback, useEffect, useState } from "react";
import { Alert, EmptyState, Spinner } from "../../components/Feedback";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";

type DocumentRow = { number: string; date: string; status: string; grand_total: string };

export type OpenDocumentHandler = (document: { number: string; type: "sale" | "purchase" }) => void;

/**
 * Pusat dokumen transaksi. Nomor dokumen yang dipakai adalah nomor publik
 * (receipt/purchase number), bukan UUID internal.
 */
export function DocumentsHub({
  onOpenDocument,
  onGoBack,
}: {
  onOpenDocument: OpenDocumentHandler;
  onGoBack: () => void;
}) {
  const [sales, setSales] = useState<DocumentRow[]>([]);
  const [purchases, setPurchases] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [saleItems, purchaseItems] = await Promise.all([
        api.sales.list({ limit: 25 }),
        api.purchases.list({ limit: 25 }),
      ]);
      setSales(
        saleItems.map((sale) => ({
          number: sale.receipt_number,
          date: sale.sale_date,
          status: sale.status,
          grand_total: sale.grand_total,
        })),
      );
      setPurchases(
        purchaseItems.map((purchase) => ({
          number: purchase.purchase_number,
          date: purchase.purchase_date,
          status: purchase.status,
          grand_total: purchase.grand_total,
        })),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tables = [
    {
      title: "Penjualan",
      rows: sales,
      type: "sale" as const,
      empty: "Belum ada transaksi penjualan.",
    },
    {
      title: "Pembelian",
      rows: purchases,
      type: "purchase" as const,
      empty: "Belum ada transaksi pembelian.",
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-heading">
        <button className="button button--secondary" onClick={onGoBack} type="button" style={{ padding: "0 12px" }}>
          Kembali
        </button>
        <div>
          <h1>Dokumen Transaksi</h1>
          <p className="muted">Buka struk penjualan atau konfirmasi pembelian memakai nomor dokumen.</p>
        </div>
        <button type="button" className="button button--secondary" onClick={() => void load()}>
          Muat ulang
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="flex-center" style={{ minHeight: 200 }}>
          <Spinner />
        </div>
      ) : (
        tables.map((table) => (
          <section className="content-card" key={table.title}>
            <div className="content-card__header">
              <div>
                <h2>{table.title}</h2>
                <p className="muted">{table.rows.length} dokumen terbaru</p>
              </div>
            </div>

            {table.rows.length === 0 ? (
              <EmptyState title={`Belum ada dokumen ${table.title.toLowerCase()}`} description={table.empty} />
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nomor</th>
                      <th>Waktu</th>
                      <th>Status</th>
                      <th className="text-right">Total</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row) => (
                      <tr key={`${table.type}-${row.number}`}>
                        <td className="font-medium">{row.number}</td>
                        <td className="muted">{formatDateTime(row.date)}</td>
                        <td>{row.status}</td>
                        <td className="text-right">{formatNumber(row.grand_total)}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="button button--secondary"
                            onClick={() => onOpenDocument({ number: row.number, type: table.type })}
                          >
                            Buka
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}