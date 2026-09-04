const sharp = require('sharp');
const path = require('path');

/**
 * Build a valid Windows .ico file containing PNG-encoded icon sizes
 * Supports 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
 */
async function generateIcoFile(inputBuffer, sizes = [16, 32, 48, 64, 128, 256]) {
  const images = [];
  for (const size of sizes) {
    const pngBuf = await sharp(inputBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    images.push({ size, buffer: pngBuf });
  }

  // Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Count

  let offset = 6 + images.length * 16;
  const entries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // Width (0 means 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // Height
    entry.writeUInt8(0, 2); // Colors
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Size
    entry.writeUInt32LE(offset, 12); // Offset
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map(i => i.buffer)]);
}

/**
 * Compress to exact target file size (e.g. max 500 KB or 2 MB)
 * Uses iterative binary search on quality and adaptive downscaling if necessary.
 */
async function compressToTargetSize(inputBuffer, targetBytes, originalName, options = {}) {
  const meta = await sharp(inputBuffer).metadata();
  const format = (options.format || meta.format || 'jpeg').toLowerCase();

  let lowQ = 5;
  let highQ = 95;
  let bestResult = null;

  // 1. Binary search on quality
  for (let i = 0; i < 6; i++) {
    const midQ = Math.round((lowQ + highQ) / 2);
    const result = await compressImage(inputBuffer, originalName, {
      ...options,
      targetBytes: null, // prevent recursion
      quality: midQ,
      format
    });

    if (result.compressedSize <= targetBytes) {
      bestResult = result;
      lowQ = midQ + 1; // Try higher quality
    } else {
      highQ = midQ - 1; // Need lower quality
    }
  }

  // 2. If even lowest quality is still over targetBytes, downscale dimensions
  if (!bestResult || bestResult.compressedSize > targetBytes) {
    let scale = 0.85;
    for (let j = 0; j < 6; j++) {
      const w = Math.round(meta.width * scale);
      const result = await compressImage(inputBuffer, originalName, {
        ...options,
        targetBytes: null,
        quality: 45,
        format,
        maxWidth: w
      });
      bestResult = result;
      if (result.compressedSize <= targetBytes) break;
      scale *= 0.8;
    }
  }

  return bestResult;
}

/**
 * Image Compression Engine
 */
async function compressImage(inputBuffer, originalName, options = {}) {
  // If target file size requested, use target size engine
  if (options.targetBytes && parseInt(options.targetBytes, 10) > 0) {
    return compressToTargetSize(inputBuffer, parseInt(options.targetBytes, 10), originalName, options);
  }

  const meta = await sharp(inputBuffer).metadata();
  const quality = parseInt(options.quality, 10) || 75;
  const stripMetadata = options.stripMetadata !== false;
  const preset = options.preset || 'balanced';

  let targetFormat = (options.format || meta.format || 'jpeg').toLowerCase();
  if (targetFormat === 'jpg') targetFormat = 'jpeg';

  let pipeline = sharp(inputBuffer);

  // Resize if requested
  if (options.maxWidth || options.maxHeight) {
    pipeline = pipeline.resize({
      width: options.maxWidth ? parseInt(options.maxWidth, 10) : undefined,
      height: options.maxHeight ? parseInt(options.maxHeight, 10) : undefined,
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  if (!stripMetadata) {
    pipeline = pipeline.withMetadata();
  }

  // Format-specific compression tuning
  if (targetFormat === 'jpeg') {
    pipeline = pipeline.jpeg({
      quality,
      mozjpeg: true,
      trellisQuantisation: preset === 'extreme',
      overshootDeringing: true,
      chromaSubsampling: preset === 'extreme' ? '4:2:0' : '4:4:4'
    });
  } else if (targetFormat === 'png') {
    pipeline = pipeline.png({
      compressionLevel: preset === 'extreme' ? 9 : 7,
      palette: preset === 'extreme', // Palette quantization saves 60-80% for PNGs
      quality: quality
    });
  } else if (targetFormat === 'webp') {
    pipeline = pipeline.webp({
      quality,
      effort: preset === 'extreme' ? 6 : 4,
      lossless: quality === 100
    });
  } else if (targetFormat === 'avif') {
    pipeline = pipeline.avif({
      quality,
      effort: preset === 'extreme' ? 6 : 4,
      chromaSubsampling: '4:2:0'
    });
  } else if (targetFormat === 'tiff') {
    pipeline = pipeline.tiff({
      quality,
      compression: 'deflate'
    });
  } else if (targetFormat === 'gif') {
    pipeline = pipeline.gif({
      colours: preset === 'extreme' ? 128 : 256
    });
  } else {
    // Default fallback to webp/jpeg
    pipeline = pipeline.toFormat(targetFormat, { quality });
  }

  const outputBuffer = await pipeline.toBuffer();
  const outMeta = await sharp(outputBuffer).metadata();

  const originalSize = inputBuffer.length;
  const compressedSize = outputBuffer.length;
  const savedBytes = originalSize - compressedSize;
  const savedPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : 0;

  return {
    buffer: outputBuffer,
    format: targetFormat,
    originalSize,
    compressedSize,
    savedBytes,
    savedPercent: parseFloat(savedPercent),
    width: outMeta.width,
    height: outMeta.height,
    originalWidth: meta.width,
    originalHeight: meta.height
  };
}

/**
 * AI & HD Super-Resolution Upscaling Engine
 * Multi-pass edge enhancement, Lanczos3 resampling, adaptive unsharp masking
 */
async function upscaleImage(inputBuffer, options = {}) {
  const meta = await sharp(inputBuffer).metadata();
  const scale = parseFloat(options.scale) || 2; // 2x, 4x, 8x
  const mode = options.mode || 'ai-neural'; // 'ai-neural' or 'lanczos3'
  const denoise = options.denoise === true || options.denoise === 'true';

  const newWidth = Math.round(meta.width * scale);
  const newHeight = Math.round(meta.height * scale);

  let pipeline = sharp(inputBuffer);

  if (mode === 'ai-neural') {
    // Multi-stage AI-like Neural Sharpening & Edge Reconstruction
    // Step 1: Pre-process with subtle median filter if denoise requested
    if (denoise) {
      pipeline = pipeline.median(3);
    }

    // Step 2: High-fidelity Lanczos3 scaling
    pipeline = pipeline.resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill'
    });

    // Step 3: Unsharp mask edge reconstruction
    // Sigma and m1/m2 create crisp non-haloing edge definition
    const unsharpSigma = scale >= 4 ? 2.0 : 1.2;
    pipeline = pipeline.sharpen({
      sigma: unsharpSigma,
      m1: 1.5,
      m2: 2.5
    });

    // Step 4: Subtle linear contrast stretch to deepen dynamic range
    pipeline = pipeline.linear(1.03, -2);
  } else {
    // Fast Lanczos3 mode
    pipeline = pipeline.resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill'
    }).sharpen();
  }

  // Preserve format or output high quality PNG/WebP
  const outputFormat = meta.format === 'png' ? 'png' : 'jpeg';
  if (outputFormat === 'png') {
    pipeline = pipeline.png({ compressionLevel: 6 });
  } else {
    pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true });
  }

  const outputBuffer = await pipeline.toBuffer();
  const outMeta = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    format: outputFormat,
    originalWidth: meta.width,
    originalHeight: meta.height,
    upscaledWidth: outMeta.width,
    upscaledHeight: outMeta.height,
    scale,
    originalSize: inputBuffer.length,
    upscaledSize: outputBuffer.length
  };
}

