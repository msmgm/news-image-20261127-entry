import { writeFileSync, unlinkSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const tmpOut = join(import.meta.dirname, 'test_output');

function createValidPng(width: number, height: number): Buffer {
  // Signature (8 bytes)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  // IHDR chunk: length (4) = 13, type (4) = IHDR, width (4), height (4), bit depth (1), color type (1), compression (1), filter (1), interlace (1), CRC (4) = 25 bytes total
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = Buffer.alloc(21); // 4 len + 4 type + 13 data
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4, 4, 'ascii');
  ihdrData.copy(ihdrChunk, 8);
  // dummy CRC (4 bytes at offset 17)
  ihdrChunk.writeUInt32BE(0x12345678, 17);

  // IEND chunk: length (4) = 0, type (4) = IEND, CRC (4)
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write('IEND', 4, 4, 'ascii');
  iendChunk.writeUInt32BE(0xae426082, 8);

  return Buffer.concat([sig, ihdrChunk, iendChunk]);
}

function createValidJpeg(width: number, height: number): Buffer {
  // SOI (FF D8)
  const soi = Buffer.from([0xff, 0xd8]);
  // APP0 (FF E0 length 00 10 ... )
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  // SOF0 (FF C0 length 00 0b precision 08 height (2) width (2) components 03 ...)
  const sof0 = Buffer.alloc(11);
  sof0[0] = 0xff;
  sof0[1] = 0xc0;
  sof0.writeUInt16BE(9, 2); // length excluding marker
  sof0[4] = 8; // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  sof0[9] = 3; // components
  sof0[10] = 1;

  // EOI (FF D9)
  const eoi = Buffer.from([0xff, 0xd9]);

  return Buffer.concat([soi, app0, sof0, eoi]);
}

async function runTests() {
  const tests = [
    {
      name: 'Missing entry.png',
      setup: () => {
        try { unlinkSync('entry.png'); } catch {}
      },
      expectSuccess: false,
    },
    {
      name: 'Valid PNG (100x200)',
      setup: () => {
        writeFileSync('entry.png', createValidPng(100, 200));
      },
      expectSuccess: true,
    },
    {
      name: 'Oversized PNG (>1MB)',
      setup: () => {
        const buf = Buffer.alloc(1048577, 0xaa);
        createValidPng(100, 200).copy(buf, 0);
        writeFileSync('entry.png', buf);
      },
      expectSuccess: false,
    },
    {
      name: 'PNG with dimension > 1024 (1025x100)',
      setup: () => {
        writeFileSync('entry.png', createValidPng(1025, 100));
      },
      expectSuccess: false,
    },
    {
      name: 'PNG missing IEND',
      setup: () => {
        const png = createValidPng(100, 100);
        writeFileSync('entry.png', png.subarray(0, png.length - 12));
      },
      expectSuccess: false,
    },
    {
      name: 'Valid JPEG (300x400)',
      setup: () => {
        writeFileSync('entry.png', createValidJpeg(300, 400));
      },
      expectSuccess: true,
    },
    {
      name: 'JPEG missing EOI',
      setup: () => {
        const jpeg = createValidJpeg(300, 400);
        writeFileSync('entry.png', jpeg.subarray(0, jpeg.length - 2));
      },
      expectSuccess: false,
    },
    {
      name: 'Invalid file (random bytes)',
      setup: () => {
        writeFileSync('entry.png', Buffer.from('not an image'));
      },
      expectSuccess: false,
    },
  ];

  try { rmSync(tmpOut, { recursive: true, force: true }); } catch {}

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    t.setup();
    const result = spawnSync('node', ['main.ts'], {
      env: { ...process.env, MAKEFUN_OUTPUT_DIR: tmpOut },
    });

    const success = result.status === 0;
    if (success === t.expectSuccess) {
      console.log(`PASS: ${t.name}`);
      passed++;
    } else {
      console.error(`FAIL: ${t.name} (expected success=${t.expectSuccess}, got status=${result.status})`);
      console.error(`stdout: ${result.stdout.toString()}`);
      console.error(`stderr: ${result.stderr.toString()}`);
      failed++;
    }
  }

  try { unlinkSync('entry.png'); } catch {}
  try { rmSync(tmpOut, { recursive: true, force: true }); } catch {}

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
