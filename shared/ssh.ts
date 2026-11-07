import { z } from 'zod';

export const ipv4Schema = z.string().ip({ version: 'v4' });
export const sshSourceSchema = z.string().refine(value => {
  const [address, prefix, extra] = value.split('/');
  return extra === undefined && ipv4Schema.safeParse(address).success &&
    (prefix === undefined || (/^\d{1,2}$/.test(prefix) && Number(prefix) >= 1 && Number(prefix) <= 32));
}, 'Enter an IPv4 address or subnet with a prefix from 1 to 32.');

export function ipv4Subnet(address: string, prefix: number): string {
  ipv4Schema.parse(address);
  z.number().int().min(1).max(32).parse(prefix);
  const value = address.split('.').reduce((total, octet) => (total * 256) + Number(octet), 0);
  const network = (value & (0xffffffff << (32 - prefix))) >>> 0;
  return `${[24, 16, 8, 0].map(shift => (network >>> shift) & 255).join('.')}/${prefix}`;
}

export const sshStatusSchema = z.object({
  service: z.string(),
  passwordAuthentication: z.string(),
  fingerprints: z.array(z.string()),
  warnings: z.array(z.string()),
  interfaces: z.array(z.object({
    index: z.number().int(), alias: z.string(), address: ipv4Schema,
    prefix: z.number().int().min(1).max(32), profile: z.string(), virtual: z.boolean()
  })),
  rules: z.array(z.object({
    name: z.string(), enabled: z.boolean(), profile: z.string(),
    remoteAddress: z.array(z.string()), localAddress: z.array(z.string()),
    interfaceAlias: z.array(z.string()), localPort: z.array(z.string())
  }))
});
export type SshStatus = z.infer<typeof sshStatusSchema> & {
  supported: true; helperPath: string; port: number; publicUrl: string; loopback: boolean;
};
export type SshReport = SshStatus | { supported: false; reason: string };

export const powershellLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

export function sshCommands(status: SshStatus, network: SshStatus['interfaces'][number], source: string, username: string) {
  sshSourceSchema.parse(source);
  ipv4Schema.parse(network.address);
  z.number().int().positive().parse(network.index);
  z.string().trim().min(1).max(128).regex(/^[^\x00-\x1f\x7f]+$/).parse(username);
  const helper = `& ${powershellLiteral(status.helperPath)}`;
  return {
    enable: `${helper} -Action Enable -InterfaceIndex ${network.index} -LocalAddress ${powershellLiteral(network.address)} -RemoteAddress ${powershellLiteral(source)}`,
    disable: `${helper} -Action Disable`,
    stop: `${helper} -Action Disable -StopService`,
    test: `Test-NetConnection ${network.address} -Port 22`,
    tunnel: `ssh -N -o ExitOnForwardFailure=yes -L ${status.port}:127.0.0.1:${status.port} -l ${powershellLiteral(username.trim())} ${network.address}`
  };
}
