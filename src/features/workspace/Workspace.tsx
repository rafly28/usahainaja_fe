import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../../components/Brand";
import { Alert, LoadingPage, Spinner } from "../../components/Feedback";
import { Icon } from "../../components/Icons";
import { api, errorMessage } from "../../lib/api";
import {
  getBusinessCode,
  type Business,
  type InventoryItem,
  type Product,
  type User,
} from "../../types";
import { InventoryDashboard } from "../inventory/InventoryDashboard";
import { OpeningStockPage } from "../inventory/OpeningStockPage";
import { ProductsPage } from "../products/ProductsPage";
import { StockMovementsPage } from "../inventory/StockMovementsPage";
import { StockAdjustmentsPage } from "../inventory/StockAdjustmentsPage";
import { BusinessProfileDashboard } from "../business/BusinessProfileDashboard";
import { BusinessSettings } from "../business/BusinessSettings";
import { getBusinessProfile, getEnabledModules, isModuleEnabled } from "../business/businessProfile";
import { MasterDataPage } from "../master-data/MasterDataPage";

type View = "dashboard" | "products" | "opening-stock" | "movements" | "adjustments" | "business-settings" | "master-data";
type NavigationItem = { id: View; label: string; icon: "home" | "box" | "plus" | "edit" };

export function Workspace({
  user,
  activeBusiness,
  businesses,
  onSwitchBusiness,
  onBusinessUpdated,
  onLogout,
}: {
  user: User;
  activeBusiness: Business;
  businesses: Business[];
  onSwitchBusiness: (code: string) => Promise<void>;
  onBusinessUpdated: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [view, setView] = useState<View>("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [success, setSuccess] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [switchingBusiness, setSwitchingBusiness] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeCode = getBusinessCode(activeBusiness);
  const enrichedBusiness = useMemo(
    () => businesses.find((business) => getBusinessCode(business) === activeCode) ?? activeBusiness,
    [activeBusiness, activeCode, businesses],
  );
  const profile = getBusinessProfile(enrichedBusiness.business_type);
  const enabledModules = getEnabledModules(enrichedBusiness);
  const catalogEnabled = isModuleEnabled(enabledModules, "CATALOG");
  const inventoryEnabled = isModuleEnabled(enabledModules, "INVENTORY");
  const navItems = useMemo<NavigationItem[]>(() => {
    const items: NavigationItem[] = [{ id: "dashboard", label: "Ringkasan", icon: "home" }];
    if (catalogEnabled) items.push({ id: "products", label: "Produk", icon: "box" });
    if (inventoryEnabled) items.push({ id: "opening-stock", label: "Stok awal", icon: "plus" });
    if (["OWNER", "ADMIN"].includes(enrichedBusiness.role ?? activeBusiness.role ?? "")) {
      items.push({ id: "master-data", label: "Data usaha", icon: "edit" });
      items.push({ id: "business-settings", label: "Pengaturan", icon: "edit" });
    }
    return items;
  }, [activeBusiness.role, catalogEnabled, enrichedBusiness.role, inventoryEnabled]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setDataError("");
    const [productResult, inventoryResult] = await Promise.allSettled([
      catalogEnabled ? api.products.list() : Promise.resolve([] as Product[]),
      inventoryEnabled ? api.inventory.list() : Promise.resolve([] as InventoryItem[]),
    ]);

    const errors: string[] = [];
    if (productResult.status === "fulfilled") setProducts(productResult.value);
    else errors.push(errorMessage(productResult.reason));
    if (inventoryResult.status === "fulfilled") setInventory(inventoryResult.value);
    else errors.push(errorMessage(inventoryResult.reason));

    if (errors.length > 0) setDataError([...new Set(errors)].join(" "));
    setLoading(false);
  }, [catalogEnabled, inventoryEnabled]);

  useEffect(() => {
    void loadData();
  }, [activeCode, loadData]);

  useEffect(() => {
    if ((view === "products" && !catalogEnabled) || (view === "opening-stock" && !inventoryEnabled)) {
      setView("dashboard");
    }
  }, [catalogEnabled, inventoryEnabled, view]);

  function navigate(nextView: View) {
    setView(nextView);
    setSuccess("");
    setMobileNavOpen(false);
  }

  async function productCreated(name: string) {
    await loadData();
    setSuccess(`Produk “${name}” berhasil ditambahkan.`);
  }

  async function openingStockRecorded(name: string) {
    await loadData();
    setSuccess(`Stok awal “${name}” berhasil dicatat.`);
  }

  async function switchBusiness(code: string) {
    if (!code || code === activeCode) return;
    setSwitchingBusiness(true);
    setSwitchError("");
    try {
      await onSwitchBusiness(code);
      setView("dashboard");
      setSuccess("");
    } catch (caught) {
      setSwitchError(errorMessage(caught));
    } finally {
      setSwitchingBusiness(false);
    }
  }

  if (loading && products.length === 0 && inventory.length === 0) {
    return <LoadingPage label="Mengambil data usaha..." />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "is-open" : ""}`}>
        <div className="sidebar__brand"><Brand compact /></div>
        <nav aria-label="Navigasi utama">
          <p>RUANG KERJA</p>
          {navItems.map((item) => (
            <button
              type="button"
              className={view === item.id ? "is-active" : ""}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar__help">
          <strong>{profile.label}</strong>
          <p>{profile.description}</p>
        </div>
        <div className="sidebar__user">
          <span>{user.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{user.name}</strong><small>{user.email}</small></div>
          <button type="button" title="Keluar" aria-label="Keluar" onClick={() => void onLogout()}>→</button>
        </div>
      </aside>
      {mobileNavOpen && <button className="nav-backdrop" type="button" aria-label="Tutup navigasi" onClick={() => setMobileNavOpen(false)} />}

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu" type="button" aria-label="Buka navigasi" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
          <div className="business-switcher">
            <span className="business-avatar business-avatar--small">{enrichedBusiness.name.slice(0, 1).toUpperCase()}</span>
            <label>
              <span>Usaha aktif</span>
              <select
                aria-label="Ganti usaha aktif"
                value={activeCode}
                disabled={switchingBusiness}
                onChange={(event) => void switchBusiness(event.target.value)}
              >
                {businesses.map((business) => {
                  const code = getBusinessCode(business);
                  return <option value={code} key={code}>{business.name}</option>;
                })}
              </select>
            </label>
            {switchingBusiness && <Spinner label="Mengganti usaha" />}
          </div>
          <div className="topbar__meta">
            <span className="role-badge">{enrichedBusiness.role ?? activeBusiness.role ?? "Anggota"}</span>
            <span className="today">Asia/Jakarta · IDR</span>
          </div>
        </header>
        {switchError && <div className="top-error"><Alert>{switchError}</Alert></div>}

        <main className="workspace__content">
          {view === "dashboard" && (
            inventoryEnabled ? (
              <InventoryDashboard
                inventory={inventory}
                error={dataError}
                onRetry={() => void loadData()}
                onGoToProducts={() => navigate("products")}
                onGoToOpeningStock={() => navigate("opening-stock")}
                onGoToMovements={() => navigate("movements")}
                onGoToAdjustments={() => navigate("adjustments")}
              />
            ) : <BusinessProfileDashboard profile={profile} modules={enabledModules} />
          )}
          {view === "products" && (
            <ProductsPage
              products={products}
              error={dataError}
              success={success}
              onCreated={productCreated}
              onRetry={() => void loadData()}
            />
          )}
          {view === "opening-stock" && (
            <OpeningStockPage
              products={products}
              business={enrichedBusiness}
              success={success}
              onRecorded={openingStockRecorded}
              onGoToProducts={() => navigate("products")}
            />
          )}
          {view === "movements" && (
            <StockMovementsPage onGoBack={() => navigate("dashboard")} />
          )}
          {view === "adjustments" && (
            <StockAdjustmentsPage 
              onGoBack={() => navigate("dashboard")}
              onSuccess={async (msg) => {
                await loadData();
                setSuccess(msg);
                navigate("movements");
              }}
            />
          )}
          {view === "business-settings" && (
            <BusinessSettings business={enrichedBusiness} onSaved={onBusinessUpdated} />
          )}
          {view === "master-data" && <MasterDataPage />}
        </main>
      </div>
    </div>
  );
}
