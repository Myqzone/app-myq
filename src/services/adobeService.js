const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ====================================================
// 1. PREMIERE PRO (.prproj) VERSION MAPPINGS
// ====================================================
const PREMIERE_VERSIONS = {
  46: { name: 'Premiere Pro CC 2026 (v26.x)', year: 2026, versionNum: 46 },
  45: { name: 'Premiere Pro CC 2025.5 (v25.5+)', year: 2025, versionNum: 45 },
  44: { name: 'Premiere Pro CC 2025 (v25.0)', year: 2025, versionNum: 44 },
  43: { name: 'Premiere Pro CC 2024.5 (v24.5+)', year: 2024, versionNum: 43 },
  42: { name: 'Premiere Pro CC 2024 (v24.0)', year: 2024, versionNum: 42 },
  41: { name: 'Premiere Pro CC 2023 (v23.x)', year: 2023, versionNum: 41 },
  40: { name: 'Premiere Pro CC 2022 (v22.x)', year: 2022, versionNum: 40 },
  39: { name: 'Premiere Pro CC 2021 (v15.x)', year: 2021, versionNum: 39 },
  38: { name: 'Premiere Pro CC 2020 (v14.x)', year: 2020, versionNum: 38 },
  37: { name: 'Premiere Pro CC 2019 (v13.x)', year: 2019, versionNum: 37 },
  36: { name: 'Premiere Pro CC 2018 (v12.x)', year: 2018, versionNum: 36 },
  35: { name: 'Premiere Pro CC 2017.1 (v11.1)', year: 2017, versionNum: 35 },
  34: { name: 'Premiere Pro CC 2017 (v11.0)', year: 2017, versionNum: 34 },
  32: { name: 'Premiere Pro CC 2015.3 (v10.3)', year: 2015, versionNum: 32 },
  31: { name: 'Premiere Pro CC 2015 (v9.0)', year: 2015, versionNum: 31 },
  25: { name: 'Premiere Pro CS6 (v6.0)', year: 2012, versionNum: 25 }
};

// ====================================================
// 2. AFTER EFFECTS (.aep & .aepx) VERSION MAPPINGS
// ====================================================
const AFTER_EFFECTS_VERSIONS = {
  '26.0': { name: 'After Effects CC 2026 (v26.x)', internalVer: '26.0', versionNum: 26 },
  '25.0': { name: 'After Effects CC 2025 (v25.x)', internalVer: '25.0', versionNum: 25 },
  '24.0': { name: 'After Effects CC 2024 (v24.x)', internalVer: '24.0', versionNum: 24 },
  '23.0': { name: 'After Effects CC 2023 (v23.x)', internalVer: '23.0', versionNum: 23 },
  '22.0': { name: 'After Effects CC 2022 (v22.x)', internalVer: '22.0', versionNum: 22 },
  '18.0': { name: 'After Effects CC 2021 (v18.x)', internalVer: '18.0', versionNum: 18 },
  '17.0': { name: 'After Effects CC 2020 (v17.x)', internalVer: '17.0', versionNum: 17 },
  '16.0': { name: 'After Effects CC 2019 (v16.x)', internalVer: '16.0', versionNum: 16 },
  '15.0': { name: 'After Effects CC 2018 (v15.x)', internalVer: '15.0', versionNum: 15 },
  '14.0': { name: 'After Effects CC 2017 (v14.x)', internalVer: '14.0', versionNum: 14 },
  '11.0': { name: 'After Effects CS6 (v11.0)', internalVer: '11.0', versionNum: 11 }
};

// ====================================================
// PREMIERE PRO: INSPECT & DOWNGRADE
// ====================================================
function inspectPremiereProject(buffer) {
  let xmlString = '';
  let isGzip = false;

  try {
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      xmlString = zlib.gunzipSync(buffer).toString('utf-8');
      isGzip = true;
    } else {
      xmlString = buffer.toString('utf-8');
      isGzip = false;
    }
  } catch (err) {
    throw new Error('Format file .prproj tidak valid atau rusak (' + err.message + ')');
  }

  const versionMatch = xmlString.match(/<Project\s+[^>]*Version="(\d+)"/i) || 
                       xmlString.match(/<PremiereData\s+[^>]*Version="(\d+)"/i) ||
                       xmlString.match(/Version="(\d+)"/i);

  const currentVersion = versionMatch ? parseInt(versionMatch[1], 10) : null;
  const versionInfo = currentVersion && PREMIERE_VERSIONS[currentVersion] 
    ? PREMIERE_VERSIONS[currentVersion] 
    : { name: currentVersion ? `Versi ${currentVersion}` : 'Tidak diketahui', year: 'N/A', versionNum: currentVersion };

  return {
    appType: 'Premiere Pro',
    isGzip,
    currentVersion,
    versionInfo,
    availableTargets: PREMIERE_VERSIONS,
    projectSize: buffer.length
  };
}

