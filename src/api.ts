export const DEMO = import.meta.env.MODE === 'demo';

export async function api<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST', signal?: AbortSignal): Promise<T> {
  if (DEMO) {
    const { demoApi } = await import('./demo/router');
    return demoApi<T>(path, body, method);
  }
  const response = await fetch(`/api${path}`, {
    method, credentials: 'same-origin', signal, cache: 'no-store',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : `Request failed (${response.status}).`);
  return result as T;
}

export async function downloadDemoExport(): Promise<void> {
  const { demoExportCsv } = await import('./demo/router');
  const url = URL.createObjectURL(new Blob([await demoExportCsv()], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'hackathon-2026-checkins.csv' });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
