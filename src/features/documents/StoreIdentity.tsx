import { useState } from "react";

/**
 * Identitas toko pada dokumen cetak.
 *
 * Kalau toko sudah memasang logo, logo itu yang dipakai. Kalau belum, tampilkan
 * inisial nama toko di badge aksen. Nama toko selalu ikut ditampilkan karena
 * penerima struk butuh tahu dokumen ini berasal dari toko mana.
 *
 * Struktur mengikuti mockup design system (Layar 08): nama toko, lalu label
 * sekunder. Label sekunder memrioritaskan tipe usaha; label jenis dokumen
 * hanya dipakai bila tipe usaha tidak tersedia (mis. pratinjau pengaturan).
 */
export function StoreIdentity({
  name,
  logoUrl,
  documentLabel = "",
  storeType,
}: {
  name: string;
  logoUrl?: string;
  documentLabel?: string;
  storeType?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hasLogo = Boolean(logoUrl) && !failed;

  return (
    <div className="document-identity">
      {hasLogo ? (
        <img
          className="document-logo"
          src={logoUrl}
          alt={`Logo ${name}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="document-logo document-logo--fallback" aria-hidden="true">
          {initials(name)}
        </span>
      )}
      <div>
        <p className="document-store">{name}</p>
        <p className="document-store__type">{storeType ?? documentLabel}</p>
      </div>
    </div>
  );
}

/**
 * Inisial nama toko untuk badge fallback: huruf pertama tiap kata, maksimal
 * tiga huruf agar tetap terbaca di kotak kecil.
 */
function initials(name: string = ""): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word[0]!)
    .join("")
    .toUpperCase();
}