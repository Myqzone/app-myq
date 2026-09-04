# 🔲 App MyQ (Minimalist Media Studio & Adobe Downgrader)

Aplikasi desktop Windows offline dan modern dengan desain **Monochrome Minimalist** (hitam, putih, abu-abu netral) tanpa gradien warna, dirancang untuk kecepatan, keamanan, dan kejelasan antarmuka.

---

## 📦 Cara Memasang (Install) Software .EXE di Windows

Setelah proses build selesai, file executable installer `.exe` tersimpan di folder:
👉 `c:\Users\email\Downloads\app.miq\dist\`

Terdapat 2 jenis file `.exe` yang siap pakai:

### 1. File Installer Resmi (Setup Wizard):
* **Nama File**: `App MyQ Setup 1.0.0.exe`
* **Cara Pakai**:
  1. Klik 2x file `App MyQ Setup 1.0.0.exe`.
  2. Ikuti wizard pemasangan (bisa pilih folder instalasi).
  3. Aplikasi otomatis membuat icon shortcut di Desktop dan Start Menu Windows.
  4. Selesai! Aplikasi siap dibuka kapan saja dari Desktop seperti software Windows profesional lainnya.

### 2. File Portable (Tanpa Perlu Install):
* **Nama File**: `App MyQ 1.0.0.exe`
* **Cara Pakai**:
  * Cukup klik 2x dan software langsung terbuka detik itu juga tanpa perlu proses instalasi (bisa disimpan di Flashdisk / Harddisk eksternal).

---

## 🛡️ Keamanan & Run as Administrator (Bebas Virus)

Aplikasi ini dikompilasi dengan konfigurasi:
* **`requestedExecutionLevel: asInvoker`**: Menjamin file `.exe` tidak meminta hak akses sistem yang mencurigakan (menghindarkan dari deteksi false-positive antivirus / Windows Defender).
* **100% Bersih & Offline**: Tidak ada adware, tidak ada telemetri, dan seluruh proses (kompresi, upscaling AI, konversi format, downgrade Adobe) dieksekusi murni di komputer lokal Anda tanpa internet.
* **Run as Administrator**: Jika sewaktu-waktu Anda ingin menjalankan dengan hak administrator, cukup klik kanan file `.exe` lalu pilih **Run as Administrator** secara aman.

---

## ⚡ Cara Menjalankan Langsung Tanpa Install (Mode Cepat)

Jika Anda tidak ingin menginstall, Anda juga bisa langsung menjalankannya lewat file batch di folder utama:
* **Mode Software Desktop**: Klik 2x `app-desktop.bat`
* **Mode Web Browser**: Klik 2x `app-web.bat`
* **Membuat Ulang Installer .EXE**: Klik 2x `app-build.bat`

---

## 🔲 Fitur Unggulan App MyQ

1. **Compress File**: Mendukung semua format (JPG, PNG, WebP, AVIF, TIFF, BMP, GIF, SVG) dengan quality slider dan EXIF stripper.
2. **AI & HD Upscaler**: Memperbesar resolusi 2x, 4x, hingga 8x dengan interactive before/after split slider.
3. **Compress PDF**: Optimasi struktur stream PDF agar ringan dikirim via email/chat.
4. **Adobe Suite Downgrader**:
   * Premiere Pro (`.prproj`)
   * After Effects (`.aep / .aepx`)
   * Photoshop (`.psd`)
   * Illustrator (`.ai`)
   * InDesign (`.indd`)
5. **Universal Format Converter**: Konversi silang semua format media + generator Windows Multi-Resolution ICO (16px s/d 256px).
6. **Batch Queue & ZIP**: Unduh semua hasil pemrosesan dalam satu arsip ZIP.
