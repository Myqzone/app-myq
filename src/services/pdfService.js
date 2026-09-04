const { PDFDocument } = require('pdf-lib');

/**
 * PDF Compression & Optimization Engine
 */
async function compressPdf(inputBuffer, options = {}) {
  const originalSize = inputBuffer.length;
  const stripMetadata = options.stripMetadata !== false;

  try {
    const pdfDoc = await PDFDocument.load(inputBuffer, { 
      ignoreEncryption: true,
      parseSpeed: 1 
    });

    const pageCount = pdfDoc.getPageCount();

    if (stripMetadata) {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('OmniMedia Studio Pro');
      pdfDoc.setCreator('OmniMedia Studio Pro');
    }

    // Save with useObjectStreams: true for maximum stream compression
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50
    });

    const compressedBuffer = Buffer.from(compressedBytes);
    const compressedSize = compressedBuffer.length;
    const savedBytes = originalSize - compressedSize;
    const savedPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : 0;

    return {
      buffer: compressedBuffer,
      pageCount,
      originalSize,
      compressedSize,
      savedBytes,
      savedPercent: parseFloat(savedPercent)
    };
  } catch (err) {
    throw new Error('Gagal memproses file PDF: ' + err.message);
  }
}

module.exports = {
  compressPdf
};
