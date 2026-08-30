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
    <div className="page-stack page-stack--narrow">
      <div className="page-heading">
        <p className="eyebrow">PERSEDIAAN</p>
        <h1>Catat stok awal</h1>
        <p className="muted">Masukkan jumlah barang yang sudah tersedia sebelum transaksi pertama dicatat.</p>
      </div>
      {success && <Alert tone="success">{success}</Alert>}
      <section className="content-card form-card">
        <div className="content-card__header"><div><h2>Jumlah persediaan saat ini</h2><p>Satu pencatatan untuk setiap produk di setiap lokasi.</p></div></div>
        {products.length === 0 ? (
          <EmptyState title="Produk belum tersedia" description="Buat produk dahulu sebelum mencatat stok awal." action={<button className="button button--primary" type="button" onClick={onGoToProducts}>Buat produk</button>} />
        ) : (
          <OpeningStockForm products={products} defaultLocationCode={business.default_location?.code} onRecorded={onRecorded} />
        )}
      </section>
    </div>
  );
}
