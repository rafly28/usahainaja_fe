import type { JSX } from "react";
import { StoreIdentity } from "../documents/StoreIdentity";
import { roundQuantity } from "../../lib/format";

export type OpnameSheetItem = {
  productCode: string;
  productName: string;
  unitSymbol: string;
  systemQuantity: string;
  countedQuantity: string;
  differenceQuantity: string;
  note?: string;
};

export function OpnameSheet({
  storeName,
  storeType,
  logoUrl,
  documentNumber,
  locationLabel,
  dateLabel,
  actorName,
  status,
  notes,
  items,
  onBack,
}: {
  storeName: string;
  storeType?: string;
  logoUrl?: string;
  documentNumber: string;
  locationLabel: string;
  dateLabel: string;
  actorName: string;
  status: string;
  notes?: string;
  items: OpnameSheetItem[];
  onBack: () => void;
}): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(items.length / 25));

  return (
    <div className="opname-sheet-page">
      <div className="document-actions no-print">
        <button
          type="button"
          className="button button--primary"
          onClick={() => window.print()}
        >
          Cetak
        </button>
        <button type="button" className="button button--secondary" onClick={onBack}>
          Kembali
        </button>
      </div>

      <article
        className="document-sheet opname-sheet"
        aria-label={`Lembar opname ${documentNumber}`}
      >
        <header className="document-head">
          <StoreIdentity
            name={storeName}
            storeType={storeType}
            documentLabel="Lembar Stok Opname"
            logoUrl={logoUrl}
          />
          <div style={{ textAlign: "right" }}>
            <h2 className="document-title">Lembar Stok Opname</h2>
            <span className="document-head__label">Nomor dokumen</span>
            <p className="document-head__value">{documentNumber}</p>
          </div>
        </header>

        <div className="document-meta">
          <div className="document-meta__item">
            <span>Lokasi</span>
            <p>{locationLabel}</p>
          </div>
          <div className="document-meta__item">
            <span>Tanggal opname</span>
            <p>{dateLabel}</p>
          </div>
          <div className="document-meta__item">
            <span>Dilakukan oleh</span>
            <p>{actorName || "Staf UsahainAja"}</p>
          </div>
          <div className="document-meta__item">
            <span>Status</span>
            <p>
              <span
                className={`status-pill ${
                  status === "COMPLETED" || status === "Selesai"
                    ? "status-pill--good"
                    : "status-pill--warning"
                }`}
              >
                <i />
                {status === "COMPLETED" ? "Selesai" : status}
              </span>
            </p>
          </div>
          {notes && (
            <div className="document-meta__item">
              <span>Catatan</span>
              <p>{notes}</p>
            </div>
          )}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">NO</th>
                <th scope="col">PRODUK</th>
                <th scope="col">SATUAN</th>
                <th scope="col" className="num">STOK SISTEM</th>
                <th scope="col" className="num">HITUNG FISIK</th>
                <th scope="col" className="num">SELISIH</th>
                <th scope="col">KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const sysVal = parseFloat(item.systemQuantity);
                const countVal = parseFloat(item.countedQuantity);
                let diff: number;
                if (!Number.isNaN(sysVal) && !Number.isNaN(countVal)) {
                  diff = countVal - sysVal;
                } else if (!Number.isNaN(parseFloat(item.differenceQuantity))) {
                  diff = parseFloat(item.differenceQuantity);
                } else {
                  diff = 0;
                }

                const sysRounded = roundQuantity(item.systemQuantity, item.unitSymbol);
                const countRounded = roundQuantity(item.countedQuantity, item.unitSymbol);
                const diffRounded = roundQuantity(diff.toString(), item.unitSymbol);

                let diffDisplay: string;
                let diffClass = "selisih selisih--same";
                let defaultKet = "Sama";

                if (parseFloat(diffRounded) === 0) {
                  diffDisplay = "Sama (0)";
                } else if (parseFloat(diffRounded) < 0) {
                  diffDisplay = `−${Math.abs(parseFloat(diffRounded))}`;
                  diffClass = "selisih selisih--minus";
                  defaultKet = "Berkurang";
                } else {
                  diffDisplay = `+${diffRounded}`;
                  diffClass = "selisih selisih--plus";
                  defaultKet = "Bertambah";
                }

                const ket = item.note ? `${defaultKet} · ${item.note}` : defaultKet;

                return (
                  <tr key={item.productCode || idx}>
                    <td className="num">{idx + 1}</td>
                    <td>
                      <div>{item.productName}</div>
                      <small
                        className="text-micro muted"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {item.productCode}
                      </small>
                    </td>
                    <td>{item.unitSymbol}</td>
                    <td className="num">{sysRounded}</td>
                    <td className="num">{countRounded}</td>
                    <td className="num">
                      <span className={diffClass}>{diffDisplay}</span>
                    </td>
                    <td>{ket}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="opname-sheet__footer">
          <span>Halaman 1 dari {totalPages}</span>
          <span>Dokumen dihasilkan dari UsahainAja.</span>
        </div>
      </article>
    </div>
  );
}
