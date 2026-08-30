# Frontend UsahainAja

Frontend MVP UsahainAja dibangun dengan React, TypeScript, dan Vite. Browser hanya
mengakses API melalui path same-origin `/api` dan session dikelola backend melalui
cookie HttpOnly.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Vite meneruskan `/api/*` ke `http://localhost:8080`. Target tersebut dapat diubah
tanpa mengubah kode:

```bash
API_PROXY_TARGET=http://localhost:9000 npm run dev
```

## Menjalankan lewat Screen

Untuk server development yang berjalan lama, gunakan session usahainaja-frontend:

    screen -S usahainaja-frontend -dm bash -lc 'exec npm run dev'
    screen -r usahainaja-frontend

Detach dengan Ctrl-a lalu d. Cek session memakai screen -ls dan hentikan hanya session sendiri dengan screen -S usahainaja-frontend -X quit.

## Pemeriksaan kualitas

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Cakupan milestone pertama

- Registrasi, login, logout, dan pemulihan session.
- Onboarding pembuatan bisnis serta business switcher.
- Ringkasan inventory dengan status stok minimum.
- Pembuatan produk.
- Pencatatan stok awal memakai kode publik produk.
- Loading, error, validasi, dan empty state yang responsif.

Token CSRF disimpan hanya di memory. Seluruh mutation memakai `credentials:
"include"` dan header `X-CSRF-Token`.

## Aturan UI untuk module baru

Tampilan yang ada adalah baseline desain. Saat folder ini dipindahkan menjadi repository frontend mandiri, aturan berikut ikut menjadi guardrail implementasi:

- Gunakan token dan class yang telah ada di `src/styles.css`; jangan membuat warna, typography, spacing, radius, atau shadow hardcoded per halaman.
- Gunakan varian `button` yang ada, serta komponen `Alert`, `EmptyState`, `LoadingPage`, `Spinner`, dan `Icon` dari `src/components`.
- Menu dan content boleh berbeda berdasarkan module atau tipe usaha, tetapi tetap memakai shell, hierarchy, dan tema visual yang sama.
- Setiap flow baru harus memiliki state loading, empty, error, success bila relevan; responsif hingga lebar 320px; dan tetap dapat diakses keyboard.
- Jika sebuah pola muncul sedikitnya dua kali, jadikan komponen reusable. Jangan menambah UI/CSS framework atau icon library tanpa persetujuan maintainer.

Versi lengkap untuk koordinasi lintas-task berada di `docs/frontend_ui_conventions.md` pada workspace saat ini.