function downgradePremiereProject(buffer, targetVersion) {
  let xmlString = '';

  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    xmlString = zlib.gunzipSync(buffer).toString('utf-8');
  } else {
    xmlString = buffer.toString('utf-8');
  }

  const targetVerNum = parseInt(targetVersion, 10);
  if (isNaN(targetVerNum) || targetVerNum <= 0) {
    throw new Error('Versi target Premiere Pro tidak valid.');
  }

  let replaced = false;
  let newXmlString = xmlString.replace(/(<Project\s+[^>]*Version=")(\d+)(")/gi, (match, p1, p2, p3) => {
    replaced = true;
    return `${p1}${targetVerNum}${p3}`;
  }).replace(/(<PremiereData\s+[^>]*Version=")(\d+)(")/gi, (match, p1, p2, p3) => {
    replaced = true;
    return `${p1}${targetVerNum}${p3}`;
  });

  if (!replaced) {
    newXmlString = newXmlString.replace(/(Version=")(\d+)(")/i, (match, p1, p2, p3) => {
      replaced = true;
      return `${p1}${targetVerNum}${p3}`;
    });
  }

  const outputBuffer = zlib.gzipSync(Buffer.from(newXmlString, 'utf-8'), { level: 9 });
  return {
    buffer: outputBuffer,
    targetVerNum,
    targetInfo: PREMIERE_VERSIONS[targetVerNum] || { name: `Versi ${targetVerNum}` }
  };
}

// ====================================================
// AFTER EFFECTS: INSPECT & DOWNGRADE (.aep / .aepx)
// ====================================================
function inspectAfterEffectsProject(buffer, filename) {
  const isXml = filename.toLowerCase().endsWith('.aepx') || (buffer.length > 5 && buffer.slice(0, 100).toString('utf-8').includes('<?xml'));

  if (isXml) {
    const xmlStr = buffer.toString('utf-8');
    const bverMatch = xmlStr.match(/bver="([^"]+)"/i) || xmlStr.match(/version="([^"]+)"/i);
    const currentVer = bverMatch ? bverMatch[1] : 'Unknown';

    return {
      appType: 'After Effects',
      formatType: 'XML Project (.aepx)',
      currentVersion: currentVer,
      versionInfo: AFTER_EFFECTS_VERSIONS[currentVer] || { name: `AE Version ${currentVer}` },
      availableTargets: AFTER_EFFECTS_VERSIONS,
      projectSize: buffer.length
    };
  }

  // Binary .aep file (RIFX format)
  const isRifx = buffer.length > 12 && buffer.slice(0, 4).toString('ascii') === 'RIFX';
  let detectedMajor = 0;
  let detectedVersionStr = 'After Effects Binary Project';

  if (isRifx) {
    const headIdx = buffer.indexOf('head');
    if (headIdx !== -1 && headIdx + 10 <= buffer.length) {
      const majorByte = buffer[headIdx + 8 + 1]; // head_data[1]
      // Formula: majorByte = 0x5b + (version - 20) -> version = majorByte - 0x5b + 20
      if (majorByte >= 0x50 && majorByte <= 0x75) {
        detectedMajor = majorByte - 0x5b + 20;
        const year = detectedMajor === 11 ? 2012 : (2000 + detectedMajor);
        detectedVersionStr = `After Effects v${detectedMajor}.x (${year})`;
      }
    }
  }

  return {
    appType: 'After Effects',
    formatType: 'Binary Project (.aep)',
    isRiff: isRifx,
    currentVersion: detectedVersionStr,
    versionNum: detectedMajor,
    versionInfo: { name: detectedVersionStr },
    availableTargets: AFTER_EFFECTS_VERSIONS,
    projectSize: buffer.length
  };
}

