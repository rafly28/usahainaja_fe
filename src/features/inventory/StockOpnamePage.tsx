import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Alert, EmptyState, SkeletonRows, Spinner } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { formatDateTime, formatNumber } from "../../lib/format";
import { api, errorMessage } from "../../lib/api";
import { getProductCode, type InventoryItem, type StockAdjustment } from "../../types";
import { StockAdjustmentDetail } from "./StockAdjustmentDetail";
import { OpnameSheet, type OpnameSheetItem } from "./OpnameSheet";

type CountLine = { product_code: string; counted: string };

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

  // Stats calculation
  const filledCount = lines.length;
  const totalCount = inventory.length;
  const diffCount = useMemo(() => {
    let diffs = 0;
    for (const item of inventory) {
      const code = getProductCode(item);
      const val = counts[code]?.trim();
      if (val !== undefined && val !== "") {
        const physical = Number(val);
        const system = Number(item.quantity ?? item.stock ?? 0);
        if (Math.abs(physical - system) > 0.0001) {
          diffs++;
        }
      }
    }
    return diffs;
  }, [inventory, counts]);

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

    if (diffCount > 0 && !window.confirm(`Terapkan opname untuk ${lines.length} baris dengan ${diffCount} baris selisih?`)) {
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

  function calculateDiff(systemQty: number, val: string | undefined, unit: string) {
    if (val === undefined || val.trim() === "") {
      return <span style={{ color: "var(--text-faint)" }}>-</span>;
    }
    const physical = Number(val);
    const diff = physical - systemQty;
    if (Math.abs(diff) < 0.0001) {
      return <span style={{ color: "var(--text-muted)" }}>Sama (0)</span>;
    }
    const formatted = formatNumber(Math.abs(diff));
    if (diff > 0) {
      return (
        <span style={{ color: "var(--status-ok-text)", fontWeight: 600 }}>
          +{formatted} {unit}
        </span>
      );
    }
    return (
      <span style={{ color: "var(--status-danger-text)", fontWeight: 600 }}>
        −{formatted} {unit}
      </span>
    );
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
    <div className="content-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">INVENTORI</p>
          <h1>Stok Opname</h1>
          <p className="muted">Cocokkan stok fisik dengan sistem, lalu terapkan selisihnya sebagai penyesuaian.</p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => {
            if (lines.length > 0 && !window.confirm("Ada hasil hitung yang belum disimpan. Kembali?")) {
              return;
            }
            onGoBack();
          }}
          type="button"
        >
          Kembali
        </button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="alert alert--info">
        Selisih dihitung di server dari stok sistem. Baris yang hasilnya sama dengan sistem diabaikan. Kolom selisih merupakan pratinjau klien.
      </div>

      <form className="content-card form-stack" onSubmit={submit} style={{ padding: "var(--space-5)", gap: "var(--space-4)" }}>
        <div className="form-grid-2">
          <label className="field">
            <span>Lokasi opname <em>*</em></span>
            {locations.length === 1 && locations[0] ? (
              <span className="readonly-box">
                {locations[0].name}
                <small>satu-satunya lokasi</small>
              </span>
            ) : (
              <select required value={locationCode} onChange={(event) => setLocationCode(event.target.value)}>
                <option value="">-- Pilih Lokasi --</option>
                {locations.map((location) => (
                  <option key={location.code} value={location.code}>
                    {location.name}
                  </option>
                ))}
              </select>
            )}
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

        <div className="search-field" style={{ maxWidth: "420px" }}>
          <Icon name="search" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari produk yang dihitung..."
          />
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Produk</th>
                <th scope="col" className="num">Stok Sistem</th>
                <th scope="col" className="num" style={{ minWidth: "150px" }}>Hitung Fisik</th>
                <th scope="col" className="num">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows columns={4} rows={4} />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 0 }}>
                    <EmptyState
                      title="Belum ada barang untuk diopname"
                      description="Pastikan produk sudah dibuat dan stok tercatat."
                    />
                  </td>
                </tr>
              ) : (
                visible.map((item) => {
                  const code = getProductCode(item);
                  const systemQty = Number(item.quantity ?? item.stock ?? 0);
                  const unit = item.unit_symbol || "PCS";
                  return (
                    <tr key={`${code}-${item.location_code ?? ""}`}>
                      <td>
                        <strong>{item.name}</strong>
                        <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                          {item.sku || code}
                        </div>
                      </td>
                      <td className="num">
                        {formatNumber(systemQty)} <span className="unit">{unit}</span>
                      </td>
                      <td className="num">
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            className="summary-input num"
                            style={{ width: "90px" }}
                            value={counts[code] ?? ""}
                            onChange={(event) => setCount(code, event.target.value)}
                            placeholder="Isi hasil hitung"
                            aria-label={`Hitung fisik ${item.name}`}
                          />
                          <span className="unit">{unit}</span>
                        </div>
                      </td>
                      <td className="num" aria-live="polite">
                        {calculateDiff(systemQty, counts[code], unit)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="counter-bar">
          <span>
            {filledCount} dari {totalCount} baris terisi · {diffCount} baris berubah
          </span>
          <button
            type="submit"
            className="button button--primary"
            disabled={submitting || lines.length === 0}
          >
            {submitting && <Spinner />} Simpan dan Terapkan
          </button>
        </div>
      </form>

      <section className="content-card">
        <div className="content-card__header">
          <div>
            <h2>Riwayat opname</h2>
            <p>Daftar opname yang pernah dilakukan pada usaha aktif.</p>
          </div>
          <button type="button" className="button button--ghost" onClick={() => void loadHistory()}>
            Muat ulang
          </button>
        </div>

        {history.length === 0 ? (
          <EmptyState title="Belum ada opname" description="Opname yang dibuat akan tercatat di sini." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Nomor</th>
                  <th scope="col">Waktu</th>
                  <th scope="col">Lokasi</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="actions">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {history.map((opname) => (
                  <tr key={opname.adjustment_number}>
                    <td className="doc-no"><strong>{opname.adjustment_number}</strong></td>
                    <td>{formatDateTime(opname.adjustment_date)}</td>
                    <td>{opname.location_code}</td>
                    <td>
                      {opname.status === "COMPLETED" ? (
                        <span className="status-pill status-pill--ok"><i aria-hidden="true" />Selesai</span>
                      ) : (
                        <span className="status-pill status-pill--neutral"><i aria-hidden="true" />Draf</span>
                      )}
                    </td>
                    <td className="actions">
                      <div style={{ display: "inline-flex", gap: "6px" }}>
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