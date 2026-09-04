const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const os = require('os');
const JSZip = require('jszip');

const fs = require('fs');

const imageService = require('./src/services/imageService');
const pdfService = require('./src/services/pdfService');
const adobeService = require('./src/services/adobeService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Anti-cache middleware for local development & hot reload
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Dedicated downloads folder on disk
const downloadsDir = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// Explicit Favicon route with correct MIME type
app.get('/favicon.ico', (req, res) => {
  const icoPath = path.join(__dirname, 'public', 'favicon.ico');
  if (fs.existsSync(icoPath)) {
    res.setHeader('Content-Type', 'image/x-icon');
    return res.sendFile(icoPath);
  }
  res.status(204).end();
});

// Dedicated file download route with strict attachment disposition and exact filename
app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(downloadsDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File unduhan tidak ditemukan.');
  }

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.sendFile(filePath);
});

// ----------------------------------------------------
// API: SOFTWARE DOWNLOADS (Windows EXE & macOS DMG)
// ----------------------------------------------------
app.get('/api/download/windows-installer', (req, res) => {
  const exePath = path.join(__dirname, 'dist', 'App MyQ Setup 1.0.0.exe');
  if (fs.existsSync(exePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="App MyQ Setup 1.0.0.exe"');
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    return res.sendFile(exePath);
  }
  res.status(404).json({ error: 'Installer Windows (.exe) sedang tidak tersedia di folder dist.' });
});

app.get('/api/download/windows-portable', (req, res) => {
  const exePath = path.join(__dirname, 'dist', 'App MyQ 1.0.0.exe');
  if (fs.existsSync(exePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="App MyQ 1.0.0.exe"');
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    return res.sendFile(exePath);
  }
  res.status(404).json({ error: 'Portable Windows (.exe) sedang tidak tersedia di folder dist.' });
});

app.get('/api/download/macos-dmg', (req, res) => {
  const dmgNames = ['App MyQ-1.0.0.dmg', 'App MyQ.dmg', 'App-MyQ-1.0.0.dmg', 'App MyQ 1.0.0.dmg'];
  for (const name of dmgNames) {
    const dmgPath = path.join(__dirname, 'dist', name);
    if (fs.existsSync(dmgPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
      res.setHeader('Content-Type', 'application/x-apple-diskimage');
      return res.sendFile(dmgPath);
    }
  }
  res.status(404).json({
    status: 'macos_instructions',
    message: 'Paket macOS (.dmg) siap dikompilasi pada lingkungan macOS dengan "npm run build:mac". Binary Windows (.exe) sudah aktif dan tersedia untuk diunduh.'
  });
});

// Static files for Modern Web UI with zero cache
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  maxAge: 0
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 400 * 1024 * 1024 } // 400MB max per file
});

// ----------------------------------------------------
// API: REAL-TIME HARDWARE & SYSTEM STATUS
// ----------------------------------------------------
app.get('/api/system-hardware', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const ramPercent = Math.round((usedMem / totalMem) * 100);
  const memUsage = process.memoryUsage();

  res.json({
    totalRamGB: (totalMem / (1024 ** 3)).toFixed(1),
    usedRamGB: (usedMem / (1024 ** 3)).toFixed(1),
    freeRamGB: (freeMem / (1024 ** 3)).toFixed(1),
    ramPercent,
    processRssMB: (memUsage.rss / (1024 ** 2)).toFixed(1),
    cpuCores: os.cpus().length,
    cpuModel: os.cpus()[0] ? os.cpus()[0].model.trim() : 'Standard CPU',
    platform: os.platform()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'App MyQ',
    version: '1.1.0',
    capabilities: [
      'Image Compression (All Formats: JPG, PNG, WEBP, AVIF, TIFF, GIF, BMP, SVG)',
      'Target File Size Compression (Exact KB / MB)',
      'AI & HD Super-Resolution Upscaling (2x, 4x, 8x)',
      'PDF Compression & Object Streams',
      'Adobe Suite Downgrader (Premiere Pro, After Effects, Photoshop, Illustrator, InDesign)',
      'Universal Multi-Format Media Converter',
      'Windows Multi-Resolution ICO Generator'
    ]
  });
});

