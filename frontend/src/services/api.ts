// Centralized HTTP client for the existing Express backend.
// The backend URL is configured via VITE_API_BASE_URL (e.g. https://api.example.com).
const TOKEN_KEY = "pms_auth_token";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "http://localhost:5001";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status: number, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(fn: () => void) {
  unauthorizedHandler = fn;
}

function friendlyMessage(body: any, status: number): string {
  const raw: string | undefined =
    (typeof body === "string" && body) || body?.message || body?.error?.message || (typeof body?.error === "string" ? body.error : undefined);
  // Never surface raw SQL/database errors.
  if (raw && /(sql|relation|constraint|syntax|postgres|duplicate key|violates)/i.test(raw)) {
    return status === 409 ? "An account with this email address already exists." : "The request could not be completed.";
  }
  if (raw) return raw;
  if (status === 401) return "Invalid email or password.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "The requested item was not found.";
  if (status === 409) return "An account with this email address already exists.";
  if (status >= 500) return "The server encountered an error. Please try again.";
  return "Something went wrong.";
}

function extractFieldErrors(body: any): Record<string, string> | undefined {
  const errs = body?.errors;
  if (!errs) return undefined;
  const out: Record<string, string> = {};
  if (Array.isArray(errs)) {
    for (const e of errs) {
      const key = e?.path ?? e?.param ?? e?.field;
      if (key) out[String(key)] = e?.msg ?? e?.message ?? "Invalid value";
    }
  } else if (typeof errs === "object") {
    for (const [k, v] of Object.entries(errs)) out[k] = typeof v === "string" ? v : (v as any)?.message ?? "Invalid value";
  }
  return Object.keys(out).length ? out : undefined;
}

export async function request<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
): Promise<T> {
  const qs = options.query
    ? Object.entries(options.query)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    });
  } catch {
    throw new ApiError("Unable to connect to the Project Management API.", 0);
  }
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedHandler?.();
    throw new ApiError(friendlyMessage(body, res.status), res.status, extractFieldErrors(body));
  }
  return body as T;
}

/** Unwrap common envelope shapes ({ data }, { success, data }) without inventing fields. */
export function unwrap<T = any>(body: any, ...keys: string[]): T {
  let cur = body;
  if (cur && typeof cur === "object" && !Array.isArray(cur) && "data" in cur) cur = cur.data;
  for (const k of keys) {
    if (cur && typeof cur === "object" && !Array.isArray(cur) && k in cur) return cur[k];
  }
  return cur;
}

export function unwrapList<T = any>(body: any, ...keys: string[]): T[] {
  const v = unwrap(body, ...keys);
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    const firstArr = Object.values(v).find(Array.isArray);
    if (firstArr) return firstArr as T[];
  }
  return [];
}
