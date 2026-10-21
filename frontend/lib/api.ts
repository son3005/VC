import type {
  AdminStats,
  ApiError,
  ApiSuccess,
  CertificateDetail,
  CertificateIssuer,
  CertificateSummary,
  FilterOptions,
  Issuer,
  PaginationMeta,
  PrepareCertificateResponse,
  RecentCertificate,
  User,
  VerifyHashResult,
} from '@/types/api';
import { API_URL } from './constants';

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; meta?: PaginationMeta }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vc_token') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vc_token');
      localStorage.removeItem('vc_user');
      window.dispatchEvent(new Event('vc:auth:logout'));
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }

  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiError | null;

  if (!res.ok || !json || json.success === false) {
    const err = json as ApiError | null;
    throw new ApiRequestError(
      res.status,
      err?.error?.code ?? 'UNKNOWN_ERROR',
      err?.error?.message ?? 'Đã có lỗi xảy ra khi kết nối máy chủ.',
      err?.error?.details
    );
  }

  return { data: json.data, meta: json.meta };
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  searchCertificates: (params: URLSearchParams) =>
    request<CertificateSummary[]>(`/api/public/certificates?${params.toString()}`),

  recentCertificates: (limit = 6) =>
    request<RecentCertificate[]>(`/api/public/certificates/recent?limit=${limit}`),

  certificateDetail: (id: string) =>
    request<CertificateDetail>(`/api/public/certificates/${encodeURIComponent(id)}`),

  verifyHash: (hash: string) =>
    request<VerifyHashResult>(`/api/public/verify?hash=${encodeURIComponent(hash)}`),

  filters: () =>
    request<FilterOptions>('/api/public/filters'),

  prepareCertificate: (body: unknown) =>
    request<PrepareCertificateResponse>('/api/certificates/prepare', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  confirmCertificate: (body: unknown) =>
    request<CertificateIssuer>('/api/certificates/confirm', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  issuerCertificates: (params: URLSearchParams) =>
    request<CertificateIssuer[]>(`/api/certificates?${params.toString()}`),

  issuerCertificate: (id: string) =>
    request<CertificateIssuer>(`/api/certificates/${encodeURIComponent(id)}`),

  revokeCertificate: (id: string, txHash: string) =>
    request<CertificateIssuer>(`/api/certificates/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }),

  issuers: (params?: URLSearchParams) =>
    request<Issuer[]>(`/api/issuers${params ? `?${params.toString()}` : ''}`),

  createIssuer: (body: unknown) =>
    request<Issuer>('/api/issuers', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminStats: () => request<AdminStats>('/api/admin/stats'),

  adminCertificates: (params: URLSearchParams) =>
    request<CertificateIssuer[]>(`/api/admin/certificates?${params.toString()}`),
};
