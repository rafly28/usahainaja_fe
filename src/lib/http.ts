import type { FieldErrors } from "../types";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    fields?: FieldErrors;
  };
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  mutation?: boolean;
  retryCsrf?: boolean;
  idempotencyKey?: string;
};

/** Error terstruktur dari API Core agar UI bisa membedakan kode dan field error. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: FieldErrors;

  constructor(message: string, status: number, code = "REQUEST_FAILED", fields?: FieldErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let csrfToken: string | null = null;
let csrfInflight: Promise<string> | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Mengambil array dari berbagai bentuk payload Core (array langsung atau {items}). */
export function extractCollection<T>(value: unknown, preferredKeys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];

  const record = asRecord(value);
  if (!record) return [];

  for (const key of [...preferredKeys, "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }

  const nested = record.data;
  if (nested !== value) return extractCollection<T>(nested, preferredKeys);
  return [];
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (response.ok && response.status === 204) return {};
    throw new ApiError("Server mengirim respons yang tidak dikenali.", response.status);
  }

  try {
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("Respons server tidak dapat dibaca.", response.status);
  }
}

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfInflight) return csrfInflight;

  csrfInflight = (async () => {
    const response = await fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const envelope = await readEnvelope<{ csrf_token?: string }>(response);
    const token = envelope.data?.csrf_token;

    if (!response.ok || !token) {
      throw new ApiError(
        envelope.error?.message ?? "Tidak dapat menyiapkan keamanan formulir.",
        response.status,
        envelope.error?.code ?? "CSRF_UNAVAILABLE",
        envelope.error?.fields,
      );
    }

    csrfToken = token;
    return token;
  })();

  try {
    return await csrfInflight;
  } finally {
    csrfInflight = null;
  }
}

/** Mengirim request ke API Core dengan envelope, CSRF, dan idempotency yang konsisten. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, mutation = false, retryCsrf = true, idempotencyKey, headers: inputHeaders, ...init } = options;
  const headers = new Headers(inputHeaders);
  headers.set("Accept", "application/json");

  if (body !== undefined) headers.set("Content-Type", "application/json");
  let key = idempotencyKey;
  if (mutation) {
    headers.set("X-CSRF-Token", await ensureCsrfToken());
    // Transaction contract: every mutation carries an Idempotency-Key.
    // Reused across the CSRF retry so the retry is a true replay.
    if (!key) {
      key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    }
    headers.set("Idempotency-Key", key);
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const envelope = await readEnvelope<T>(response);

  if (!response.ok || envelope.success === false || envelope.error) {
    let msg = envelope.error?.message;
    if (!msg) {
      if (response.status === 401) msg = "Sesi telah berakhir atau tidak valid.";
      else if (response.status === 403) msg = "Akses ditolak.";
      else if (response.status === 404) msg = "Data tidak ditemukan.";
      else if (response.status === 409) msg = "Terdapat konflik data.";
      else if (response.status === 422) msg = "Data yang diisi belum benar.";
      else msg = "Permintaan belum berhasil. Silakan coba lagi.";
    }

    const error = new ApiError(
      msg,
      response.status,
      envelope.error?.code,
      envelope.error?.fields,
    );

    const csrfRejected = response.status === 403 && error.code.toUpperCase().includes("CSRF");
    if (mutation && retryCsrf && csrfRejected) {
      csrfToken = null;
      return request<T>(path, { ...options, idempotencyKey: key, retryCsrf: false });
    }
    throw error;
  }

  const data = envelope.data as T;
  const record = asRecord(data);
  if (typeof record?.csrf_token === "string") csrfToken = record.csrf_token;
  return data;
}

/** Menyimpan token CSRF dari login/register agar request berikutnya tidak diambil ulang. */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/** Membangun query string dengan mengabaikan parameter kosong. */
export function queryPath(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== false) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}