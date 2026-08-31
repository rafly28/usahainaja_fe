import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Spinner } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { BusinessMember, Category, Location, Party, Unit, UnitConversion } from "../../types";

type Tab = "categories" | "units" | "conversions" | "locations" | "parties" | "members";

const tabs: { id: Tab; label: string }[] = [
  { id: "categories", label: "Kategori" },
  { id: "units", label: "Satuan" },
  { id: "conversions", label: "Konversi" },
  { id: "locations", label: "Lokasi" },
  { id: "parties", label: "Relasi" },
  { id: "members", label: "Tim usaha" },
];

export function MasterDataPage({ role }: { role: string }) {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("PRODUCT");
  const [unitName, setUnitName] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("");
  const [unitType, setUnitType] = useState("COUNT");
  const [fromUnitCode, setFromUnitCode] = useState("");
  const [toUnitCode, setToUnitCode] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("STORE");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationDefault, setLocationDefault] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyType, setPartyType] = useState("PERSON");
  const [partyRelationship, setPartyRelationship] = useState("CUSTOMER");
  const [contactType, setContactType] = useState("WHATSAPP");
  const [contactValue, setContactValue] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("VIEWER");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      api.masterData.categories(),
      api.masterData.units(),
      api.masterData.unitConversions(),
      api.masterData.locations(),
      api.masterData.parties(),
      api.members.list(),
    ]);
    const errors: string[] = [];
    const [categoryResult, unitResult, conversionResult, locationResult, partyResult, memberResult] = results;
    if (categoryResult.status === "fulfilled") setCategories(categoryResult.value);
    else errors.push(errorMessage(categoryResult.reason));
    if (unitResult.status === "fulfilled") setUnits(unitResult.value);
    else errors.push(errorMessage(unitResult.reason));
    if (conversionResult.status === "fulfilled") setConversions(conversionResult.value);
    else errors.push(errorMessage(conversionResult.reason));
    if (locationResult.status === "fulfilled") setLocations(locationResult.value);
    else errors.push(errorMessage(locationResult.reason));
    if (partyResult.status === "fulfilled") setParties(partyResult.value);
    else errors.push(errorMessage(partyResult.reason));
    if (memberResult.status === "fulfilled") setMembers(memberResult.value);
    else errors.push(errorMessage(memberResult.reason));
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

  async function submitConversion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      await api.masterData.createUnitConversion({ from_unit_code: fromUnitCode, to_unit_code: toUnitCode, multiplier });
      setFromUnitCode(""); setToUnitCode(""); setMultiplier(""); setSuccess("Konversi satuan berhasil ditambahkan.");
    });
  }

  async function toggleCategory(item: Category) {
    await submit(async () => {
      const status = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.masterData.updateCategory(item.code, { name: item.name, category_type: item.category_type, parent_code: item.parent_code ?? undefined, status });
      setSuccess(`Kategori ${item.name} ${status === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"}.`);
    });
  }

  async function toggleUnit(item: Unit) {
    await submit(async () => {
      const status = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.masterData.updateUnit(item.code, { name: item.name, symbol: item.symbol, unit_type: item.unit_type, status });
      setSuccess(`Satuan ${item.name} ${status === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"}.`);
    });
  }

  async function toggleLocation(item: Location) {
    await submit(async () => {
      const status = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.masterData.updateLocation(item.code, { name: item.name, type: item.type, address: item.address, is_default: item.is_default, status });
      setSuccess(`Lokasi ${item.name} ${status === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"}.`);
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

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(async () => {
      await api.members.invite({ email: memberEmail, role: memberRole });
      setMemberEmail("");
      setMemberRole("VIEWER");
      setSuccess("Undangan anggota berhasil dibuat. Akun akan dapat masuk setelah diaktifkan.");
    });
  }

  async function updateMember(member: BusinessMember, nextRole: string, nextStatus: string) {
    await submit(async () => {
      await api.members.update(member.user_code, { role: nextRole, status: nextStatus });
      setSuccess(`Akses ${member.name} berhasil diperbarui.`);
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
          list={<CategoryList items={categories} loading={loading} disabled={submitting} onToggle={toggleCategory} />}
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
          list={<UnitList items={units} loading={loading} disabled={submitting} onToggle={toggleUnit} />}
        >
          <form className="form-stack" onSubmit={(event) => void submitUnit(event)}>
            <label className="field"><span>Nama satuan</span><input value={unitName} onChange={(event) => setUnitName(event.target.value)} placeholder="Contoh: Kilogram" required maxLength={100} /></label>
            <label className="field"><span>Simbol</span><input value={unitSymbol} onChange={(event) => setUnitSymbol(event.target.value)} placeholder="Contoh: KG" required maxLength={30} /></label>
            <label className="field"><span>Tipe</span><select value={unitType} onChange={(event) => setUnitType(event.target.value)}><option value="COUNT">Hitungan</option><option value="WEIGHT">Berat</option><option value="VOLUME">Volume</option><option value="TIME">Waktu</option><option value="OTHER">Lainnya</option></select></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Tambah satuan"}</button>
          </form>
        </DataPanel>
      )}

      {tab === "conversions" && (
        <DataPanel title="Konversi satuan" description="Tentukan berapa satuan tujuan yang setara dengan satu satuan asal." list={<ConversionList items={conversions} loading={loading} />}>
          <form className="form-stack" onSubmit={(event) => void submitConversion(event)}>
            <label className="field"><span>Satuan asal</span><select value={fromUnitCode} onChange={(event) => setFromUnitCode(event.target.value)} required><option value="">Pilih satuan</option>{units.filter((unit) => unit.status === "ACTIVE").map((unit) => <option key={unit.code} value={unit.code}>{unit.name} ({unit.symbol})</option>)}</select></label>
            <label className="field"><span>Satuan tujuan</span><select value={toUnitCode} onChange={(event) => setToUnitCode(event.target.value)} required><option value="">Pilih satuan</option>{units.filter((unit) => unit.status === "ACTIVE").map((unit) => <option key={unit.code} value={unit.code}>{unit.name} ({unit.symbol})</option>)}</select></label>
            <label className="field"><span>Multiplier</span><input value={multiplier} onChange={(event) => setMultiplier(event.target.value)} min="0.000001" placeholder="Contoh: 1000" required step="any" type="number" /></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Tambah konversi"}</button>
          </form>
        </DataPanel>
      )}

      {tab === "locations" && (
        <DataPanel
          title="Lokasi"
          description="Atur toko, gudang, booth, atau lokasi event untuk operasional dan stok."
          list={<LocationList items={locations} loading={loading} disabled={submitting} onToggle={toggleLocation} />}
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

      {tab === "members" && (
        <DataPanel
          title="Anggota usaha"
          description="Undang akun yang sudah terdaftar, lalu atur peran dan status aksesnya."
          list={<MemberList items={members} loading={loading} actorRole={role} disabled={submitting} onUpdate={updateMember} />}
        >
          <form className="form-stack" onSubmit={(event) => void submitMember(event)}>
            <label className="field"><span>Email akun terdaftar</span><input value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="nama@email.com" required type="email" /></label>
            <label className="field"><span>Role awal</span><RoleSelect value={memberRole} onChange={setMemberRole} actorRole={role} /></label>
            <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Menyimpan..." : "Undang anggota"}</button>
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

function CategoryList({ items, loading, disabled, onToggle }: { items: Category[]; loading: boolean; disabled: boolean; onToggle: (item: Category) => Promise<void> }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.name}</strong><small>{item.code} · {translateCategory(item.category_type)}</small></div><div className="master-data-row__actions"><Status value={item.status} /><LifecycleButton disabled={disabled} item={item} onToggle={onToggle} /></div></article>)}</ListState>;
}

function UnitList({ items, loading, disabled, onToggle }: { items: Unit[]; loading: boolean; disabled: boolean; onToggle: (item: Unit) => Promise<void> }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.name} <em>{item.symbol}</em></strong><small>{item.code} · {translateUnit(item.unit_type)}</small></div><div className="master-data-row__actions"><Status value={item.status} /><LifecycleButton disabled={disabled} item={item} onToggle={onToggle} /></div></article>)}</ListState>;
}

function ConversionList({ items, loading }: { items: UnitConversion[]; loading: boolean }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={`${item.product_code}-${item.from_unit_code}-${item.to_unit_code}`}><div><strong>{item.from_unit_code} → {item.to_unit_code}</strong><small>1 {item.from_unit_code} = {item.multiplier} {item.to_unit_code}</small></div></article>)}</ListState>;
}

