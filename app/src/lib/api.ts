/** Client tipado da API (fetch). */
import type {
  AccountSummary,
  AnalysisConfig,
  Counts,
  Item,
  JobSnapshot,
  NoteMeta,
  NotesJobStatus,
  SearchHit,
} from "@/lib/types";

async function jget<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

async function jpost<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let detail = "";
    try {
      detail = (await r.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `POST ${url} → ${r.status}`);
  }
  return r.json() as Promise<T>;
}

async function jpatch<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PATCH ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

async function jput<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PUT ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

async function jdel<T>(url: string): Promise<T> {
  const r = await fetch(url, { method: "DELETE" });
  if (!r.ok) throw new Error(`DELETE ${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

export interface StartJobBody {
  account: string;
  cookiesPath: string;
  tabs?: string[];
  media?: string[];
  parallelism?: number;
  range?: string;
  mode?: "full" | "incremental" | "count";
}

export interface NewAccountBody {
  account: string;
  savePath?: string;
  cookiesPath?: string;
  media?: string[];
  tabs?: string[];
  network?: string;
}

export const api = {
  accounts: () => jget<{ accounts: AccountSummary[] }>("/api/accounts"),
  addAccount: (body: NewAccountBody) => jpost<AccountSummary>("/api/accounts", body),
  stats: (account: string) =>
    jget<{ account: AccountSummary | null; counts: Counts; job: JobSnapshot | null }>(
      `/api/accounts/${encodeURIComponent(account)}/stats`,
    ),
  items: (account: string, qs: string) =>
    jget<{ items: Item[] }>(`/api/accounts/${encodeURIComponent(account)}/items?${qs}`),
  startJob: (body: StartJobBody) => jpost<JobSnapshot>("/api/jobs", body),
  startSingle: (body: { url: string; cookiesPath: string; media?: string[] }) =>
    jpost<JobSnapshot>("/api/jobs/single", body),
  stopJob: (account: string) => jpost<JobSnapshot>(`/api/jobs/${encodeURIComponent(account)}/stop`),
  peek: (account: string, cookiesPath: string) =>
    jpost<{ newCount: number; checked: number; tab: string }>(
      `/api/accounts/${encodeURIComponent(account)}/peek`,
      { cookiesPath },
    ),
  patchAccount: (account: string, body: Partial<{ media: string[]; tabs: string[]; savePath: string; parallelism: number }>) =>
    jpatch<AccountSummary>(`/api/accounts/${encodeURIComponent(account)}`, body),
  pickDir: (current?: string) =>
    jpost<{ path: string | null; cancelled: boolean }>("/api/fs/pick-dir", { current }),
  defaultDir: () => jget<{ path: string }>("/api/fs/default-dir"),
  cookiesDefault: () => jget<{ path: string | null }>("/api/auth/cookies-default"),
  cookiesStatus: (path: string) =>
    jpost<{ status: "valid" | "expired" | "unknown"; expiresAt?: string; reason?: string }>(
      "/api/auth/cookies-status",
      { path },
    ),
  openDir: (path: string) => jpost<{ ok: boolean }>("/api/fs/open-dir", { path }),
  openFile: (account: string, postId: string) =>
    jpost<{ ok: boolean }>("/api/fs/open-file", { account, postId }),
  videoDetail: (account: string, postId: string) =>
    jget<{
      item: Item;
      note: string | null;
      transcript: string | null;
      webUrl?: string | null;
      noteMeta?: NoteMeta | null;
    }>(`/api/accounts/${encodeURIComponent(account)}/items/${encodeURIComponent(postId)}/detail`),
  search: (q: string, k = 10) =>
    jget<{ hits: SearchHit[]; error?: string }>(`/api/search?q=${encodeURIComponent(q)}&k=${k}`),
  notesHealth: () => jget<{ available: boolean }>("/api/notes/health"),
  generateNote: (account: string, postId: string) =>
    jpost<{ ok: boolean; note?: string | null; error?: string }>(
      `/api/accounts/${encodeURIComponent(account)}/items/${encodeURIComponent(postId)}/note`,
    ),
  startNotes: (account: string) =>
    jpost<NotesJobStatus>(`/api/accounts/${encodeURIComponent(account)}/notes`),
  notesStatus: (account: string) =>
    jget<NotesJobStatus>(`/api/accounts/${encodeURIComponent(account)}/notes`),
  stopNotes: (account: string) =>
    jdel<NotesJobStatus>(`/api/accounts/${encodeURIComponent(account)}/notes`),
  getConfig: () => jget<AnalysisConfig>("/api/config"),
  setConfig: (cfg: AnalysisConfig) => jput<AnalysisConfig>("/api/config", cfg),
  disk: () => jget<{ downloaded: number; free: number; total: number }>("/api/disk"),
};
