import 'dotenv/config';
import { z } from 'zod';

export function loadConfig() {
  const schema = z.object({
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    PUBLIC_URL: z.string().url().default('http://localhost:8080'),
    MEDPLUM_BASE_URL: z.string().url(),
    MEDPLUM_CLIENT_ID: z.string().min(1),
    MEDPLUM_CLIENT_SECRET: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
    STAFF_USERNAME: z.string().regex(/^[A-Za-z0-9.-]{1,64}$/),
    STAFF_PASSWORD_HASH: z.string().regex(/^[a-f0-9]{32}:[a-f0-9]{128}$/),
    BREVO_API_KEY: z.preprocess(value => value === '' ? undefined : value, z.string().optional()),
    BREVO_SENDER_EMAIL: z.preprocess(value => value === '' ? undefined : value, z.string().email().optional()),
    BREVO_SENDER_NAME: z.string().default('HL7 Norway'),
    PRIVACY_NOTICE_URL: z.string().url().default('https://hl7norway.github.io/Norwegian-FHIR-Hackathon-2026/currentbuild/privacy.html')
  });
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error(`Invalid environment configuration: ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const value = result.data;
  if (!!value.BREVO_API_KEY !== !!value.BREVO_SENDER_EMAIL) throw new Error('Configure both BREVO_API_KEY and BREVO_SENDER_EMAIL, or neither.');
  return {
    host: value.HOST, port: value.PORT, publicUrl: new URL(value.PUBLIC_URL).origin,
    privacyUrl: value.PRIVACY_NOTICE_URL,
    medplum: { baseUrl: value.MEDPLUM_BASE_URL.replace(/\/$/, ''), clientId: value.MEDPLUM_CLIENT_ID, clientSecret: value.MEDPLUM_CLIENT_SECRET },
    sessionSecret: value.SESSION_SECRET, staffUsername: value.STAFF_USERNAME, staffPasswordHash: value.STAFF_PASSWORD_HASH,
    email: value.BREVO_API_KEY && value.BREVO_SENDER_EMAIL ? { apiKey: value.BREVO_API_KEY, senderEmail: value.BREVO_SENDER_EMAIL, senderName: value.BREVO_SENDER_NAME } : undefined
  };
}
export type Config = ReturnType<typeof loadConfig>;
