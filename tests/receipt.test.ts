import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import { Receipt } from '../src/Receipt';
import { receiptText } from '../shared/receipt';
import { detailsSchema, tracks, type Confirmation } from '../shared/domain';

const receipt: Confirmation = {
  name: 'Alex Example', email: 'alex@example.invalid', affiliation: 'Example Organization',
  track: 'smart', role: 'attendee', arrived: '2026-11-09T07:42:00.000Z',
  receiptId: '12526e49-53e1-4150-9226-a20c78168b95', alreadyCheckedIn: false
};

function renderReceipt(value: Confirmation) {
  return renderToStaticMarkup(createElement(Receipt, { receipt: value, onDone: () => {} }));
}

function decodeReceipt(markup: string): string | undefined {
  const dimensions = /viewBox="0 0 (\d+) (\d+)"/.exec(markup);
  if (!dimensions || dimensions[1] !== dimensions[2]) throw new Error('Expected square receipt QR SVG.');
  const scale = 4;
  const size = Number(dimensions[1]) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  // qrcode.react encodes each black row run as an SVG horizontal rectangle.
  const runs = [...markup.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)];
  if (!runs.length) throw new Error('Expected QR module paths.');
  for (const run of runs) {
    const x = Number(run[1]) * scale;
    const y = Number(run[2]) * scale;
    const length = Number(run[3]) * scale;
    for (let row = y; row < y + scale; row++) {
      for (let col = x; col < x + length; col++) {
        const offset = (row * size + col) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
    }
  }
  return jsQR(pixels, size, size)?.data;
}

describe('local QR attendance receipts', () => {
  it('keeps full readable details while encoding only the compact confirmation', () => {
    const markup = renderReceipt(receipt);
    expect(markup).toContain('Alex Example');
    expect(markup).toContain('alex@example.invalid');
    expect(markup).toContain('Example Organization');
    expect(markup).toContain('SMART on FHIR');
    expect(markup).toContain('Scan or photograph this QR code and store the information contained or an image of this confirmation as a check in receipt.');
    expect(markup).toContain(receipt.receiptId);
    expect(markup).not.toContain('<img');
    expect(markup).not.toContain('<script');
    const text = decodeReceipt(markup);
    expect(text).toBe(receiptText(receipt));
    expect(text).toBe([
      'Norwegian FHIR Hackathon 2026',
      'Check-in confirmation',
      'Name: Alex Example',
      'Email: alex@example.invalid',
      'Primary track: smart',
      'Checked in: 9 Nov 2026, 08:42:00 CET',
      `Receipt reference: ${receipt.receiptId}`
    ].join('\n'));
    expect(text).not.toMatch(/Event:|Affiliation:|Role:|Confirms check-in|Attendance check-in|SMART on FHIR/);
    expect(text).not.toMatch(/https?:\/\//);
  });
  it('round trips maximum-length Unicode details and the longest track label without truncation', () => {
    const longestTrack = [...tracks].sort((a, b) => b.label.length - a.label.length)[0]!;
    const long: Confirmation = {
      ...receipt,
      ...detailsSchema.parse({
        name: '\u6f22'.repeat(160),
        affiliation: '\u00c5'.repeat(160),
        email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
        track: longestTrack.code
      }),
      role: 'track-lead'
    };
    expect(long.email.length).toBe(254);
    expect(decodeReceipt(renderReceipt(long))).toBe(receiptText(long));
  });
  it('handles no selected track and prevents embedded line breaks from creating receipt fields', () => {
    const value = { ...receipt, name: 'Alex\nExample', affiliation: 'Example\r\nOrganization', track: '' as const };
    expect(receiptText(value)).toContain('Name: Alex Example\n');
    expect(receiptText(value)).not.toContain('Affiliation:');
    expect(receiptText(value)).toContain('Primary track: Not selected\n');
    expect(decodeReceipt(renderReceipt(value))).toBe(receiptText(value));
  });
  it('produces fewer QR modules than the previous full receipt payload', () => {
    const previousText = [
      'Norwegian FHIR Hackathon 2026',
      'Attendance check-in confirmation',
      'Event: 9 November 2026 - Rebel, Oslo',
      `Name: ${receipt.name}`,
      `Email: ${receipt.email}`,
      `Affiliation: ${receipt.affiliation}`,
      'Role: Attendee',
      'Primary track: SMART on FHIR',
      'Checked in: 9 Nov 2026, 08:42:00 CET',
      `Receipt reference: ${receipt.receiptId}`,
      'Confirms check-in, not duration of participation.'
    ].join('\n');
    const renderCode = (value: string) => renderToStaticMarkup(createElement(QRCodeSVG, { value, level: 'M', marginSize: 4 }));
    const modules = (markup: string) => Number(/viewBox="0 0 (\d+) \d+"/.exec(markup)![1]);
    expect(Buffer.byteLength(receiptText(receipt))).toBeLessThan(Buffer.byteLength(previousText));
    expect(modules(renderReceipt(receipt))).toBeLessThan(modules(renderCode(previousText)));
  });
});
