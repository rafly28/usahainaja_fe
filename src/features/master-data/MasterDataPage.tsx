import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Category, Location, Party, Unit } from "../../types";

type Tab = "categories" | "units" | "locations" | "parties";

const tabs: { id: Tab; label: string }[] = [
  { id: "categories", label: "Kategori" },
  { id: "units", label: "Satuan" },
  { id: "locations", label: "Lokasi" },
  { id: "parties", label: "Relasi" },
];

export function MasterDataPage() {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("PRODUCT");
  const [unitName, setUnitName] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("");
  const [unitType, setUnitType] = useState("COUNT");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("STORE");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationDefault, setLocationDefault] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyType, setPartyType] = useState("PERSON");
  const [partyRelationship, setPartyRelationship] = useState("CUSTOMER");
  const [contactType, setContactType] = useState("WHATSAPP");
  const [contactValue, setContactValue] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.masterData.categories(),
      api.masterData.units(),
      api.masterData.locations(),
      api.masterData.parties(),
    ]);
    const errors: string[] = [];
    const [categoryResult, unitResult, locationResult, partyResult] = results;
    if (categoryResult.status === "fulfilled") setCategories(categoryResult.value);
    else errors.push(errorMessage(categoryResult.reason));
    if (unitResult.status === "fulfilled") setUnits(unitResult.value);
    else errors.push(errorMessage(unitResult.reason));
    if (locationResult.status === "fulfilled") setLocations(locationResult.value);
    else errors.push(errorMessage(locationResult.reason));
    if (partyResult.status === "fulfilled") setParties(partyResult.value);
    else errors.push(errorMessage(partyResult.reason));
    if (errors.length > 0) setError([...new Set(errors)].join(" "));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function selectTab(next: Tab) {
    setTab(next);
    setSuccess("");
    setError("");
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      await api.masterData.createCategory({ name: categoryName, category_type: categoryType });
      setCategoryName("");
      setSuccess("Kategori berhasil ditambahkan.");
    });
  }

  async function submitUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      await api.masterData.createUnit({ name: unitName, symbol: unitSymbol, unit_type: unitType });
      setUnitName("");
      setUnitSymbol("");
      setSuccess("Satuan berhasil ditambahkan.");
    });
  }

  async function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      await api.masterData.createLocation({
        name: locationName,
        type: locationType,
        address: locationAddress,
        is_default: locationDefault,
      });
      setLocationName("");
      setLocationAddress("");
      setLocationDefault(false);
      setSuccess("Lokasi berhasil ditambahkan.");
    });
  }

  async function submitParty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      await api.masterData.createParty({
        party_type: partyType,
        display_name: partyName,
        relationships: partyRelationship ? [partyRelationship] : [],
        contacts: contactValue
          ? [{ type: contactType, value: contactValue, is_primary: true }]
          : [],
      });
      setPartyName("");
      setContactValue("");
      setSuccess("Relasi usaha berhasil ditambahkan.");
    });
  }

  async function submit(action: () => Promise<void>) {
    setSubmitting(true);
    setError("");
    try {
      await action();
      await load();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-section master-data-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRASI USAHA</p>
          <h1>Data usaha</h1>
          <p>Kelola referensi yang dipakai oleh produk, stok, serta transaksi usaha Anda.</p>
        </div>
      </div>

      <div className="master-data-tabs" role="tablist" aria-label="Jenis data usaha">
        {tabs.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : ""}
            key={item.id}
            onClick={() => selectTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <Alert>{error}</Alert>}
      {success && <div className="success-banner" role="status">{success}</div>}

      {tab === "categories" && (
        <DataPanel
          title="Kategori"
          description="Kelompokkan produk, jasa, aset, atau biaya untuk pelaporan yang rapi."
          list={<CategoryList items={categories} loading={loading} />}
        >
          <form className="form-stack" onSubmit={(event) => void submitCategory(event)}>
            <label className="field"><span>Nama kategori</span><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Contoh: Minuman dingin" required maxLength={150} /></label>
            <label className="field"><span>Tipe</span><select value={categoryType} onChange={(event) => setCategoryType(event.target.value)}><option value="PRODUCT">Produk</option><option value="SERVICE">Jasa</option><option value="ASSET">Aset</option><option value="EXPENSE">Biaya</option></select></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Tambah kategori"}</button>
          </form>
        </DataPanel>
      )}

      {tab === "units" && (
        <DataPanel
          title="Satuan"
          description="Tetapkan satuan baku seperti pcs, kg, liter, atau jam."
          list={<UnitList items={units} loading={loading} />}
        >
          <form className="form-stack" onSubmit={(event) => void submitUnit(event)}>
            <label className="field"><span>Nama satuan</span><input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Contoh: Kilogram" required maxLength={100} /></label>
            <label className="field"><span>Simbol</span><input value={unitSymbol} onChange={(event) => setUnitSymbol(event.target.value)} placeholder="Contoh: KG" required maxLength={30} /></label>
            <label className="field"><span>Tipe</span><select value={unitType} onChange={(event) => setUnitType(event.target.value)}><option value="COUNT">Hitungan</option><option value="WEIGHT">Berat</option><option value="VOLUME">Volume</option><option value="TIME">Waktu</option><option value="OTHER">Lainnya</option></select></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Tambah satuan"}</button>
          </form>
        </DataPanel>
      )}

      {tab === "locations" && (
        <DataPanel
          title="Lokasi"
          description="Atur toko, gudang, booth, atau lokasi event untuk operasional dan stok."
          list={<LocationList items={locations} loading={loading} />}
        >
          <form className="form-stack" onSubmit={(event) => void submitLocation(event)}>
            <label className="field"><span>Nama lokasi</span><input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="Contoh: Toko utama" required maxLength={150} /></label>
            <label className="field"><span>Tipe</span><select value={locationType} onChange={(event) => setLocationType(event.target.value)}><option value="STORE">Toko</option><option value="WAREHOUSE">Gudang</option><option value="BOOTH">Booth</option><option value="EVENT_VENUE">Lokasi event</option><option value="OTHER">Lainnya</option></select></label>
            <label className="field"><span>Alamat (opsional)</span><textarea value={locationAddress} onChange={(event) => setLocationAddress(event.target.value)} placeholder="Alamat singkat lokasi" /></label>
            <label className="toggle-field"><input checked={locationDefault} onChange={(event) => setLocationDefault(event.target.checked)} type="checkbox" /><span className="toggle" /><span><strong>Jadikan lokasi utama</strong><small>Lokasi utama dipilih otomatis pada alur stok.</small></span></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Tambah lokasi"}</button>
          </form>
        </DataPanel>
      )}

      {tab === "parties" && (
        <DataPanel
          title="Relasi usaha"
          description="Simpan pelanggan, pemasok, partner, atau pihak lain yang terlibat dalam usaha."
          list={<PartyList items={parties} loading={loading} />}
        >
          <form className="form-stack" onSubmit={(event) => void submitParty(event)}>
            <label className="field"><span>Nama tampilan</span><input value={partyName} onChange={(event) => setPartyName(event.target.value)} placeholder="Contoh: Toko Maju Jaya" required maxLength={150} /></label>
            <label className="field"><span>Jenis pihak</span><select value={partyType} onChange={(event) => setPartyType(event.target.value)}><option value="PERSON">Perorangan</option><option value="ORGANIZATION">Organisasi</option></select></label>
            <label className="field"><span>Peran relasi</span><select value={partyRelationship} onChange={(event) => setPartyRelationship(event.target.value)}><option value="CUSTOMER">Pelanggan</option><option value="SUPPLIER">Pemasok</option><option value="PARTNER">Partner</option><option value="CLIENT">Klien</option><option value="TALENT">Talent</option><option value="EMPLOYEE">Karyawan</option><option value="OTHER">Lainnya</option></select></label>
            <label className="field"><span>Kontak (opsional)</span><div className="master-data-contact"><select value={contactType} onChange={(event) => setContactType(event.target.value)}><option value="WHATSAPP">WhatsApp</option><option value="PHONE">Telepon</option><option value="EMAIL">Email</option><option value="OTHER">Lainnya</option></select><input value={contactValue} onChange={(event) => setContactValue(event.target.value)} placeholder="Nomor atau email" /></div></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Tambah relasi"}</button>
          </form>
        </DataPanel>
      )}
    </section>
  );
}

