import { useEffect, useState } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";

type ReceiptItem = {
  line_number: number;
  product_code: string;
  product_name: string;
  quantity: string;
  unit_price?: string;
  discount?: string;
  subtotal: string;
};

type Receipt = {
  receipt_number?: string;
  purchase_number?: string;
  reference_number?: string;
  status: string;
  payment_status?: string;
  location_code?: string;
  grand_total: string;
  paid_total?: string;
  outstanding_total?: string;
  purchase_date?: string;
  sale_date?: string;
  notes?: string;
  items?: ReceiptItem[];
  receipts?: { receipt_number: string; received_at: string }[];
};

/**
 * Dokumen transaksi memakai nomor publik, bukan UUID internal, sehingga dapat
 * dibuka langsung dari struk atau riwayat.
 */
export function ReceiptPage({
  documentNumber,
  documentType,
  onGoBack,
}: {
  documentNumber: string;
  documentType: "sale" | "purchase";
  onGoBack: () => void;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    const call =
      documentType === "sale"
        ? api.sales.receipt(documentNumber)
        : api.purchases.receipt(documentNumber);
    call
      .then((payload) => {
        if (mounted) setReceipt((payload as { receipt: Receipt }).receipt);
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
  }, [documentNumber, documentType]);

  const documentLabel = documentType === "sale" ? "Struk Penjualan" : "Konfirmasi Pembelian";

  return (
    <div className="page-stack max-w-3xl">
      <div className="page-heading">
        <button className="button button--secondary" onClick={onGoBack} type="button" style={{ padding: "0 12px" }}>
          Kembali
        </button>
        <div>
          <h1>{documentLabel}</h1>
          <p className="muted">Nomor {documentNumber}</p>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="flex-center" style={{ minHeight: 200 }}>
          <Spinner />
        </div>
      ) : receipt ? (
        <div className="content-card form-stack" style={{ padding: 24, gap: 16 }}>
          <div className="form-grid">
            <div>
              <span className="muted text-sm">Nomor dokumen</span>
              <p className="font-medium">{receipt.receipt_number ?? receipt.purchase_number}</p>
            </div>
            <div>
              <span className="muted text-sm">Waktu</span>
              <p>{formatDateTime(receipt.sale_date ?? receipt.purchase_date ?? "")}</p>
            </div>
            <div>
              <span className="muted text-sm">Status</span>
              <p>{receipt.status}</p>
            </div>
            <div>
              <span className="muted text-sm">Status pembayaran</span>
              <p>{receipt.payment_status ?? "-"}</p>
            </div>
            {receipt.reference_number && (
              <div>
                <span className="muted text-sm">Referensi supplier</span>
                <p>{receipt.reference_number}</p>
              </div>
            )}
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Kuantitas</th>
                  <th className="text-right">Harga</th>
                  <th className="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(receipt.items ?? []).map((item) => (
                  <tr key={`${item.product_code}-${item.line_number}`}>
                    <td>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs muted">{item.product_code}</div>
                    </td>
                    <td className="text-right">{formatNumber(item.quantity)}</td>
                    <td className="text-right">{formatNumber(item.unit_price ?? 0)}</td>
                    <td className="text-right">{formatNumber(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <div>
              <span className="muted text-sm">Total</span>{" "}
              <strong>{formatNumber(receipt.grand_total)}</strong>
            </div>
            {receipt.paid_total && (
              <div>
                <span className="muted text-sm">Sudah dibayar</span> <strong>{formatNumber(receipt.paid_total)}</strong>
              </div>
            )}
            {receipt.outstanding_total && (
              <div>
                <span className="muted text-sm">Sisa tagihan</span>{" "}
                <strong className="color-danger">{formatNumber(receipt.outstanding_total)}</strong>
              </div>
            )}
          </div>

          {receipt.receipts && receipt.receipts.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 8 }}>Riwayat penerimaan barang</h3>
              <ul className="muted text-sm" style={{ paddingLeft: 18, margin: 0 }}>
                {receipt.receipts.map((item) => (
                  <li key={item.receipt_number}>
                    {item.receipt_number} · {formatDateTime(item.received_at)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}