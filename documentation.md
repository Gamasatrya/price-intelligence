# Dokumentasi Riwayat Prompt dan Solusi Teknis
**Aplikasi Dashboard Analisis Harga Properti SPEEDHOME (PropIntel MY)**

Dokumen ini berisi rangkuman seluruh permintaan pengguna (prompts) dari awal hingga akhir pengerjaan proyek, beserta solusi teknis, daftar berkas yang diubah, dan hasil implementasinya.

---

## Daftar Ini
1. [Fitur Multi-Rental Type (Daily, Monthly, Yearly)](#1-fitur-multi-rental-type-daily-monthly-yearly)
2. [Tampilan Daftar Harga pada Setiap Kartu Unit](#2-tampilan-daftar-harga-pada-setiap-kartu-unit)
3. [Perbaikan Strict Filtering & Sinkronisasi Data](#3-perbaikan-strict-filtering-sinkronisasi-data)
4. [Penamaan Berkas Ekspor Dinamis (Export Filename Format)](#4-penamaan-berkas-ekspor-dinamis-export-filename-format)
5. [Konfigurasi Deployment Tanpa Error 404 (Netlify)](#5-konfigurasi-deployment-tanpa-error-404-netlify)

---

## 1. Fitur Multi-Rental Type (Daily, Monthly, Yearly)

### Permintaan Pengguna (Prompt)
> Sesuaikan fitur harga pada "Data Explore" ditiap unit agar mendukung 3 tipe sewa: Daily, Monthly, dan Yearly.
> - Tambahkan field Rental Type pada setiap listing (Daily, Monthly, Yearly).
> - Saat scraping, identifikasi dan simpan tipe sewa setiap listing.
> - Tampilkan harga sesuai periodenya: `RM xxx/day`, `RM xxx/month`, `RM xxx/year`.
> - Tambahkan filter Rental Type (All, Daily, Monthly, Yearly).
> - Semua komponen yang menampilkan statistik harga (Summary Cards, Price Summary, Property Listing) harus mengikuti Rental Type yang dipilih.
> - Jika suatu tipe sewa tidak tersedia (misalnya Daily), tampilkan "No data available" atau sembunyikan opsinya secara dinamis.
> - Jangan mengubah desain UI yang sudah ada.

### Solusi Teknis & Implementasi
*   **Migrasi Database (`server/properties.json`)**:
    *   Melakukan migrasi skema database dari satu nilai harga flat (`price`, `rentalType`) menjadi struktur multi-harga sewa dalam bentuk objek `rentalPrices: { DAILY, MONTHLY, YEARLY }`.
    *   Data simulasi dan scraper disesuaikan agar secara otomatis menghasilkan ketiga tipe harga tersebut jika tersedia.
*   **Logika Dinamis Backend (`server/server.js`)**:
    *   Mengatur fungsi `getFilteredProperties` agar memetakan harga properti secara dinamis berdasarkan periode harga yang aktif (`prices[activePricePeriod]`).
    *   Menghitung ulang statistik analitik (Rata-rata, Median, Min/Max harga) secara real-time pada endpoint `/api/analytics` berdasarkan data terfilter agar grafik Recharts dan kartu ringkasan sinkron.
*   **UI Pilihan Filter Terintegrasi (`client/src/App.jsx`)**:
    *   Membuat barisan tombol pill pilihan sewa (Semua, Daily, Monthly, Yearly) di atas grid kartu properti.
    *   Pill filter akan dinonaktifkan secara dinamis jika hasil kalkulasi `availableRentalTypes` dari server menyatakan tipe sewa tersebut tidak memiliki data sama sekali di database.

### Berkas yang Terkait
*   [server/server.js](file:///Users/gamasatrya/AG/WEBSITEAPPART/server/server.js#L115-L157) (Logika pemetaan tipe sewa dinamis)
*   [client/src/App.jsx](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/src/App.jsx#L950-L975) (Filter pill UI)

---

## 2. Tampilan Daftar Harga pada Setiap Kartu Unit

### Permintaan Pengguna (Prompt)
> Pada "Data Explore" di tiap unit cardsnya tetap ditambahkan Field Harga dari tiap Type Rental "Daily, Monthly, Yearly". Apabila Unit tersebut memiliki 3 Harga Type Rental maka tampilkan semua harga sesuai dengan Rental Type, Jika dari tiap unit hanya memiliki salah satu atau salah dua harga dari Type Rental maka tetap tampilkan harga yang tersedia untuk Type Rental, Jika tidak memiliki Harga salah satu Type Rental bisa di isi dengan "Data not available from Owner". Tampilan harga pada cards tetap ditampilkan sesuai dengan harganya.

### Solusi Teknis & Implementasi
*   **Tabel Harga di Kartu Listing (`client/src/App.jsx`)**:
    *   Menambahkan komponen `.card-rental-prices` di bagian isi kartu properti (dan di dalam Modal detail) untuk menampilkan harga Daily, Monthly, dan Yearly secara berurutan.
    *   Jika salah satu nilai harga bernilai `null` (tidak tersedia), maka akan ditampilkan teks *"Data not available from Owner"* dengan warna teks abu-abu redup bergaya miring (*italic*).
*   **Sinkronisasi Tag Harga Gambar**:
    *   Mengatur agar tag harga overlay melayang di sudut kanan atas gambar properti berubah secara dinamis mengikuti filter sewa yang sedang aktif (misalnya `RM 30/day` ketika filter Daily terpilih, atau default prioritas sewa ketika filter "Semua" terpilih).

### Berkas yang Terkait
*   [client/src/App.jsx](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/src/App.jsx#L1282-L1302) (Daftar harga multi-tipe pada kartu)
*   [client/src/App.jsx](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/src/App.jsx#L1269-L1272) (Tag harga dinamis di pojok kanan atas gambar)
*   [client/src/index.css](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/src/index.css) (Pewarnaan dan tata letak tabel kecil harga)

---

## 3. Perbaikan Strict Filtering & Sinkronisasi Data

### Permintaan Pengguna (Prompt)
> Untuk fitur Filterring masih belum sesuai, untuk Filter Type Rental disesuaikan dengan Harga unit. Jika hanya ada harga Daily, maka ditampilkan ke Filter Daily saja. jika unit tidak memiliki salah satu harga Type Rental, maka tidak masuk ke Filterring Type Rental tersebut. 
> 
> Perbaiki bug pada fitur Rental Type Filter:
> - **Daily**: Tampilkan hanya property yang memiliki Daily Price. Gunakan Daily Price sebagai harga utama.
> - **Monthly**: Tampilkan hanya property yang memiliki Monthly Price. Gunakan Monthly Price sebagai harga utama.
> - **Yearly**: Tampilkan hanya property yang memiliki Yearly Price. Gunakan Yearly Price sebagai harga utama.
> - **All**: Tampilkan seluruh property. Gunakan harga utama sesuai prioritas: Monthly → Yearly → Daily.
> - Property yang tidak memiliki harga untuk tipe terpilih tidak boleh muncul.
> - Sorting harga harus menggunakan tipe sewa yang sedang aktif.
> - Summary Cards dan Price Summary juga dihitung berdasarkan dataset terfilter.

### Solusi Teknis & Implementasi
*   **Strict Boolean Filtering**:
    *   Di Express API Server, menambahkan filter bersyarat: `filtered.filter(p => p.price !== null)` ketika filter sewa aktif bukan `'ALL'`. Ini memastikan properti tanpa nominal harga sewa terpilih tidak akan lolos penyaringan.
*   **Urutan Prioritas Fallback (Monthly → Yearly → Daily)**:
    *   Saat filter `'ALL'` aktif, backend secara dinamis menguji ketersediaan harga utama berdasarkan urutan prioritas: pertama mencari `MONTHLY`, kedua mencari `YEARLY`, dan ketiga mencari `DAILY`.
*   **Penyelesaian Masalah Duplikasi Data & Caching**:
    *   **Anti-Duplicate**: Menghapus record ID ganda pada `properties.json` (dari 397 menjadi 352 unit unik) guna mengatasi kesalahan key duplikat React di sisi klien.
    *   **Bypass Cache**: Menambahkan middleware pembersih cache HTTP (`Cache-Control: no-store`) pada server dan appending timestamp parameter (`_t`) pada setiap fetch request frontend agar browser tidak memuat data statis yang usang ketika filter diklik.

### Berkas yang Terkait
*   [server/server.js](file:///Users/gamasatrya/AG/WEBSITEAPPART/server/server.js#L131-L157) (Penyaringan ketat sewa & urutan fallback prioritas harga)
*   [server/server.js](file:///Users/gamasatrya/AG/WEBSITEAPPART/server/server.js#L14-L18) (Middleware pencegah cache HTTP)
*   [client/src/App.jsx](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/src/App.jsx#L436) (Pemberian cache-buster parameter `_t`)

---

## 4. Penamaan Berkas Ekspor Dinamis (Export Filename Format)

### Permintaan Pengguna (Prompt)
> Perbaiki fitur Export Data agar nama file hasil download mengikuti format:
> `SPEEDHOME_<Area>_<YYYYMMDD>.<ext>`
> 
> Contoh:
> - `SPEEDHOME_Mont_Kiara_20260601.xlsx`
> - `SPEEDHOME_Petaling_Jaya_20260601.csv`
> 
> Rules:
> - Gunakan tanggal export dengan format YYYYMMDD.
> - Pertahankan ekstensi sesuai pilihan (.xlsx atau .csv / .json).
> - Jangan mengubah isi file atau proses export, hanya sesuaikan penamaan file.

### Solusi Teknis & Implementasi
*   **Deteksi Area Terfilter**:
    *   Backend dan frontend mendeteksi parameter wilayah teraktif secara berurutan: jika ada kota terpilih (`city`), ambil nama kota tersebut. Jika tidak ada kota tetapi ada input pencarian (`search`), gunakan kata kunci pencarian. Jika tidak ada sama sekali, gunakan fallback `All_Areas`.
    *   Mengganti spasi dan karakter non-alfanumerik dengan karakter garis bawah (`_`).
*   **Penyusunan Format Tanggal**:
    *   Mengambil tanggal sistem hari ini dan memformatnya menjadi format 8-digit string `YYYYMMDD`.
*   **Penerapan di Header & Unduhan**:
    *   Menetapkan nama file hasil kalkulasi ke dalam header HTTP `Content-disposition` di server Express dan juga menetapkan nilai atribut `download` pada elemen tautan (`<a>`) di frontend React.

### Berkas yang Terkait
*   [server/server.js](file:///Users/gamasatrya/AG/WEBSITEAPPART/server/server.js#L547-L572) (Pembuatan nama berkas ekspor di backend)
*   [client/src/App.jsx](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/src/App.jsx#L529-L545) (Pembuatan nama berkas ekspor di frontend)

---

## 5. Konfigurasi Deployment Tanpa Error 404 (Netlify)

### Permintaan Pengguna (Prompt)
> Perbaiki konfigurasi deployment project dengan struktur monorepo. Saat ini deploy berhasil tetapi website menampilkan 404 Not Found.
> 
> Pastikan:
> - Frontend di-build dari folder client.
> - Output build berada di client/dist.
> - Tambahkan konfigurasi deployment yang diperlukan (misalnya netlify.toml dan _redirects untuk React Router jika diperlukan).
> 
> Gunakan:
> - Base Directory: client
> - Build Command: npm run build
> - Publish Directory: dist
> - Jangan mengubah struktur folder atau source code aplikasi.

### Solusi Teknis & Implementasi
*   **Konfigurasi Global (`netlify.toml`)**:
    *   Membuat berkas `netlify.toml` pada repositori root untuk memetakan jalur pembangunan monorepo Netlify secara otomatis: folder kerja dialihkan ke subfolder `client`, output hasil compile Vite didefinisikan ke folder `dist` (`client/dist`), serta menyertakan aturan penanganan URL dinamis (SPA redirection).
*   **SPA Redirect Rule (`_redirects`)**:
    *   Membuat berkas `_redirects` di bawah folder `client/public/_redirects`. Selama proses pembangunan production build (`npm run build`), Vite akan menyalin berkas ini langsung ke dalam folder `dist/` untuk memastikan seluruh rute SPA dialihkan kembali ke `index.html` dan mencegah terjadinya error HTTP 404.

### Berkas yang Terkait
*   [netlify.toml](file:///Users/gamasatrya/AG/WEBSITEAPPART/netlify.toml) [NEW] (Konfigurasi build & redirects root)
*   [client/public/_redirects](file:///Users/gamasatrya/AG/WEBSITEAPPART/client/public/_redirects) [NEW] (Konfigurasi rewrite SPA client)
