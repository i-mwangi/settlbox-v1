import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateReceiptImage, saveReceiptImage, readReceiptImage } from '../services/server/receipt-images.ts';

test('receipt validation decodes PNG and JPEG and rejects spoofed, corrupt and oversized input', async () => {
  const image = sharp({create:{width:2,height:2,channels:3,background:'#ffffff'}});
  const png = await image.png().toBuffer();
  const jpeg = await image.jpeg().toBuffer();
  assert.equal(await validateReceiptImage(png,'image/png'),'png');
  assert.equal(await validateReceiptImage(jpeg,'image/jpeg'),'jpeg');
  await assert.rejects(validateReceiptImage(png,'image/jpeg'),/corrupt/);
  await assert.rejects(validateReceiptImage(png.subarray(0,30),'image/png'),/corrupt/);
  await assert.rejects(validateReceiptImage(Buffer.from([255,216,255,1,255,217]),'image/jpeg'),/corrupt/);
  await assert.rejects(validateReceiptImage(Buffer.alloc(2*1024*1024+1),'image/png'),/2 MB/);
  await assert.rejects(validateReceiptImage(png,'text/html'),/Only PNG/);
});

test('receipt files survive reopening, isolate companies and reject missing or traversed paths', () => {
  const root=mkdtempSync(join(tmpdir(),'settlbox-receipts-'));
  try {
    const bytes=Buffer.from('stored receipt');
    const name=saveReceiptImage(root,'company-a',bytes,'png');
    assert.deepEqual(readReceiptImage(root,'company-a',name),bytes);
    assert.throws(()=>readReceiptImage(root,'company-b',name));
    assert.throws(()=>readReceiptImage(root,'company-a','../private.png'));
    assert.throws(()=>readReceiptImage(root,'company-a','00000000-0000-0000-0000-000000000000.png'));
    const legacy='11111111-1111-1111-1111-111111111111.png';
    writeFileSync(join(root,legacy),bytes);
    assert.deepEqual(readReceiptImage(root,'company-a',legacy,'company-a'),bytes);
    assert.throws(()=>readReceiptImage(root,'company-b',legacy,'company-b'),/not found/);
  } finally {rmSync(root,{recursive:true,force:true});}
});
