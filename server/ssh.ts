import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { sshStatusSchema, type SshReport } from '../shared/ssh.js';
import { repositoryRoot, type Config } from './config.js';

const execute = promisify(execFile);

export async function sshStatus(config: Config): Promise<SshReport> {
  if (process.platform !== 'win32') return { supported: false, reason: 'The SSH helper requires Windows.' };
  const helperPath = join(repositoryRoot, 'scripts', 'Ssh-Monitoring.ps1');
  const { stdout } = await execute('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-File', helperPath, '-Action', 'Status'
  ], { timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true });
  return {
    ...sshStatusSchema.parse(JSON.parse(stdout.replace(/^\uFEFF/, ''))),
    supported: true, helperPath, port: config.port, publicUrl: config.publicUrl,
    loopback: config.host === '127.0.0.1'
  };
}
