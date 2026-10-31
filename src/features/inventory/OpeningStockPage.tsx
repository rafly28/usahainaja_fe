import { Alert, EmptyState } from "../../components/Feedback";
import type { Business, Product } from "../../types";
import { OpeningStockForm } from "./OpeningStockForm";

export function OpeningStockPage({
  products,
  business,
  success,
  onRecorded,
  onGoToProducts,
}: {
  products: Product[];
  business: Business;
  success: string;
  onRecorded: (name: string) => Promise<void>;
  onGoToProducts: () => void;
}) {
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">Inventaris</span>
          <h1>Stok awal</h1>
          <p>Saldo pembuka per lokasi, tercatat sebagai gerakan stok OPENING_BALANCE.</p>
        </div>
        <div className="page-head__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onGoToProducts}
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="alert alert--info" style={{ marginBottom: "var(--space-5)" }}>
        Pencatatan stok awal membuat riwayat gerakan stok dan tidak dapat ditimpa. Untuk
        memperbaiki saldo, gunakan penyesuaian stok setelah ini.
      </div>

      {success && <Alert tone="success">{success}</Alert>}

      {products.length === 0 ? (
        <section className="content-card">
          <EmptyState
            title="Produk belum tersedia"
            description="Buat produk dahulu sebelum mencatat stok awal."
            action={
              <button
                className="button button--primary"
                type="button"
                onClick={onGoToProducts}
              >
                Buat produk
              </button>
            }
          />
        </section>
      ) : (
        <OpeningStockForm
          products={products}
          business={business}
          onRecorded={onRecorded}
          onCancel={onGoToProducts}
        />
      )}
    </div>
  );
}
