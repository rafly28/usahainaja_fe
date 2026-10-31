import { useEffect, useMemo, useState } from "react";
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
      api.products
        .list(term)
        .then((res) => {
          if (isMounted) setServerProducts(res);
        })
        .catch(console.error);
    }, 300);
    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [search, products]);

  const filtered = serverProducts;

  const categoryCount = useMemo(() => {
    return filtered.filter((p) => Boolean(p.category_name && p.category_name.trim())).length;
  }, [filtered]);

  // Kolom KATEGORI dirender kondisional bila >= 50% baris memiliki nilai
  const showCategoryColumn = filtered.length > 0 && categoryCount / filtered.length >= 0.5;

  async function created(name: string) {
    await onCreated(name);
    setShowForm(false);
  }

  async function updated(product: Product) {
    await onCreated(product.name);
    setEditingProduct(null);
    setShowForm(false);
  }

  async function remove(product: Product) {
    const unit = getProductUnit(product);
    const stockQty = product.min_stock !== undefined ? product.min_stock : 0;
    const confirmed = window.confirm(
      `Hapus "${product.name}"? Stok ${stockQty} ${unit} akan tetap tercatat di riwayat.`
    );
    if (!confirmed) return;

    try {
      await api.products.delete(getProductCode(product));
      await onCreated(product.name);
    } catch (caught) {
      alert(errorMessage(caught));
    }
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">Katalog</span>
          <h1>Produk</h1>
          <p>Nama, satuan, harga jual, dan stok minimum.</p>
        </div>
        <div className="page-head__actions">
          <button
            className="button button--primary"
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setShowForm(true);
            }}
          >
            <Icon name="plus" size={18} /> Tambah produk
          </button>
        </div>
      </div>

      {success && <Alert tone="success">{success}</Alert>}
      {error && (
        <Alert>
          <p>{error}</p>
          <button className="link-button" type="button" onClick={onRetry}>
            Coba lagi
          </button>
        </Alert>
      )}

      <div className={`split ${showForm || editingProduct ? "split--wide-left" : ""}`}>
        <section className="content-card">
          <div className="content-card__header">
            <div>
              <h2>Katalog produk</h2>
              <p>{products.length} produk terdaftar di Lokasi Utama.</p>
            </div>
            {products.length > 0 && (
              <div className="table-tools">
                <label className="search-field">
                  <Icon name="search" size={18} />
                  <span className="sr-only">Cari produk</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama atau SKU"
                  />
                </label>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Belum ada produk"
              description="Tambahkan produk pertama dengan formulir di samping atau tombol di atas."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Produk tidak ditemukan"
              description="Coba gunakan kata pencarian lain."
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Produk</th>
                    {showCategoryColumn && <th scope="col">Kategori</th>}
                    <th scope="col">Satuan</th>
                    <th scope="col" className="num">
                      Harga jual
                    </th>
                    <th scope="col" className="num">
                      Stok minimum
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="actions">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const code = getProductCode(product);
                    const mark = product.name.trim().slice(0, 2).toUpperCase() || "PR";
                    const isTracked = product.is_stock_tracked !== false;
                    return (
                      <tr key={code}>
                        <td>
                          <div className="product-cell">
                            <span className="product-cell__mark">{mark}</span>
                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.sku || code}</small>
                            </div>
                          </div>
                        </td>
                        {showCategoryColumn && <td>{product.category_name || "—"}</td>}
                        <td>{getProductUnit(product)}</td>
                        <td className="num">{formatCurrency(product.default_selling_price)}</td>
                        <td className="num">
                          {formatNumber(product.min_stock ?? 0)}
                          <span className="unit">{getProductUnit(product)}</span>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${isTracked ? "status-pill--ok" : ""}`}
                          >
                            <i />
                            {isTracked ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="actions">
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => {
                              setEditingProduct(product);
                              setShowForm(true);
                            }}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="link-button"
                            style={{
                              color: "var(--action-danger-soft-text, #c92a2a)",
                              marginLeft: "8px",
                            }}
                            onClick={() => remove(product)}
                            title="Hapus"
                          >
                            Hapus
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
              Menampilkan {filtered.length} dari {serverProducts.length} produk.
            </span>
            <span>
              {!showCategoryColumn && filtered.length > 0
                ? `Kolom KATEGORI tidak dirender: ${categoryCount} dari ${filtered.length} baris punya nilai.`
                : ""}
            </span>
          </div>
        </section>

        {(showForm || editingProduct) && (
          <section className="content-card">
            <div className="content-card__header">
              <div>
                <h2>{editingProduct ? "Ubah produk" : "Tambah produk"}</h2>
                <p>Panel form; menjadi drawer di layar sempit.</p>
              </div>
            </div>
            <ProductForm
              product={editingProduct ?? undefined}
              onCreated={created}
              onUpdated={updated}
              onCancel={() => {
                setShowForm(false);
                setEditingProduct(null);
              }}
            />
          </section>
        )}
      </div>
    </div>
  );
}
