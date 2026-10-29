// Minimal stand-in for Node's Buffer, covering only what the registration service uses
// (UTF-8, hex and base64url conversions). Installed globally by the demo backend.
export type Encoding = 'utf8' | 'utf-8' | 'hex' | 'base64url';

export function stringToBytes(value: string, encoding: Encoding = 'utf8'): Uint8Array {
  if (encoding === 'hex') return Uint8Array.from(value.match(/[0-9a-fA-F]{2}/g) ?? [], byte => parseInt(byte, 16));
  if (encoding === 'base64url') {
    // Mirror Node's lenient decoding: skip invalid characters and a dangling sextet.
    let base64 = value.replace(/[^A-Za-z0-9_-]/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (base64.length % 4 === 1) base64 = base64.slice(0, -1);
    const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }
  return new TextEncoder().encode(value);
}

export function bytesToString(bytes: Uint8Array, encoding: Encoding = 'utf8'): string {
  if (encoding === 'hex') return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  if (encoding === 'base64url') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return new TextDecoder().decode(bytes);
}

export class DemoBytes extends Uint8Array {
  override toString(encoding: Encoding = 'utf8'): string { return bytesToString(this, encoding); }
}

export const DemoBuffer = {
  from(value: string | Uint8Array, encoding: Encoding = 'utf8'): DemoBytes {
    return new DemoBytes(typeof value === 'string' ? stringToBytes(value, encoding) : value);
  }
};

export function installBuffer(): void {
  if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = DemoBuffer as unknown as typeof Buffer;
}