function LocationList({ items, loading, disabled, onToggle }: { items: Location[]; loading: boolean; disabled: boolean; onToggle: (item: Location) => Promise<void> }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.name} {item.is_default && <em>Utama</em>}</strong><small>{item.code} · {translateLocation(item.type)}{item.address ? ` · ${item.address}` : ""}</small></div><div className="master-data-row__actions"><Status value={item.status} /><LifecycleButton disabled={disabled || item.is_default} item={item} onToggle={onToggle} /></div></article>)}</ListState>;
}

function PartyList({ items, loading }: { items: Party[]; loading: boolean }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((item) => <article className="master-data-row" key={item.code}><div><strong>{item.display_name}</strong><small>{item.code} · {item.relationships.map((relationship) => translateRelationship(relationship)).join(", ") || "Belum diberi peran"}</small></div><Status value={item.status} /></article>)}</ListState>;
}

function MemberList({ items, loading, actorRole, disabled, onUpdate }: { items: BusinessMember[]; loading: boolean; actorRole: string; disabled: boolean; onUpdate: (member: BusinessMember, role: string, status: string) => Promise<void> }) {
  return <ListState loading={loading} empty={items.length === 0}>{items.map((member) => <MemberRow key={member.user_code} member={member} actorRole={actorRole} disabled={disabled} onUpdate={onUpdate} />)}</ListState>;
}

