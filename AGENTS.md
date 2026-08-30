# Aturan Kontributor AI — Frontend

1. Satu AI hanya memegang satu task aktif. Cek `git status --short --branch` sebelum mengubah file.
2. Setiap task memakai branch `task/TXX-ringkasan` atau `feat/ringkasan`; jangan commit atau push langsung ke `main`.
3. Jika WIP memang milik task, buat branch dengan `git switch -c task/TXX-ringkasan` agar WIP tetap terbawa. Jangan memakai reset, checkout, clean, atau menghapus stash tanpa persetujuan maintainer.
4. Jika WIP tidak jelas pemiliknya, jangan menyentuh atau memasukkannya ke commit task.
5. Ikuti UI conventions dan kontrak API yang disetujui. Bila clone mandiri tidak memiliki docs, minta dokumen koordinasi; jangan membuat tema/pola UI atau kontrak baru berdasarkan asumsi.
6. Frontend tidak memuat business rule otoritatif. Gunakan Core API untuk authorization, validasi final, dan transaksi.
7. Proses frontend jangka panjang wajib memakai GNU Screen session `usahainaja-frontend`. Jangan menghentikan session milik task lain.
8. Sebelum handoff, jalankan typecheck, lint, test, serta build; catat branch/PR, SHA, hasil check, Screen, risiko, dan tindak lanjut tanpa secret. Jangan commit file environment, cache, tsbuildinfo, coverage sementara, atau `dist` kecuali kebijakan repo memang memerlukannya.