// ----------------------------------------------------
// API: COMPRESS IMAGE
// ----------------------------------------------------
app.post('/api/compress/image', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    }

    const { quality, preset, stripMetadata, format, maxWidth, maxHeight, targetSize, targetUnit } = req.body;
    let targetBytes = null;
    if (targetSize && parseFloat(targetSize) > 0) {
      const mult = targetUnit === 'MB' ? 1024 * 1024 : 1024;
      targetBytes = Math.round(parseFloat(targetSize) * mult);
    }

    const results = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const compressed = await imageService.compressImage(file.buffer, file.originalname, {
        quality,
        preset,
        stripMetadata: stripMetadata !== 'false',
        format: format || ext,
        maxWidth,
        maxHeight,
        targetBytes
      });

      const base64Data = `data:image/${compressed.format};base64,${compressed.buffer.toString('base64')}`;
      results.push({
        filename: file.originalname,
        outputName: `${path.parse(file.originalname).name}_compressed.${compressed.format === 'jpeg' ? 'jpg' : compressed.format}`,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        savedBytes: compressed.savedBytes,
        savedPercent: compressed.savedPercent,
        format: compressed.format,
        width: compressed.width,
        height: compressed.height,
        previewUrl: base64Data
      });
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error('Error compressing image:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// API: UPSCALE IMAGE
// ----------------------------------------------------
app.post('/api/upscale/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah.' });
    }

    const { scale, mode, denoise } = req.body;
    const upscaled = await imageService.upscaleImage(req.file.buffer, {
      scale: parseFloat(scale) || 2,
      mode: mode || 'ai-neural',
      denoise
    });

    const originalDataUrl = `data:${req.file.mimetype || 'image/jpeg'};base64,${req.file.buffer.toString('base64')}`;
    const upscaledDataUrl = `data:image/${upscaled.format};base64,${upscaled.buffer.toString('base64')}`;

    res.json({
      success: true,
      filename: req.file.originalname,
      outputName: `${path.parse(req.file.originalname).name}_upscaled_${upscaled.scale}x.${upscaled.format === 'jpeg' ? 'jpg' : upscaled.format}`,
      scale: upscaled.scale,
      originalWidth: upscaled.originalWidth,
      originalHeight: upscaled.originalHeight,
      upscaledWidth: upscaled.upscaledWidth,
      upscaledHeight: upscaled.upscaledHeight,
      originalSize: upscaled.originalSize,
      upscaledSize: upscaled.upscaledSize,
      format: upscaled.format,
      originalPreview: originalDataUrl,
      upscaledPreview: upscaledDataUrl
    });
  } catch (err) {
    console.error('Error upscaling image:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// API: COMPRESS PDF
// ----------------------------------------------------
app.post('/api/compress/pdf', upload.array('files', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Tidak ada file PDF yang diunggah.' });
    }

    const { stripMetadata } = req.body;
    const results = [];

    for (const file of req.files) {
      const compressed = await pdfService.compressPdf(file.buffer, {
        stripMetadata: stripMetadata !== 'false'
      });

      const base64Data = `data:application/pdf;base64,${compressed.buffer.toString('base64')}`;
      results.push({
        filename: file.originalname,
        outputName: `${path.parse(file.originalname).name}_compressed.pdf`,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        savedBytes: compressed.savedBytes,
        savedPercent: compressed.savedPercent,
        pageCount: compressed.pageCount,
        previewUrl: base64Data
      });
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error('Error compressing PDF:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// API: ADOBE SUITE DOWNGRADER & INSPECTOR
// ----------------------------------------------------
app.get('/api/adobe/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(downloadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('File unduhan tidak ditemukan.');

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.sendFile(filePath);
});

// 1. Premiere Pro (.prproj)
app.post('/api/adobe/inspect-prproj', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const data = adobeService.inspectPremiereProject(req.file.buffer);
    res.json({ success: true, filename: req.file.originalname, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/adobe/downgrade-prproj', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const targetVersion = req.body.targetVersion;
    const result = adobeService.downgradePremiereProject(req.file.buffer, targetVersion);
    const baseName = path.parse(req.file.originalname).name;
    const outputFilename = `${baseName}_v${result.targetVerNum}_downgraded.prproj`;
    const outputPath = path.join(downloadsDir, outputFilename);
    fs.writeFileSync(outputPath, result.buffer);

    res.json({
      success: true,
      outputFilename,
      downloadUrl: `/downloads/${encodeURIComponent(outputFilename)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. After Effects (.aep & .aepx)
app.post('/api/adobe/inspect-after-effects', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const data = adobeService.inspectAfterEffectsProject(req.file.buffer, req.file.originalname);
    res.json({ success: true, filename: req.file.originalname, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/adobe/downgrade-after-effects', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const targetVersion = req.body.targetVersion || '17.0';
    const result = adobeService.downgradeAfterEffectsProject(req.file.buffer, req.file.originalname, targetVersion);
    const baseName = path.parse(req.file.originalname).name;
    const outputFilename = `${baseName}_v${targetVersion}${result.outputExtension}`;
    const outputPath = path.join(downloadsDir, outputFilename);
    fs.writeFileSync(outputPath, result.buffer);

    res.json({
      success: true,
      outputFilename,
      downloadUrl: `/downloads/${encodeURIComponent(outputFilename)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Photoshop (.psd)
app.post('/api/adobe/inspect-photoshop', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const data = adobeService.inspectPhotoshopFile(req.file.buffer);
    res.json({ success: true, filename: req.file.originalname, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/adobe/downgrade-photoshop', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const targetVersion = req.body.targetVersion || 'CS6';
    const result = adobeService.downgradePhotoshopFile(req.file.buffer);
    const baseName = path.parse(req.file.originalname).name;
    const outputFilename = `${baseName}_compatible_${targetVersion}.psd`;
    const outputPath = path.join(downloadsDir, outputFilename);
    fs.writeFileSync(outputPath, result.buffer);

    res.json({
      success: true,
      outputFilename,
      downloadUrl: `/downloads/${encodeURIComponent(outputFilename)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Illustrator (.ai)
app.post('/api/adobe/inspect-illustrator', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const data = adobeService.inspectIllustratorFile(req.file.buffer);
    res.json({ success: true, filename: req.file.originalname, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/adobe/downgrade-illustrator', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diunggah.' });
    const targetVersion = req.body.targetVersion || 'CS6';
    const result = adobeService.downgradeIllustratorFile(req.file.buffer, targetVersion);
    const baseName = path.parse(req.file.originalname).name;
    const outputFilename = `${baseName}_${targetVersion}_compatible.ai`;
    const outputPath = path.join(downloadsDir, outputFilename);
    fs.writeFileSync(outputPath, result.buffer);

    res.json({
      success: true,
      outputFilename,
      downloadUrl: `/downloads/${encodeURIComponent(outputFilename)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. JSX Script Generator for Batch Automation
app.post('/api/adobe/generate-jsx-script', (req, res) => {
  try {
    const { appType, targetYear } = req.body;
    const script = adobeService.generateAdobeDowngradeScript(appType, targetYear);
    res.json({ success: true, script, filename: `downgrade_${appType.toLowerCase()}.jsx` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// API: UNIVERSAL FORMAT CONVERTER
// ----------------------------------------------------
app.post('/api/convert/image', upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Tidak ada file gambar yang diunggah.' });
    }

    const { targetFormat, quality, bgColor } = req.body;
    if (!targetFormat) {
      return res.status(400).json({ error: 'Format target belum dipilih.' });
    }

    const results = [];

    for (const file of req.files) {
      const converted = await imageService.convertFormat(file.buffer, targetFormat, {
        quality,
        bgColor
      });

      const extOut = converted.format === 'jpeg' ? 'jpg' : converted.format;
      const base64Data = `data:${converted.mime};base64,${converted.buffer.toString('base64')}`;

      results.push({
        filename: file.originalname,
        outputName: `${path.parse(file.originalname).name}.${extOut}`,
        format: converted.format,
        mime: converted.mime,
        originalSize: converted.originalSize,
        convertedSize: converted.convertedSize,
        width: converted.width,
        height: converted.height,
        previewUrl: base64Data
      });
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error('Error converting format:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// API: BATCH ZIP DOWNLOAD
// ----------------------------------------------------
app.post('/api/batch/zip', async (req, res) => {
  try {
    const { items, zipName } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Daftar file kosong.' });
    }

    const zip = new JSZip();

    for (const item of items) {
      if (item.data && item.filename) {
        const matches = item.data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          zip.file(item.filename, buffer);
        }
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const finalZipName = zipName ? `${zipName}.zip` : 'appmyq_processed_files.zip';

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${finalZipName}"`);
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error creating ZIP archive:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
let serverInstance = null;
if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`🚀 App MyQ Backend running on http://localhost:${PORT}`);
  });
}

module.exports = { app, server: serverInstance };
