import 'dotenv/config';
import { z } from 'zod';

export function loadConfig() {
  const schema = z.object({
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    PUBLIC_URL: z.string().url().default('http://localhost:8080'),
    FHIR_BASE_URL: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    STAFF_USERNAME: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/),
    STAFF_PASSWORD_HASH: z.string().regex(/^[a-f0-9]{32}:[a-f0-9]{128}$/),
    PRIVACY_NOTICE_URL: z.string().url().default('https://hl7norway.github.io/Norwegian-FHIR-Hackathon-2026/currentbuild/privacy.html')
  });
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error(`Invalid environment configuration: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const value = result.data;
  return {
    host: value.HOST, port: value.PORT, publicUrl: new URL(value.PUBLIC_URL).origin,
    privacyUrl: value.PRIVACY_NOTICE_URL,
    fhir: { baseUrl: value.FHIR_BASE_URL.replace(/\/+$/, '') },
    sessionSecret: value.SESSION_SECRET, staffUsername: value.STAFF_USERNAME, staffPasswordHash: value.STAFF_PASSWORD_HASH
  };
}
export type Config = ReturnType<typeof loadConfig>;