function DataPanel({ title, description, children, list }: { title: string; description: string; children: ReactNode; list: ReactNode }) {
  return <div className="master-data-grid"><section className="content-card master-data-form"><header className="content-card__header"><div><h2>Tambah {title.toLowerCase()}</h2><p>{description}</p></div></header><div className="master-data-form__body">{children}</div></section><section className="content-card master-data-list"><header className="content-card__header"><div><h2>Daftar {title.toLowerCase()}</h2><p>Data terpisah untuk setiap usaha aktif.</p></div></header>{list}</section></div>;
}

function ListState({ loading, empty, children }: { loading: boolean; empty: boolean; children: ReactNode }) {
  if (loading) return <div className="master-data-list__state"><Spinner label="Memuat data" /></div>;
  if (empty) return <div className="master-data-list__state">Belum ada data. Tambahkan data pertama Anda dari formulir di sebelah kiri.</div>;
  return <div className="master-data-list__items">{children}</div>;
}

function CategoryList({ items, loading }: { items: Category[]; loading: boolean }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.name}</strong><small>{item.code} · {translateCategory(item.category_type)}</small></div><Status value={item.status} /></article>)}</ListState>;
}

function UnitList({ items, loading }: { items: Unit[]; loading: boolean }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.name} <em>{item.symbol}</em></strong><small>{item.code} · {translateUnit(item.unit_type)}</small></div><Status value={item.status} /></article>)}</ListState>;
}

