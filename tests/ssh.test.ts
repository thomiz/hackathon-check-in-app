import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ipv4Subnet, powershellLiteral, sshCommands, sshSourceSchema, sshStatusSchema, type SshStatus } from '../shared/ssh';

const network = { index: 12, alias: 'Hotspot', address: '192.168.137.1', prefix: 24, profile: 'Public', virtual: true };
const status: SshStatus = {
  supported: true, helperPath: "C:\\Event operator's app\\scripts\\Ssh-Monitoring.ps1",
  service: 'Stopped', passwordAuthentication: 'no', interfaces: [network], rules: [], fingerprints: [], warnings: [],
  port: 8099, publicUrl: 'http://localhost:8099', loopback: true
};

describe('SSH connection helpers', () => {
  it.skipIf(process.platform !== 'win32')('validates the PowerShell helper using simulated Windows operations', () => {
    const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve('tests', 'Ssh-Monitoring.Tests.ps1')], { encoding: 'utf8', timeout: 15000 });
    expect(output).toContain('PASS: PowerShell syntax');
  });
  it('calculates actual subnets including non-octet prefixes', () => {
    expect(ipv4Subnet('192.168.137.1', 24)).toBe('192.168.137.0/24');
    expect(ipv4Subnet('172.20.10.7', 28)).toBe('172.20.10.0/28');
    expect(ipv4Subnet('192.168.71.8', 22)).toBe('192.168.68.0/22');
    expect(ipv4Subnet('10.2.3.4', 32)).toBe('10.2.3.4/32');
    expect(() => ipv4Subnet('invalid', 24)).toThrow();
    expect(() => ipv4Subnet('10.2.3.4', 0)).toThrow();
  });
  it('rejects unrestricted or malformed sources', () => {
    for (const value of ['Any', '0.0.0.0/0', '10.1.2.3/33', '10.1.2.3/24/1', '999.1.2.3', "10.1.2.3'; Stop-Service sshd"]) {
      expect(sshSourceSchema.safeParse(value).success).toBe(false);
    }
    for (const value of ['10.1.2.3', '192.168.137.0/24', '10.1.2.3/32']) {
      expect(sshSourceSchema.safeParse(value).success).toBe(true);
    }
  });
  it('quotes paths and usernames safely and uses the configured port', () => {
    const commands = sshCommands(status, network, '192.168.137.2', "operator'; Write-Host 'not code");
    expect(commands.enable).toBe("& 'C:\\Event operator''s app\\scripts\\Ssh-Monitoring.ps1' -Action Enable -InterfaceIndex 12 -LocalAddress '192.168.137.1' -RemoteAddress '192.168.137.2'");
    expect(commands.tunnel).toBe("ssh -N -o ExitOnForwardFailure=yes -L 8099:127.0.0.1:8099 -l 'operator''; Write-Host ''not code' 192.168.137.1");
    expect(commands.test).toBe('Test-NetConnection 192.168.137.1 -Port 22');
    expect(commands.disable).toContain('-Action Disable');
    expect(commands.stop).toContain('-StopService');
    expect(powershellLiteral("a'b")).toBe("'a''b'");
    expect(() => sshCommands(status, network, 'Any', 'user')).toThrow();
    expect(() => sshCommands(status, network, '10.1.2.3', 'user\nbad')).toThrow();
  });
  it('validates the Windows report shape instead of trusting process output', () => {
    expect(sshStatusSchema.parse(status).interfaces).toEqual([network]);
    expect(() => sshStatusSchema.parse({ ...status, interfaces: [{ ...network, address: '::1' }] })).toThrow();
    expect(() => sshStatusSchema.parse({ ...status, rules: 'none' })).toThrow();
    expect(sshStatusSchema.parse({ ...status, warnings: ['Cannot read SSH host-key fingerprint: Permission denied'] }).warnings).toHaveLength(1);
    expect(() => sshStatusSchema.parse({ ...status, warnings: 'Permission denied' })).toThrow();
  });
});
