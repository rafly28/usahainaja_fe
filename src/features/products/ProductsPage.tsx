import { useEffect, useState } from "react";
import { Alert, EmptyState } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { formatCurrency, formatNumber } from "../../lib/format";
import { getProductCode, getProductUnit, type Product } from "../../types";
import { ProductForm } from "./ProductForm";
import { api, errorMessage } from "../../lib/api";

export function ProductsPage({
  products,
  error,
  success,
  onCreated,
  onRetry,
}: {
  products: Product[];
  error: string;
  success: string;
  onCreated: (name: string) => Promise<void>;
  onRetry: () => void;
}) {
  const [showForm, setShowForm] = useState(products.length === 0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [serverProducts, setServerProducts] = useState(products);

  useEffect(() => {
    setServerProducts(products);
  }, [products]);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setServerProducts(products);
      return;
    }
    let isMounted = true;
    const handler = setTimeout(() => {
      api.products.list(term).then(res => {
        if (isMounted) setServerProducts(res);
      }).catch(console.error);
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [search, products]);

  const filtered = serverProducts;

  async function created(name: string) {
    await onCreated(name);
    setShowForm(false);
  }

  async function updated(product: Product) {
    await onCreated(product.name); // re-fetches products in parent
    setEditingProduct(null);
  }

  async function remove(product: Product) {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
    try {
      await api.products.delete(getProductCode(product));
      await onCreated(product.name); // re-fetches products in parent
    } catch (caught) {
      alert(errorMessage(caught));
    }
  }

  return (
    <div className="page-stack">
      <div className="page-heading page-heading--split">
        <div><p className="eyebrow">MASTER DATA</p><h1>Produk</h1><p className="muted">Kelola produk, satuan, harga, dan batas stok minimum.</p></div>
        {!showForm && <button className="button button--primary" type="button" onClick={() => setShowForm(true)}><Icon name="plus" size={18} /> Tambah produk</button>}
      </div>

      {success && <Alert tone="success">{success}</Alert>}
      {error && <Alert><p>{error}</p><button className="link-button" type="button" onClick={onRetry}>Coba lagi</button></Alert>}

      {showForm && !editingProduct && (
        <section className="content-card form-card">
          <div className="content-card__header"><div><h2>Produk baru</h2><p>Isi data dasar. Detail dapat dilengkapi nanti.</p></div></div>
          <ProductForm onCreated={created} onCancel={products.length > 0 ? () => setShowForm(false) : undefined} />
        </section>
      )}

      {editingProduct && (
        <section className="content-card form-card">
          <div className="content-card__header"><div><h2>Edit produk</h2><p>Ubah detail produk.</p></div></div>
          <ProductForm product={editingProduct} onCreated={created} onUpdated={updated} onCancel={() => setEditingProduct(null)} />
        </section>
      )}

      <section className="content-card">
        <div className="content-card__header">
          <div><h2>Semua produk</h2><p>{products.length} produk terdaftar.</p></div>
          {products.length > 0 && <label className="search-field"><Icon name="search" size={18} /><span className="sr-only">Cari produk</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk atau SKU" /></label>}
        </div>
        {products.length === 0 ? (
          <EmptyState title="Belum ada produk" description="Tambahkan produk pertama dengan formulir di atas." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Produk tidak ditemukan" description="Coba gunakan kata pencarian lain." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Produk</th><th>Satuan</th><th>Harga beli</th><th>Harga jual</th><th>Stok minimum</th><th>Pelacakan</th><th style={{ width: 80 }}><span className="sr-only">Aksi</span></th></tr></thead>
              <tbody>{filtered.map((product) => (
                <tr key={getProductCode(product)}>
                  <td><div className="product-cell"><span>{product.name.slice(0, 1).toUpperCase()}</span><div><strong>{product.name}</strong><small>{product.sku || getProductCode(product)}</small></div></div></td>
                  <td>{getProductUnit(product)}</td>
                  <td>{formatCurrency(product.default_purchase_price)}</td>
                  <td><strong>{formatCurrency(product.default_selling_price)}</strong></td>
                  <td>{formatNumber(product.min_stock)} {getProductUnit(product)}</td>
                  <td><span className={`status-pill ${product.is_stock_tracked === false ? "" : "status-pill--good"}`}><i />{product.is_stock_tracked === false ? "Tidak" : "Aktif"}</span></td>
                  <td className="actions-cell" style={{ display: "flex", gap: 4 }}>
                    <button className="button button--ghost" type="button" onClick={() => { setEditingProduct(product); setShowForm(false); window.scrollTo(0, 0); }} title="Edit" style={{ padding: 8 }}><Icon name="edit" size={16} /></button>
                    <button className="button button--ghost" type="button" onClick={() => remove(product)} title="Hapus" style={{ padding: 8, color: "var(--color-danger)" }}><Icon name="trash" size={16} /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
