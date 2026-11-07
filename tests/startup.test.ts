import { once } from 'node:events';
import { mkdtemp, rm, access } from 'node:fs/promises';
import { Agent, request } from 'node:http';
import { createConnection, type AddressInfo, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../server/config';
import { startApplication } from '../server/startup';

let directory: string;
let running: Awaited<ReturnType<typeof startApplication>> | undefined;
let sockets: Socket[];
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'checkin-startup-'));
  sockets = [];
});
afterEach(async () => {
  for (const socket of sockets) socket.destroy();
  await running?.close();
  running = undefined;
  await rm(directory, { recursive: true, force: true });
});

async function start() {
  const config: Config = {
    host: '127.0.0.1', port: 0, publicUrl: 'http://localhost:8080',
    privacyUrl: 'https://example.invalid/privacy', dataDir: directory,
    sessionSecret: 'synthetic-startup-secret-at-least-32-characters',
    staffUsername: 'organizer', staffPasswordHash: `${'a'.repeat(32)}:${'b'.repeat(128)}`
  };
  running = await startApplication(config);
  return (running.app.server.address() as AddressInfo).port;
}

async function connect(port: number, data: string) {
  const accepted = new Promise<Socket>(resolve => { running!.app.server.once('connection', resolve); });
  const socket = createConnection({ host: '127.0.0.1', port });
  sockets.push(socket);
  const [, serverSocket] = await Promise.all([once(socket, 'connect'), accepted]);
  if (data) {
    const received = once(serverSocket, 'data');
    socket.write(data);
    await received;
  }
  return socket;
}

describe('application shutdown', () => {
  it.each(['', 'G'])('releases the data lock with an incomplete HTTP request: %j', async data => {
    const port = await start();
    const socket = await connect(port, data);
    const closed = once(socket, 'close').catch(error => {
      expect(error).toHaveProperty('code', 'ECONNRESET');
    });
    const finished = running!.close().then(() => true);
    const deadline = new Promise<boolean>(resolve => {
      const timer = setTimeout(() => resolve(false), 1000);
      timer.unref();
    });
    expect(await Promise.race([finished, deadline])).toBe(true);
    await closed;
    await expect(access(running!.store.paths.lock)).rejects.toHaveProperty('code', 'ENOENT');
  });

  it('waits for an in-flight request and delivers its response before releasing the lock', async () => {
    const port = await start();
    await connect(port, '');
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const original = running!.service.list.bind(running!.service);
    let entered!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    running!.service.list = async (...args) => {
      entered();
      await pending;
      return original(...args);
    };
    const agent = new Agent({ keepAlive: true });
    const response = new Promise<string>((resolve, reject) => {
      const client = request({ host: '127.0.0.1', port, path: '/api/health', agent }, reply => {
        let body = '';
        reply.setEncoding('utf8');
        reply.on('data', chunk => { body += chunk; });
        reply.on('end', () => resolve(body));
        reply.on('error', reject);
      });
      client.on('socket', socket => { sockets.push(socket); });
      client.on('error', reject);
      client.end();
    });
    try {
      await started;
      const closing = running!.close();
      await access(running!.store.paths.lock);
      release();
      expect(JSON.parse(await response)).toEqual({ status: 'ok' });
      await closing;
      await expect(access(running!.store.paths.lock)).rejects.toHaveProperty('code', 'ENOENT');
    } finally {
      release();
      agent.destroy();
    }
  });
});
