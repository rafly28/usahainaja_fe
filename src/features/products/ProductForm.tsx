import { useEffect, useState, type FormEvent } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import { getProductCode, type Category, type Product } from "../../types";

type ProductFormProps = {
  product?: Product;
  onCreated: (name: string) => Promise<void> | void;
  onUpdated?: (product: Product) => Promise<void> | void;
  onCancel?: () => void;
};

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ProductForm({ product, onCreated, onUpdated, onCancel }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? (product ? getProductCode(product) : "") ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [unit, setUnit] = useState(product?.base_unit_symbol ?? product?.unit_symbol ?? "PCS");
  const [categoryCode, setCategoryCode] = useState(product?.category_code ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchasePrice, setPurchasePrice] = useState(product?.default_purchase_price ? String(product.default_purchase_price) : "");
  const [sellingPrice, setSellingPrice] = useState(product?.default_selling_price ? String(product.default_selling_price) : "");
  const [minStock, setMinStock] = useState(product?.min_stock !== undefined ? String(product.min_stock) : "0");
  const [tracked, setTracked] = useState(product?.is_stock_tracked ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { void api.masterData.categories().then((items) => setCategories(items.filter((item) => item.category_type === "PRODUCT" && item.status === "ACTIVE"))).catch(() => setCategories([])); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Nama produk minimal 2 karakter.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (product && onUpdated) {
        const code = getProductCode(product);
        const updated = await api.products.update(code, {
          name: cleanName,
          sku: sku.trim() || undefined,
          barcode: barcode.trim() || undefined,
          base_unit_symbol: unit.trim().toUpperCase() || "PCS",
          category_code: categoryCode || undefined,
          default_purchase_price: optionalNumber(purchasePrice),
          default_selling_price: optionalNumber(sellingPrice),
          min_stock: optionalNumber(minStock),
          is_stock_tracked: tracked,
        });
        await onUpdated(updated);
      } else {
        await api.products.create({
          name: cleanName,
          sku: sku.trim() || undefined,
          barcode: barcode.trim() || undefined,
          base_unit_symbol: unit.trim().toUpperCase() || "PCS",
          category_code: categoryCode || undefined,
          default_purchase_price: optionalNumber(purchasePrice),
          default_selling_price: optionalNumber(sellingPrice),
          min_stock: optionalNumber(minStock),
          is_stock_tracked: tracked,
        });
        await onCreated(cleanName);
        setName("");
        setSku("");
        setBarcode("");
        setPurchasePrice("");
        setSellingPrice("");
        setMinStock("0");
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-stack product-form" onSubmit={submit}>
      {error && <Alert>{error}</Alert>}
      <div className="form-grid form-grid--2">
        <label className="field field--wide">
          <span>Nama produk *</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Contoh: Kopi susu gula aren"
            required
          />
        </label>
        <label className="field">
          <span>SKU</span>
          <input value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Otomatis jika kosong" />
        </label>
        <label className="field">
          <span>Barcode</span>
          <input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="Opsional" />
        </label>
        <label className="field">
          <span>Satuan dasar *</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value)} required>
            <option value="PCS">PCS — buah</option>
            <option value="KG">KG — kilogram</option>
            <option value="GRAM">GRAM — gram</option>
            <option value="LITER">LITER — liter</option>
            <option value="ML">ML — mililiter</option>
          </select>
        </label>
        <label className="field">
          <span>Kategori</span>
          <select value={categoryCode} onChange={(event) => setCategoryCode(event.target.value)}>
            <option value="">Tanpa kategori</option>
            {categories.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Stok minimum</span>
          <input
            type="number"
            min="0"
            step="any"
            value={minStock}
            onChange={(event) => setMinStock(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Harga beli default</span>
          <div className="input-prefix"><span>Rp</span><input type="number" min="0" step="any" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} placeholder="0" /></div>
        </label>
        <label className="field">
          <span>Harga jual default</span>
          <div className="input-prefix"><span>Rp</span><input type="number" min="0" step="any" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} placeholder="0" /></div>
        </label>
      </div>
      <label className="toggle-field">
        <input type="checkbox" checked={tracked} onChange={(event) => setTracked(event.target.checked)} />
        <span className="toggle" aria-hidden="true" />
        <span><strong>Lacak stok produk</strong><small>Aktifkan untuk produk fisik yang jumlahnya perlu dipantau.</small></span>
      </label>
      <div className="form-actions">
        {onCancel && <button className="button button--secondary" type="button" onClick={onCancel}>Batal</button>}
        <button className="button button--primary button--large" type="submit" disabled={submitting}>
          {submitting ? <Spinner /> : product ? "Simpan Perubahan" : "Simpan Produk"}
        </button>
      </div>
    </form>
  );
}
