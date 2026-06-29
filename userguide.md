# Panduan Pengguna (User Guide) - PropIntel MY
**Dashboard Analisis & Harga Properti SPEEDHOME**

Selamat datang di Panduan Pengguna **PropIntel MY**! Aplikasi web ini dirancang untuk membantu Anda menganalisis harga sewa properti SPEEDHOME di berbagai wilayah utama Malaysia secara real-time.

Panduan ini akan menjelaskan alur penggunaan (*user flow*) seluruh fitur dashboard mulai dari navigasi dasar hingga ekspor data hasil analisis.

---

## Daftar Isi
1. [Alur Navigasi Utama](#1-alur-navigasi-utama)
2. [Fitur Penyaringan Samping (Sidebar Filters)](#2-fitur-penyaringan-samping-sidebar-filters)
3. [Penggunaan Filter Tipe Sewa (Rental Type Filters)](#3-penggunaan-filter-tipe-sewa-rental-type-filters)
4. [Mengurutkan Listing Properti (Sorting)](#4-mengurutkan-listing-properti-sorting)
5. [Melihat Detail Properti (Detail Modal)](#5-melihat-detail-properti-detail-modal)
6. [Sinkronisasi Data Baru (Scraper Sync)](#6-sinkronisasi-data-baru-scraper-sync)
7. [Ekspor Hasil Analisis (Data Export)](#7-ekspor-hasil-analisis-data-export)
8. [Pengaturan Tema (Theme Toggle)](#8-pengaturan-tema-theme-toggle)

---

## 1. Alur Navigasi Utama

Aplikasi ini menggunakan panel navigasi kiri (*sidebar navigation*) untuk beralih di antara 2 tab fungsionalitas utama:

*   **Analisis Dashboard (Dashboard Analysis)**: 
    Menampilkan kartu indikator utama (KPI) seperti *Rata-rata Harga*, *Median Harga*, *Rata-rata RM per Sqft*, serta berbagai grafik visualisasi interaktif (seperti Distribusi Harga, Harga vs Ukuran Properti, dll.).
*   **Data Explorer**: 
    Menampilkan daftar lengkap listing properti dalam format grid kartu (*property cards*) beserta bar pencarian cerdas (*search bar*).

> [!TIP]
> Untuk beralih, cukup klik nama menu **Analisis Dashboard** atau **Data Explorer** di panel kiri. Transisi antar halaman dilakukan secara instan tanpa memuat ulang browser.

---

## 2. Fitur Penyaringan Samping (Sidebar Filters)

Di panel sebelah kanan (atau bilah samping), terdapat berbagai pilihan kriteria filter untuk mempersempit pencarian listing:

1.  **Kota (City)**: Centang kota yang ingin Anda cari (misal: *Kuala Lumpur*, *Petaling Jaya*, *Subang Jaya*, *Shah Alam*, *Penang*).
2.  **Tipe Properti (Property Type)**: Saring berdasarkan kategori *Condo*, *Landed*, atau *Studio*.
3.  **Furnishing**: Pilih status perabotan (*Fully Furnished*, *Partially Furnished*, atau *Unfurnished*).
4.  **Bedrooms (Kamar Tidur)**: Pilih jumlah kamar yang diinginkan (1 hingga 4+ kamar).
5.  **Batas Harga (Price Range)**: Masukkan batas harga minimal (`Min Price`) dan batas harga maksimal (`Max Price`).
6.  **Luas Bangunan (Sqft Range)**: Masukkan luas bangunan minimal (`Min Sqft`) dan maksimal (`Max Sqft`).

> [!IMPORTANT]
> - Semua filter samping ini **bersifat kumulatif** (saling melengkapi).
> - Seluruh metrik grafik pada halaman **Analisis Dashboard** akan ikut beradaptasi secara real-time mengikuti filter samping yang sedang Anda pilih.
> - Anda dapat menghapus seluruh kriteria filter kapan saja dengan mengeklik tombol **"Reset Filter"** di bagian atas bilah filter samping.

---

## 3. Penggunaan Filter Tipe Sewa (Rental Type Filters)

Di bagian atas grid **Data Explorer**, terdapat pill filter tipe sewa: **Semua (All)**, **Daily**, **Monthly**, dan **Yearly**. Fitur ini menyaring listing secara ketat berdasarkan ketersediaan harga:

*   **Pill "Daily"**: 
    - Hanya menampilkan unit properti yang memiliki **Daily Price** terdaftar.
    - Mengubah tag harga di kanan atas gambar properti menjadi harga harian (misal: `RM 30/day`).
*   **Pill "Monthly"**: 
    - Hanya menampilkan unit properti yang memiliki **Monthly Price** terdaftar.
    - Mengubah tag harga utama menjadi harga bulanan (misal: `RM 1,200/month`).
*   **Pill "Yearly"**: 
    - Hanya menampilkan unit properti yang memiliki **Yearly Price** terdaftar.
    - Mengubah tag harga utama menjadi harga tahunan (misal: `RM 14,000/year`).
*   **Pill "Semua" (All)**: 
    - Menampilkan semua unit properti tanpa memedulikan tipe sewa.
    - Harga utama yang ditampilkan pada tag gambar akan mengikuti urutan prioritas ketersediaan: **Monthly → Yearly → Daily**.

> [!NOTE]
> Jika sebuah properti tidak memiliki harga untuk tipe sewa terpilih, properti tersebut akan **disembunyikan sepenuhnya dari grid** (tidak hanya disembunyikan teks harganya). Jika pill filter berubah warna menjadi abu-abu redup (misal: *Daily*), artinya tidak ada data dengan tipe sewa tersebut di database saat ini.

---

## 4. Mengurutkan Listing Properti (Sorting)

Anda dapat mengurutkan kartu properti di **Data Explorer** secara instan menggunakan menu drop-down di kanan atas grid:

1.  Pilih kriteria pengurutan pada menu drop-down:
    - **Harga Sewa**: Mengurutkan berdasarkan nominal harga utama yang sedang aktif.
    - **Luas Bangunan (Sqft)**: Mengurutkan berdasarkan ukuran properti.
    - **Tanggal Dibuat**: Mengurutkan berdasarkan listing paling baru masuk.
2.  Klik tombol panah di sebelah kanan menu drop-down untuk membalikkan urutan:
    - **Panah Ke Bawah**: Mengurutkan dari yang terbesar/tertinggi ke terkecil (*Descending*).
    - **Panah Ke Atas**: Mengurutkan dari yang terkecil/terendah ke terbesar (*Ascending*).

---

## 5. Melihat Detail Properti (Detail Modal)

Untuk melihat informasi spesifik properti secara mendalam:

1.  Pada tab **Data Explorer**, temukan unit properti yang Anda minati.
2.  Klik di bagian mana saja pada kartu properti tersebut.
3.  Pop-up **Detail Properti** akan muncul di tengah layar Anda, menampilkan:
    - Galeri gambar properti beresolusi penuh.
    - Nama unit, tipe properti, kota, wilayah, dan kode pos.
    - **Tabel Perbandingan Harga**: Menampilkan perbandingan harga *Daily*, *Monthly*, dan *Yearly* secara berdampingan.
    - Spesifikasi lengkap: Jumlah kamar tidur, kamar mandi, slot parkir (*carpark*), luas bangunan (sqft), dan kelengkapan perabotan (*furnishing*).
    - Tombol **"Lihat Iklan Asli"**: Membuka halaman listing resmi SPEEDHOME di tab baru.
4.  Klik tombol **"Tutup"** (atau klik area gelap di luar pop-up) untuk kembali ke halaman utama.

---

## 6. Sinkronisasi Data Baru (Scraper Sync)

Jika Anda ingin memperbarui database properti dengan data terbaru langsung dari situs web SPEEDHOME:

1.  Arahkan kursor ke sudut kanan atas header aplikasi.
2.  Klik tombol **"Sync SPEEDHOME"** (ikon putaran panah).
3.  Sistem akan menampilkan indikator progress bar pengunduhan data secara real-time. Scraper berjalan di latar belakang menggunakan Playwright Headless Browser untuk mengambil data listings terbaru.
4.  Setelah selesai, data grid dan grafik dashboard akan otomatis ter-refresh menampilkan data terbaru.

---

## 7. Ekspor Hasil Analisis (Data Export)

Aplikasi menyediakan fitur ekspor untuk menyimpan data properti terfilter ke komputer Anda:

1.  Terapkan filter (misal: pilih kota *Mont Kiara*).
2.  Klik tombol ekspor di pojok kanan atas halaman:
    - **Export JSON**: Menyimpan data teknis mentah dalam format `.json`.
    - **Export CSV**: Menyimpan data berformat tabel untuk dibuka di Microsoft Excel atau Google Sheets dalam format `.csv`.
3.  Sistem akan mengunduh berkas dengan format penamaan dinamis yang terstandarisasi:
    `SPEEDHOME_<AreaTerfilter>_<TanggalHariIni_YYYYMMDD>.<ekstensi>`
    
    *Contoh:* `SPEEDHOME_Mont_Kiara_20260628.csv`

---

## 8. Pengaturan Tema (Theme Toggle)

Aplikasi dilengkapi dengan desain Glassmorphism premium yang mendukung kenyamanan mata Anda:

1.  Arahkan pandangan ke pojok kiri bawah (bagian bawah sidebar).
2.  Temukan sakelar switch **Theme: Dark** atau **Theme: Light**.
3.  Klik sakelar tersebut untuk beralih tema secara instan. Seluruh warna gradasi, bayangan kaca (*glassmorphism*), dan kontras grafik akan menyesuaikan secara visual tanpa mengganggu data yang sedang Anda analisis.