function LocationList({ items, loading }: { items: Location[]; loading: boolean }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.name} {item.is_default && <em>Utama</em>}</strong><small>{item.code} · {translateLocation(item.type)}{item.address ? ` · ${item.address}` : ""}</small></div><Status value={item.status} /></article>)}</ListState>;
}

function PartyList({ items, loading }: { items: Party[]; loading: boolean }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.display_name}</strong><small>{item.code} · {item.relationships.map((relationship) => translateRelationship(relationship)).join(", ") || "Belum diberi peran"}</small></div><Status value={item.status} /></article>)}</ListState>;
}

function Status({ value }: { value: string }) { return <span className={`status-pill ${value === "ACTIVE" ? "status-pill--active" : ""}`}>{value === "ACTIVE" ? "Aktif" : "Nonaktif"}</span>; }
function translateCategory(value: string) { return ({ PRODUCT: "Produk", SERVICE: "Jasa", ASSET: "Aset", EXPENSE: "Biaya" } as Record<string, string>)[value] ?? value; }
function translateUnit(value: string) { return ({ COUNT: "Hitungan", WEIGHT: "Berat", VOLUME: "Volume", TIME: "Waktu", OTHER: "Lainnya" } as Record<string, string>)[value] ?? value; }
function translateLocation(value: string) { return ({ STORE: "Toko", WAREHOUSE: "Gudang", BOOTH: "Booth", EVENT_VENUE: "Lokasi event", OTHER: "Lainnya" } as Record<string, string>)[value] ?? value; }
function translateRelationship(value: string) { return ({ CUSTOMER: "Pelanggan", SUPPLIER: "Pemasok", PARTNER: "Partner", CLIENT: "Klien", TALENT: "Talent", EMPLOYEE: "Karyawan", OTHER: "Lainnya" } as Record<string, string>)[value] ?? value; }