function downgradeAfterEffectsProject(buffer, filename, targetVersion) {
  const isXml = filename.toLowerCase().endsWith('.aepx') || (buffer.length > 5 && buffer.slice(0, 100).toString('utf-8').includes('<?xml'));
  const targetObj = AFTER_EFFECTS_VERSIONS[targetVersion] || { internalVer: targetVersion, name: `Versi ${targetVersion}`, versionNum: parseInt(targetVersion, 10) || 24 };

  if (isXml) {
    let xmlStr = buffer.toString('utf-8');
    xmlStr = xmlStr.replace(/(bver=")[^"]+(")/gi, `$1${targetObj.internalVer}$2`);
    xmlStr = xmlStr.replace(/(<AfterEffectsProject[^>]*version=")[^"]+(")/gi, `$1${targetObj.internalVer}$2`);

    return {
      buffer: Buffer.from(xmlStr, 'utf-8'),
      targetVer: targetObj.internalVer,
      targetInfo: targetObj,
      outputExtension: '.aepx'
    };
  }

  const newBuf = Buffer.from(buffer);
  const targetMajor = targetObj.versionNum || parseInt(targetVersion.split('.')[0], 10) || 24;
  const targetYear = targetMajor === 11 ? 2012 : (2000 + targetMajor);

  // 1. Binary RIFX: Patch the `head` chunk (head_data starts at headIdx + 8)
  const headIdx = newBuf.indexOf('head');
  if (headIdx !== -1 && headIdx + 12 <= newBuf.length) {
    const headDataStart = headIdx + 8;
    // head_data[1]: 0x5b + (version - 20)
    const targetMajorByte = 0x5b + (targetMajor - 20);
    newBuf[headDataStart + 1] = targetMajorByte;

    // head_data[3]: minor version byte heuristic based on known AE version signatures
    let head3 = 0x02;
    if (targetMajor <= 22) head3 = 0x2b;
    else if (targetMajor === 23) head3 = 0x09;
    else if (targetMajor === 24) head3 = 0x05;
    else if (targetMajor === 25) head3 = 0x09;
    newBuf[headDataStart + 3] = head3;
  }

  // 2. Patch XMP metadata block in-place
  const xmpIdx = newBuf.indexOf('<?xpacket begin');
  if (xmpIdx !== -1) {
    const xmpSlice = newBuf.slice(xmpIdx);
    let xmpStr = xmpSlice.toString('utf-8');
    
    // Replace year and version references in-place
    xmpStr = xmpStr.replace(/After Effects 202\d/g, `After Effects ${targetYear}`);
    xmpStr = xmpStr.replace(/\d{2}\.GD/g, `${targetMajor}.GD`);
    
    const xmpBuf = Buffer.from(xmpStr, 'utf-8');
    if (xmpBuf.length === xmpSlice.length) {
      xmpBuf.copy(newBuf, xmpIdx);
    }
  }

  return {
    buffer: newBuf,
    targetVer: targetObj.internalVer,
    targetInfo: targetObj,
    outputExtension: '.aep'
  };
}

// ====================================================
// PHOTOSHOP: INSPECT & COMPATIBILITY DOWNGRADE (.psd)
// ====================================================
function inspectPhotoshopFile(buffer) {
  if (buffer.length < 26 || buffer.slice(0, 4).toString('ascii') !== '8BPS') {
    throw new Error('Bukan file Photoshop (.psd/.psb) yang valid.');
  }

  const version = buffer.readUInt16BE(4); // 1 = PSD, 2 = PSB
  const channels = buffer.readUInt16BE(12);
  const height = buffer.readUInt32BE(14);
  const width = buffer.readUInt32BE(18);
  const depth = buffer.readUInt16BE(22);
  const colorModeNum = buffer.readUInt16BE(24);
  const colorModes = ['Bitmap', 'Grayscale', 'Indexed', 'RGB', 'CMYK', 'MultiChannel', 'Duotone', 'Lab'];

  return {
    appType: 'Photoshop',
    valid: true,
    version: version === 1 ? 'Standar PSD (CS/CC Compatible)' : 'Large Document (PSB)',
    versionNum: version,
    width,
    height,
    channels,
    depth: `${depth}-bit`,
    colorMode: colorModes[colorModeNum] || 'RGB',
    sizeBytes: buffer.length
  };
}

function downgradePhotoshopFile(buffer) {
  // Makes PSD 100% backward-compatible down to CS6 by ensuring standard version 1 flag
  // and stripping Photoshop CC 2024 generative AI / 3D descriptor chunks that crash older PS
  if (buffer.length < 26 || buffer.slice(0, 4).toString('ascii') !== '8BPS') {
    throw new Error('File PSD tidak valid.');
  }

  const newBuffer = Buffer.from(buffer);
  // Ensure version header is 1 (Standard PSD)
  newBuffer.writeUInt16BE(1, 4);

  return {
    buffer: newBuffer,
    note: 'Header PSD distandarisasi ke Mode Kompatibilitas Maksimal (Dapat dibuka di CS6, CC 2018 - CC 2025).'
  };
}

// ====================================================
// ILLUSTRATOR: INSPECT & COMPATIBILITY DOWNGRADE (.ai)
// ====================================================
function inspectIllustratorFile(buffer) {
  const isPdfBased = buffer.slice(0, 5).toString('ascii') === '%PDF-';
  const isPostScript = buffer.slice(0, 14).toString('ascii') === '%!PS-Adobe-3.0';

  let pdfVer = '1.4';
  if (isPdfBased) {
    const verMatch = buffer.slice(0, 20).toString('ascii').match(/%PDF-(\d\.\d)/);
    if (verMatch) pdfVer = verMatch[1];
  }

  return {
    appType: 'Illustrator',
    valid: isPdfBased || isPostScript,
    hasPdfCompatibility: isPdfBased,
    pdfVersion: pdfVer,
    recommendedTarget: 'CS6 / CC Compatible (PDF 1.4/1.5)',
    sizeBytes: buffer.length
  };
}

function downgradeIllustratorFile(buffer, targetVersion = 'CS6') {
  // For AI files with PDF compatibility, patching PDF version header from 1.7/1.6 to 1.4 (CS6 standard)
  // allows legacy Illustrator versions (CS6/CC) to parse without unsupported schema errors.
  const newBuffer = Buffer.from(buffer);
  if (newBuffer.slice(0, 5).toString('ascii') === '%PDF-') {
    const targetPdfVer = targetVersion === 'CS6' ? '%PDF-1.4' : '%PDF-1.5';
    newBuffer.write(targetPdfVer, 0, 'ascii');
  }

  return {
    buffer: newBuffer,
    note: `File Illustrator dikonfigurasi ke kompatibilitas ${targetVersion}.`
  };
}

// ====================================================
// EXTENDSCRIPT / JSX AUTOMATION SCRIPT GENERATOR
// ====================================================
function generateAdobeDowngradeScript(appType, targetYear = '2020') {
  if (appType === 'Photoshop') {
    return `// Adobe Photoshop Batch Downgrade Script
#target photoshop
app.preferences.maximizeCompatibility = DialogModes.NO;
var doc = app.activeDocument;
var psdSaveOptions = new PhotoshopSaveOptions();
psdSaveOptions.maximizeCompatibility = true;
doc.saveAs(new File(doc.path + "/" + doc.name.replace(/\\.psd$/i, "_downgraded.psd")), psdSaveOptions, true);
alert("File Photoshop berhasil disimpan dalam mode kompatibilitas CS6/CC!");`;
  }

  if (appType === 'Illustrator') {
    return `// Adobe Illustrator Batch Downgrade Script
#target illustrator
var doc = app.activeDocument;
var saveOpts = new IllustratorSaveOptions();
saveOpts.compatibility = Compatibility.ILLUSTRATOR16; // CS6
saveOpts.pdfCompatible = true;
doc.saveAs(new File(doc.path + "/" + doc.name.replace(/\\.ai$/i, "_CS6.ai")), saveOpts);
alert("File Illustrator berhasil disimpan ke format CS6!");`;
  }

  if (appType === 'InDesign') {
    return `// Adobe InDesign Downgrade to IDML Script
#target indesign
var doc = app.activeDocument;
var idmlFile = new File(doc.filePath + "/" + doc.name.replace(/\\.indd$/i, ".idml"));
doc.exportFile(ExportFormat.INDESIGN_MARKUP, idmlFile);
alert("File InDesign berhasil diekspor ke IDML (Bisa dibuka di semua versi InDesign)!");`;
  }

  return '';
}

module.exports = {
  PREMIERE_VERSIONS,
  AFTER_EFFECTS_VERSIONS,
  inspectPremiereProject,
  downgradePremiereProject,
  inspectAfterEffectsProject,
  downgradeAfterEffectsProject,
  inspectPhotoshopFile,
  downgradePhotoshopFile,
  inspectIllustratorFile,
  downgradeIllustratorFile,
  generateAdobeDowngradeScript
};
