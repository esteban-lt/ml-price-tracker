import { api } from './client'
import type {
  AlertList,
  AuthResponse,
  CatalogProduct,
  Category,
  EmailVerificationRequired,
  MercadoLibreAuthStatus,
  PriceSnapshot,
  SearchResult,
  Threshold,
  TrackedProduct,
  User,
} from './types'

// ---------------------------------------------------------------- Auth
export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api<EmailVerificationRequired>('/auth/register', { method: 'POST', body }),
  verifyEmail: (verificationToken: string, code: string) =>
    api<AuthResponse>('/auth/verify-email', { method: 'POST', body: { code }, bearer: verificationToken }),
  resendVerification: (verificationToken: string) =>
    api<void>('/auth/resend-verification', { method: 'POST', bearer: verificationToken }),
  login: (body: { email: string; password: string }) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  logoutAll: () => api<void>('/auth/logout-all', { method: 'POST' }),
  me: () => api<User>('/auth/me'),
  deleteAccount: (password: string) => api<void>('/auth/me', { method: 'DELETE', body: { password } }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<AuthResponse>('/auth/change-password', { method: 'POST', body }),
  forgotPassword: (email: string) => api<void>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (body: { token: string; password: string }) =>
    api<void>('/auth/reset-password', { method: 'POST', body }),
}

// ---------------------------------------------------------------- Users
export const usersApi = {
  setEmailNotifications: (enabled: boolean) =>
    api<User>('/users/me/email-notifications', { method: 'PATCH', body: { enabled } }),
  unsubscribe: (token: string) => api<void>('/users/unsubscribe', { method: 'POST', query: { token } }),
}

// ---------------------------------------------------------------- Catalog (public)
export const catalogApi = {
  categories: () => api<Category[]>('/mercado-libre/categories'),
  bestSellers: (slug: string) => api<CatalogProduct[]>(`/mercado-libre/products/${encodeURIComponent(slug)}`),
  search: (q: string, page = 1) => api<SearchResult>('/mercado-libre/products', { query: { q, page } }),
}

// ---------------------------------------------------------------- Tracking
export const trackingApi = {
  list: () => api<TrackedProduct[]>('/tracked-products'),
  get: (id: string) => api<TrackedProduct>(`/tracked-products/${id}`),
  create: (externalId: string, threshold: Threshold) =>
    api<TrackedProduct>('/tracked-products', {
      method: 'POST',
      body: { store: 'mercado_libre', externalId, ...threshold },
    }),
  updateThreshold: (id: string, threshold: Threshold) =>
    api<TrackedProduct>(`/tracked-products/${id}`, { method: 'PATCH', body: threshold }),
  pause: (id: string) => api<TrackedProduct>(`/tracked-products/${id}/pause`, { method: 'PATCH' }),
  resume: (id: string) => api<TrackedProduct>(`/tracked-products/${id}/resume`, { method: 'PATCH' }),
  remove: (id: string) => api<void>(`/tracked-products/${id}`, { method: 'DELETE' }),
  priceHistory: (productId: string, days: number) =>
    api<PriceSnapshot[]>(`/products/${productId}/price-history`, { query: { days } }),
}

// ---------------------------------------------------------------- Alerts
export const alertsApi = {
  list: (params: { page?: number; limit?: number; unread?: boolean }) =>
    api<AlertList>('/alerts', { query: params }),
  unreadCount: () => api<{ count: number }>('/alerts/unread-count'),
  markRead: (id: string) => api<void>(`/alerts/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api<void>('/alerts/read-all', { method: 'PATCH' }),
}

// ---------------------------------------------------------------- Admin (internal)
export const adminApi = {
  status: () => api<MercadoLibreAuthStatus>('/mercado-libre/auth/status'),
  authUrl: () => api<{ url: string }>('/mercado-libre/auth/url'),
  exchange: (code: string) =>
    api<MercadoLibreAuthStatus>('/mercado-libre/auth/exchange', { method: 'POST', body: { code } }),
}

