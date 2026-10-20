import type { Practitioner, Task } from 'fhir/r4';
import { CANONICAL, EXT, JOB_SYSTEM, tracks } from '../shared/domain.js';
import { AppError, put, type FhirStore } from './fhir.js';
import { detailsOf } from './model.js';

export type EmailConfig = { apiKey: string; senderEmail: string; senderName: string };
const attemptsOf = (task: Task) => task.extension?.find(e => e.url === EXT.attempts)?.valueInteger ?? 0;
export class EmailWorker {
  private busy = false;
  constructor(private store: FhirStore, private config: EmailConfig | undefined, private fetcher: typeof fetch = fetch) {}
  async tick(): Promise<void> {
    if (this.busy || !this.config) return;
    this.busy = true;
    try {
      const tasks = await this.store.search<Task>('Task', `code=${encodeURIComponent(`${JOB_SYSTEM}|confirmation-email`)}&_count=200`);
      for (const task of tasks) {
        if (task.status === 'in-progress' && Date.now() - Date.parse(task.lastModified ?? '') > 120000) {
          task.status = 'failed';
          task.statusReason = { text: 'Interrupted send: provider acceptance is unknown. Staff must verify before retrying.' };
          await this.store.transaction([put(task)]);
          continue;
        }
        const next = task.extension?.find(e => e.url === EXT.nextAttempt)?.valueDateTime;
        if (task.status !== 'ready' || (next && Date.parse(next) > Date.now())) continue;
        await this.send(task);
      }
    } finally { this.busy = false; }
  }
  private async send(task: Task): Promise<void> {
    if (!this.config) throw new Error('Email is not configured.');
    const reference = task.focus?.reference;
    if (!reference?.startsWith('Practitioner/')) throw new AppError(503, 'Email Task has an invalid focus.');
    const resource = await this.store.read<Practitioner>('Practitioner', reference.slice(13));
    if (!resource) throw new AppError(503, 'Email Task refers to a missing Practitioner.');
    const details = detailsOf(resource);
    const attempts = attemptsOf(task) + 1;
    task.status = 'in-progress';
    task.lastModified = new Date().toISOString();
    task.extension = [{ url: EXT.attempts, valueInteger: attempts }];
    try { await this.store.transaction([put(task)]); }
    catch (error) { if (error instanceof AppError && error.status === 409) return; throw error; }
    const claimed = await this.store.read<Task>('Task', task.id!);
    if (!claimed) throw new AppError(503, 'Claimed email Task disappeared.');
    let response: Response;
    try {
      response = await this.fetcher('https://api.brevo.com/v3/smtp/email', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'api-key': this.config.apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          sender: { email: this.config.senderEmail, name: this.config.senderName },
          to: [{ email: details.email, name: details.name }],
          subject: 'You are checked in - Norwegian FHIR Hackathon 2026',
          textContent: `Welcome, ${details.name}!\n\nYou are checked in for the Norwegian FHIR Hackathon on November 9, 2026 at Rebel in Oslo.\n\nName: ${details.name}\nAffiliation: ${details.affiliation}\nPrimary track: ${tracks.find(t => t.code === details.track)?.label ?? 'Not selected'}\n\nEnjoy the hackathon!`
        })
      });
    } catch {
      claimed.status = 'failed';
      claimed.statusReason = { text: 'Send outcome unknown (network interruption). Verify provider history before staff retry.' };
      await this.store.transaction([put(claimed)]);
      return;
    }
    if (response.ok) {
      claimed.status = 'completed';
      claimed.statusReason = { text: 'Accepted by Brevo; delivery is not yet verified.' };
      claimed.businessStatus = { text: 'accepted' };
    } else if ((response.status === 429 || response.status === 503) && attempts < 5) {
      claimed.status = 'ready';
      claimed.statusReason = { text: `Brevo rejected this attempt (HTTP ${response.status}); retry scheduled.` };
      claimed.extension = [
        { url: EXT.attempts, valueInteger: attempts },
        { url: EXT.nextAttempt, valueDateTime: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** attempts)).toISOString() }
      ];
    } else {
      claimed.status = 'failed';
      claimed.statusReason = { text: `Brevo rejected the message (HTTP ${response.status}); staff action required.` };
    }
    claimed.lastModified = new Date().toISOString();
    await this.store.transaction([put(claimed)]);
  }
  async retry(id: string, auditEntry: import('fhir/r4').BundleEntry): Promise<void> {
    const task = await this.store.read<Task>('Task', id);
    if (!task || task.code?.coding?.find(c => c.system === JOB_SYSTEM)?.code !== 'confirmation-email') throw new AppError(404, 'Confirmation email Task not found.');
    if (task.status !== 'failed') throw new AppError(409, 'Only failed emails can be retried. Verify Brevo history first.');
    task.status = 'ready';
    task.statusReason = { text: 'Staff authorized retry after provider-history review.' };
    task.extension = [{ url: EXT.attempts, valueInteger: 0 }];
    task.lastModified = new Date().toISOString();
    await this.store.transaction([put(task), auditEntry]);
  }
}
