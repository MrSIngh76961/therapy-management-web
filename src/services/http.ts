import type { ListParams } from "./types";

export interface ApiClient {
  get<T>(path: string, params?: ListParams | Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  delete<T = void>(path: string): Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const qs = (params?: Record<string, unknown>) => {
  const u = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => v !== undefined && v !== "" && u.set(k, String(v)));
  const s = u.toString();
  return s ? `?${s}` : "";
};

/** Real REST transport. Point NEXT_PUBLIC_API_BASE_URL at the backend (also consumed by mobile apps). */
export function createFetchClient(baseUrl: string): ApiClient {
  const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const res = await fetch(`${baseUrl}${path}`, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new ApiError(res.status, (await res.text().catch(() => "")) || res.statusText);
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  };
  return {
    get: (p, params) => call("GET", p + qs(params)),
    post: (p, b) => call("POST", p, b),
    patch: (p, b) => call("PATCH", p, b),
    put: (p, b) => call("PUT", p, b),
    delete: (p) => call("DELETE", p),
  };
}