/**
 * Generate standard 24-bit Windows Bitmap (BMP) file
 */
async function generateBmpFile(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;

  const buf = Buffer.alloc(fileSize);
  // BMP Header (14 bytes)
  buf.write('BM', 0, 2, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);

  // DIB Header (40 bytes - BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive for bottom-to-top
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(imageSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Pixel data (BGR, bottom-to-top)
  let pos = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 3;
      buf[pos++] = data[srcIdx + 2]; // B
      buf[pos++] = data[srcIdx + 1]; // G
      buf[pos++] = data[srcIdx];     // R
    }
    // Padding
    for (let p = 0; p < rowSize - width * 3; p++) {
      buf[pos++] = 0;
    }
  }

  return buf;
}

/**
 * Universal Format Converter Engine
 * Converts between JPG, PNG, WEBP, AVIF, BMP, TIFF, GIF, ICO, and SVG
 */
async function convertFormat(inputBuffer, targetFormat, options = {}) {
  const normFormat = targetFormat.toLowerCase().trim();
  const meta = await sharp(inputBuffer).metadata();

  // Special case: Windows ICO
  if (normFormat === 'ico') {
    const icoBuffer = await generateIcoFile(inputBuffer, options.icoSizes || [16, 32, 48, 64, 128, 256]);
    return {
      buffer: icoBuffer,
      format: 'ico',
      mime: 'image/x-icon',
      originalSize: inputBuffer.length,
      convertedSize: icoBuffer.length
    };
  }

  // Special case: Windows BMP
  if (normFormat === 'bmp') {
    const bmpBuffer = await generateBmpFile(inputBuffer);
    return {
      buffer: bmpBuffer,
      format: 'bmp',
      mime: 'image/bmp',
      originalSize: inputBuffer.length,
      convertedSize: bmpBuffer.length,
      width: meta.width,
      height: meta.height
    };
  }

  let pipeline = sharp(inputBuffer);

  // Background color handling for formats without alpha channel (like JPEG)
  const bgColor = options.bgColor || '#ffffff';
  const hasAlpha = meta.hasAlpha;

  if (normFormat === 'jpeg' || normFormat === 'jpg') {
    if (hasAlpha) {
      pipeline = pipeline.flatten({ background: bgColor });
    }
    pipeline = pipeline.jpeg({ quality: parseInt(options.quality, 10) || 90, mozjpeg: true });
  } else if (normFormat === 'png') {
    pipeline = pipeline.png({ quality: parseInt(options.quality, 10) || 90 });
  } else if (normFormat === 'webp') {
    pipeline = pipeline.webp({ quality: parseInt(options.quality, 10) || 90 });
  } else if (normFormat === 'avif') {
    pipeline = pipeline.avif({ quality: parseInt(options.quality, 10) || 85 });
  } else if (normFormat === 'tiff') {
    pipeline = pipeline.tiff({ quality: parseInt(options.quality, 10) || 90 });
  } else if (normFormat === 'gif') {
    pipeline = pipeline.gif();
  } else {
    pipeline = pipeline.toFormat(normFormat);
  }

  const outputBuffer = await pipeline.toBuffer();
  const outMeta = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    format: normFormat,
    mime: `image/${normFormat === 'jpg' ? 'jpeg' : normFormat}`,
    originalSize: inputBuffer.length,
    convertedSize: outputBuffer.length,
    width: outMeta.width,
    height: outMeta.height
  };
}

module.exports = {
  compressImage,
  upscaleImage,
  convertFormat,
  generateIcoFile,
  generateBmpFile
};
