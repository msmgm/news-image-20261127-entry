import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function fail(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

try {
  // Resolve input path from import.meta.url (never process.cwd())
  const inputPath = fileURLToPath(new URL('./entry.png', import.meta.url));

  // Determine output directory from MAKEFUN_OUTPUT_DIR env or fallback to /output
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

  // Read input file bytes
  let buf: Buffer;
  try {
    buf = readFileSync(inputPath);
  } catch (err) {
    fail(`Failed to read input file 'entry.png': ${(err as Error).message}`);
  }

  const size = buf.length;
  // Validate file size (max 1MB)
  if (size > 1048576) {
    fail(`File size ${size} bytes exceeds maximum allowed 1048576 bytes.`);
  }

  let width = 0;
  let height = 0;

  // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    size >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;

  // Check JPEG signature: FF D8
  const isJpeg = size >= 2 && buf[0] === 0xff && buf[1] === 0xd8;

  if (isPng) {
    // Validate PNG IHDR chunk
    if (size < 33) {
      fail('PNG file too short to contain IHDR chunk.');
    }
    const ihdrLen = buf.readUInt32BE(8);
    if (ihdrLen !== 13) {
      fail(`Invalid PNG IHDR length: ${ihdrLen}`);
    }
    const typeOk =
      buf[12] === 73 && buf[13] === 72 && buf[14] === 68 && buf[15] === 82;
    if (!typeOk) {
      fail('First chunk in PNG is not IHDR.');
    }
    width = buf.readUInt32BE(16);
    height = buf.readUInt32BE(20);

    if (width <= 0 || width > 1024 || height <= 0 || height > 1024) {
      fail(`Invalid PNG dimensions: ${width}x${height} (must be 1-1024).`);
    }

    // Require valid IEND chunk at end
    if (size < 12) {
      fail('PNG file too short for IEND chunk.');
    }
    const iendTypeOk =
      buf[size - 8] === 73 &&
      buf[size - 7] === 69 &&
      buf[size - 6] === 78 &&
      buf[size - 5] === 68;
    const iendLen = buf.readUInt32BE(size - 12);
    if (!iendTypeOk || iendLen !== 0) {
      fail('PNG file does not end with a valid IEND chunk.');
    }
  } else if (isJpeg) {
    // Validate JPEG: scan segments for SOF0 (FF C0) or SOF2 (FF C2) and EOI (FF D9)
    if (size < 4 || buf[size - 2] !== 0xff || buf[size - 1] !== 0xd9) {
      fail('JPEG file does not end with EOI marker (FF D9).');
    }

    let i = 2;
    while (i < size - 1) {
      if (buf[i] === 0xff) {
        while (i < size && buf[i] === 0xff) {
          i++;
        }
        if (i >= size) break;
        const marker = buf[i];
        if (marker === 0xc0 || marker === 0xc2) {
          // Height at marker code byte offset + 4, width at offset + 6
          if (i + 7 < size) {
            height = buf.readUInt16BE(i + 4);
            width = buf.readUInt16BE(i + 6);
          }
          break;
        }
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
          i++;
        } else {
          if (i + 2 < size) {
            const segLen = buf.readUInt16BE(i + 1);
            i += 1 + segLen;
          } else {
            break;
          }
        }
      } else {
        i++;
      }
    }

    if (width === 0 || height === 0) {
      fail('JPEG file missing valid SOF0 or SOF2 marker.');
    }
    if (width > 1024 || height > 1024) {
      fail(`Invalid JPEG dimensions: ${width}x${height} (must be <= 1024).`);
    }
  } else {
    fail('File is neither a valid PNG nor JPEG image.');
  }

  // Create output directory if needed
  try {
    mkdirSync(outDir, { recursive: true });
  } catch (err) {
    fail(`Failed to create output directory '${outDir}': ${(err as Error).message}`);
  }

  // Write exact same bytes to entry.png inside output directory
  const outPath = join(outDir, 'entry.png');
  try {
    writeFileSync(outPath, buf);
  } catch (err) {
    fail(`Failed to write output file '${outPath}': ${(err as Error).message}`);
  }

  // Verify output file bytes match source bytes
  try {
    const writtenBuf = readFileSync(outPath);
    if (writtenBuf.length !== size || !writtenBuf.equals(buf)) {
      fail(`Post-write verification failed: output file does not match source bytes.`);
    }
  } catch (err) {
    fail(`Failed to verify output file '${outPath}': ${(err as Error).message}`);
  }

  console.log(`Success: size=${size} bytes, dimensions=${width}x${height}`);
  process.exit(0);
} catch (err) {
  fail((err as Error).message);
}
