# PropIntel MY - SPEEDHOME Property Price Intelligence Dashboard
**Platform Analisis Pasar Properti dan Intelijen Harga Rent-Period Malaysia**

Aplikasi **PropIntel MY** adalah sebuah dashboard analitis harga properti (*real estate price intelligence dashboard*) yang dibangun khusus untuk mengolah, menyajikan, dan menganalisis data sewa unit properti SPEEDHOME di Malaysia secara real-time.

Aplikasi ini ditujukan sebagai perangkat bantu pengambil keputusan (seperti *CEO Office* atau analis properti) untuk memahami tren sewa pasar secara akurat dan komprehensif.

---

## Apa itu PropIntel MY?

PropIntel MY adalah platform integrasi yang menggabungkan mesin pengumpul data (*web crawler/scraper*), server API pengolahan statistik, dan antarmuka analitis premium berbasis web:

1.  **Crawler Cerdas (Scraping Engine)**: Mengambil data listings aktif langsung dari SPEEDHOME menggunakan browser headless (Playwright), memproses spesifikasi unit, dan menyimpannya ke dalam database lokal.
2.  **API Pengolah Data (Express.js)**: Menyediakan kalkulasi statistik cepat (rata-rata harga, median, deviasi, harga per sqft) berdasarkan kriteria filter dinamis.
3.  **Dashboard Interaktif (React & Recharts)**: Menyajikan grafik interaktif seperti tren harga vs ukuran, distribusi kelengkapan properti, harga per wilayah, serta tabel visual perbandingan multi-tipe sewa (*Daily, Monthly, Yearly*).

---

## Tujuan Pembuatan Website

Pembuatan platform PropIntel MY didorong oleh beberapa tujuan strategis utama:

### 1. Demokratisasi & Pemetaan Transparansi Harga Sewa
Di pasar properti tradisional, harga sewa sering kali tidak transparan dan bervariasi bergantung pada periode sewa. Platform ini bertujuan untuk **menyajikan transparansi penuh** dengan membandingkan harga sewa harian (*Daily*), bulanan (*Monthly*), dan tahunan (*Yearly*) secara berdampingan dalam satu layar terpadu (*single pane of glass*).

### 2. Efisiensi Pengambilan Keputusan (CEO Office Tool)
Membantu tim internal pengembang atau manajemen investasi properti untuk melakukan analisis kelayakan harga (*pricing viability analysis*) secara instan. Pengguna dapat dengan mudah mengetahui:
*   Wilayah mana yang memiliki median harga sewa per sqft tertinggi.
*   Distribusi ketersediaan tipe unit di pasar (kondominium vs landed vs studio).
*   Hubungan antara luas bangunan dengan harga sewa untuk menentukan rasio harga sewa terbaik.

### 3. Otomatisasi Pengumpulan Data Pasar (Market Intelligence)
Menghilangkan proses survei pasar manual yang memakan waktu. Dengan menekan tombol **Sync SPEEDHOME**, sistem secara otomatis mengumpulkan ratusan listing properti terbaru beserta kelengkapan perabotan, koordinat area, dan spesifikasi unit dalam hitungan detik secara etis dan aman.

### 4. Portabilitas Analisis Data (Ekspor Siap Pakai)
Memfasilitasi kebutuhan analis data untuk melakukan pemodelan data lebih lanjut. Data yang telah difilter secara spesifik dapat diekspor langsung ke berkas **CSV** (untuk Microsoft Excel/Google Sheets) atau **JSON** (untuk pengolahan database/BI tool) dengan format penamaan file yang rapi dan terstandarisasi.

---

## Teknologi yang Digunakan

*   **Frontend**: React.js, Vite, Recharts (Library Grafik), Lucide React (Ikon).
*   **Backend**: Node.js, Express.js.
*   **Scraper**: Playwright (Headless Browser Automation).
*   **Aesthetics**: Glassmorphism CSS, Floating Background Blur, Dark/Light Mode.
