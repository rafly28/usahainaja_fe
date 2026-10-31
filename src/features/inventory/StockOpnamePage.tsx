import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, EmptyState, Spinner } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";
import { getProductCode, type InventoryItem, type StockAdjustment } from "../../types";
import { StockAdjustmentDetail } from "./StockAdjustmentDetail";

import { OpnameSheet, type OpnameSheetItem } from "./OpnameSheet";

type CountLine = { product_code: string; counted: string };

/**
 * Stok opname: pengguna memasukkan hasil hitung fisik, server yang menghitung
 * selisih terhadap stok sistem sehingga angka tidak dipercaya dari browser.
 */
export function StockOpnamePage({
  onGoBack,
  businessName,
  businessType,
  businessLogoUrl,
}: {
  onGoBack: () => void;
  businessName?: string;
  businessType?: string;
  businessLogoUrl?: string;
}) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<{ code: string; name: string; is_default?: boolean }[]>([]);
  const [locationCode, setLocationCode] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});

  const [history, setHistory] = useState<StockAdjustment[]>([]);
  const [selected, setSelected] = useState("");
  const [printData, setPrintData] = useState<{
    opname: StockAdjustment;
    items: OpnameSheetItem[];
  } | null>(null);
  const [printingNumber, setPrintingNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const result = await api.inventory.opnames({ limit: 10 });
      setHistory(result.items);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.inventory.listPaged({ limit: 200 });
      setInventory(result.items);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    void loadHistory();
    api.locations
      .list()
      .then((items) => {
        const mapped = (items ?? [])
          .map((location) => ({
            code: location.code ?? location.public_code ?? "",
            name: location.name,
            is_default: location.is_default,
          }))
          .filter((location) => location.code);
        setLocations(mapped);
        const fallback = mapped.find((location) => location.is_default) ?? mapped[0];
        if (fallback) setLocationCode(fallback.code);
      })
      .catch(() => setLocations([]));
  }, [reload, loadHistory]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return inventory;
    return inventory.filter((item) =>
      `${item.name} ${item.product_code ?? ""} ${item.sku ?? ""}`.toLowerCase().includes(term),
    );
  }, [inventory, search]);

  const lines = useMemo<CountLine[]>(
    () =>
      Object.entries(counts)
        .filter(([, value]) => value.trim() !== "")
        .map(([product_code, value]) => ({ product_code, counted: value.trim() })),
    [counts],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!locationCode) {
      setError("Pilih lokasi opname lebih dulu.");
      return;
    }
    if (lines.length === 0) {
      setError("Isi minimal 1 hasil hitung fisik.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const opname = await api.inventory.createOpname({
        location_code: locationCode,
        reason: "CORRECTION",
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({ product_code: line.product_code, counted_quantity: line.counted })),
      });
      await api.inventory.completeOpname(opname.adjustment_number);
      setSuccess(`Opname ${opname.adjustment_number} disimpan dan stok sudah disesuaikan.`);
      setCounts({});
      setNotes("");
      await reload();
      await loadHistory();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  async function complete(opnameNumber: string) {
    setCompleting(opnameNumber);
    setError("");
    try {
      await api.inventory.completeOpname(opnameNumber);
      setSuccess(`Opname ${opnameNumber} diselesaikan.`);
      await reload();
      await loadHistory();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setCompleting("");
    }
  }

  async function handlePrint(opnameNumber: string) {
    setPrintingNumber(opnameNumber);
    setError("");
    try {
      const data = await api.inventory.opname(opnameNumber);
      const mappedItems: OpnameSheetItem[] = (data.items ?? []).map((item) => ({
        productCode: item.product_code,
        productName: item.product_name,
        unitSymbol: item.unit_symbol,
        systemQuantity: item.system_quantity ?? "0",
        countedQuantity: item.counted_quantity ?? "0",
        differenceQuantity: item.quantity ?? "0",
        note: item.direction === "IN" ? "Bertambah" : (item.direction === "OUT" ? "Berkurang" : undefined),
      }));
      setPrintData({
        opname: data,
        items: mappedItems,
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPrintingNumber("");
    }
  }

  function setCount(productCode: string, value: string) {
    setCounts((current) => ({ ...current, [productCode]: value }));
  }

  if (printData) {
    return (
      <OpnameSheet
        storeName={businessName || "Toko UsahainAja"}
        storeType={businessType}
        logoUrl={businessLogoUrl}
        documentNumber={printData.opname.adjustment_number}
        locationLabel={printData.opname.location_code}
        dateLabel={formatDateTime(printData.opname.adjustment_date)}
        actorName={printData.opname.created_by_name || "Staf UsahainAja"}
        status={printData.opname.status}
        notes={printData.opname.notes}
        items={printData.items}
        onBack={() => setPrintData(null)}
      />
    );
  }

  return (
    <div className="page-stack max-w-4xl">
      <div className="page-heading">
        <button className="button button--secondary" onClick={onGoBack} type="button" style={{ padding: "0 12px" }}>
          Kembali
        </button>
        <div>
          <h1>Stok Opname</h1>
          <p className="muted">Cocokkan stok fisik dengan sistem, lalu terapkan selisihnya sebagai penyesuaian.</p>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <form className="content-card form-stack" onSubmit={submit} style={{ padding: 24, gap: 16 }}>
        <div className="form-grid">
          <label className="field">
            <span>Lokasi opname *</span>
            <select required value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
              <option value="">-- Pilih Lokasi --</option>
              {locations.map((location) => (
                <option key={location.code} value={location.code}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Catatan</span>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Misal: opname akhir bulan"
            />
          </label>
        </div>

        <div className="info-note">
          <span aria-hidden="true">i</span>
          Selisih dihitung di server dari stok sistem. Baris yang hasilnya sama dengan sistem diabaikan.
        </div>

        <label className="search-field">
          <Icon name="search" size={18} />
          <span className="sr-only">Cari produk</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari produk yang dihitung"
          />
        </label>

        {loading ? (
          <div className="flex-center" style={{ minHeight: 140 }}>
            <Spinner />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState title="Belum ada barang untuk diopname" description="Pastikan produk sudah dibuat dan stok tercatat." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Stok sistem</th>
                  <th className="text-right">Hitung fisik</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const code = getProductCode(item);
                  return (
                    <tr key={`${code}-${item.location_code ?? ""}`}>
                      <td>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs muted">{code}</div>
                      </td>
                      <td className="text-right">
                        {formatNumber(item.quantity ?? item.stock)} <span className="unit">{item.unit_symbol}</span>
                      </td>
                      <td className="text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          style={{ maxWidth: 140, marginLeft: "auto" }}
                          value={counts[code] ?? ""}
                          onChange={(event) => setCount(code, event.target.value)}
                          placeholder="0"
                          aria-label={`Hasil hitung fisik ${item.name}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <span className="muted text-sm">{lines.length} baris diisi untuk dikirim</span>
          <button type="submit" className="button button--primary" disabled={submitting || lines.length === 0}>
            {submitting ? "Menyimpan..." : "Simpan dan Terapkan"}
          </button>
        </div>
      </form>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <h2>Riwayat opname</h2>
            <p className="muted">Opname yang belum diselesaikan bisa diselesaikan di sini.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => void loadHistory()}>
            Muat ulang
          </button>
        </div>

        {history.length === 0 ? (
          <EmptyState title="Belum ada opname" description="Opname yang dibuat akan tercatat di sini." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Waktu</th>
                  <th>Lokasi</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((opname) => (
                  <tr key={opname.adjustment_number}>
                    <td className="font-medium">{opname.adjustment_number}</td>
                    <td className="muted">{formatDateTime(opname.adjustment_date)}</td>
                    <td>{opname.location_code}</td>
                    <td>{opname.status}</td>
                    <td className="text-right">
                      <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={() => setSelected(selected === opname.adjustment_number ? "" : opname.adjustment_number)}
                        >
                          {selected === opname.adjustment_number ? "Tutup" : "Rincian"}
                        </button>
                        {opname.status === "COMPLETED" && (
                          <button
                            type="button"
                            className="button button--secondary"
                            disabled={printingNumber === opname.adjustment_number}
                            onClick={() => void handlePrint(opname.adjustment_number)}
                          >
                            {printingNumber === opname.adjustment_number ? "Memuat..." : "Cetak"}
                          </button>
                        )}
                        {opname.status === "DRAFT" && (
                          <button
                            type="button"
                            className="button button--primary"
                            disabled={completing === opname.adjustment_number}
                            onClick={() => void complete(opname.adjustment_number)}
                          >
                            {completing === opname.adjustment_number ? "Menyelesaikan..." : "Selesaikan"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && <StockAdjustmentDetail adjustmentNumber={selected} onGoBack={() => setSelected("")} />}
    </div>
  );
}