function MemberRow({ member, actorRole, disabled, onUpdate }: { member: BusinessMember; actorRole: string; disabled: boolean; onUpdate: (member: BusinessMember, role: string, status: string) => Promise<void> }) {
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState<string>(member.status);
  const ownerProtected = actorRole !== "OWNER" && member.role === "OWNER";
  return <article className="master-data-member"><div><strong>{member.name}</strong><small>{member.email} · {member.user_code}</small></div><div className="master-data-member__controls"><RoleSelect value={role} onChange={setRole} actorRole={actorRole} disabled={ownerProtected || disabled} /><select aria-label={`Status ${member.name}`} value={status} disabled={ownerProtected || disabled} onChange={(event) => setStatus(event.target.value)}><option value="INVITED">Diundang</option><option value="ACTIVE">Aktif</option><option value="INACTIVE">Nonaktif</option></select><button className="button button--secondary" disabled={ownerProtected || disabled || (role === member.role && status === member.status)} onClick={() => void onUpdate(member, role, status)} type="button">Simpan</button></div></article>;
}

function RoleSelect({ value, onChange, actorRole, disabled = false }: { value: string; onChange: (value: string) => void; actorRole: string; disabled?: boolean }) {
  return <select aria-label="Role anggota" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{actorRole === "OWNER" && <option value="OWNER">Owner</option>}<option value="ADMIN">Admin</option><option value="CASHIER">Kasir</option><option value="STAFF">Staf</option><option value="VIEWER">Viewer</option></select>;
}

function Status({ value }: { value: string }) { return <span className={`status-pill ${value === "ACTIVE" ? "status-pill--active" : ""}`}>{value === "ACTIVE" ? "Aktif" : "Nonaktif"}</span>; }
function LifecycleButton<T extends { status: string }>({ item, disabled, onToggle }: { item: T; disabled: boolean; onToggle: (item: T) => Promise<void> }) { return <button className="link-button" disabled={disabled} onClick={() => void onToggle(item)} type="button">{item.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}</button>; }
function translateCategory(value: string) { return ({ PRODUCT: "Produk", SERVICE: "Jasa", ASSET: "Aset", EXPENSE: "Biaya" } as Record<string, string>)[value] ?? value; }
function translateUnit(value: string) { return ({ COUNT: "Hitungan", WEIGHT: "Berat", VOLUME: "Volume", TIME: "Waktu", OTHER: "Lainnya" } as Record<string, string>)[value] ?? value; }
function translateLocation(value: string) { return ({ STORE: "Toko", WAREHOUSE: "Gudang", BOOTH: "Booth", EVENT_VENUE: "Lokasi event", OTHER: "Lainnya" } as Record<string, string>)[value] ?? value; }
function translateRelationship(value: string) { return ({ CUSTOMER: "Pelanggan", SUPPLIER: "Pemasok", PARTNER: "Partner", CLIENT: "Klien", TALENT: "Talent", EMPLOYEE: "Karyawan", OTHER: "Lainnya" } as Record<string, string>)[value] ?? value; }
