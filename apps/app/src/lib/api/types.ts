// Shapes returned by the Nudge API (see "Nudge · Referencia de la API", section 8).

export type ISODate = string

export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  error?: string
  code?: 'EMAIL_NOT_VERIFIED'
  verificationToken?: string
}

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  emailNotifications: boolean
  createdAt: ISODate
}

export interface AuthResponse {
  user: User
  token: string
}

export interface EmailVerificationRequired {
  user: User
  verificationToken: string
}

export interface Category {
  slug: string
  name: string
}

export interface CatalogProduct {
  position: number
  /** Catalog id (MLM…); it is the externalId used to track the product. */
  id: string
  name: string
  url: string
  pictures: string[]
  price: number
  originalPrice: number | null
  currency: string
  freeShipping: boolean
  itemId: string
  sellersCount: number
}

export interface SearchResult {
  query: string
  page: number
  hasMore: boolean
  products: CatalogProduct[]
}

export type Store = 'mercado_libre' | 'amazon'
export type ThresholdType = 'price_below' | 'percentage_drop'
export type TrackingStatus = 'active' | 'paused'

export interface Product {
  id: string
  store: Store
  externalId: string
  name: string
  url: string
  imageUrl: string | null
  isAvailable: boolean
  createdAt: ISODate
}

export interface TrackedProduct {
  id: string
  product: Product
  thresholdType: ThresholdType
  thresholdValue: number
  referencePrice: number | null
  status: TrackingStatus
  createdAt: ISODate
}

export interface PriceSnapshot {
  id: string
  price: number
  originalPrice: number | null
  sellersCount: number | null
  currency: string
  checkedAt: ISODate
}

export interface Alert {
  id: string
  createdAt: ISODate
  readAt: ISODate | null
  price: number
  originalPrice: number | null
  currency: string
  thresholdType: ThresholdType
  thresholdValue: number
  product: { id: string; name: string; url: string; imageUrl: string | null }
}

export interface AlertList {
  items: Alert[]
  total: number
  page: number
  limit: number
}

export interface Threshold {
  thresholdType: ThresholdType
  thresholdValue: number
}

export interface MercadoLibreAuthStatus {
  authorized: boolean
  access_token_expires_at?: ISODate
}
