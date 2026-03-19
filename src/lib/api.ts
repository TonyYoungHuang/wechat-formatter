export type UserPlan = 'free' | 'vip'
export type PaymentMethod = 'wechat' | 'alipay'
export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled'
export type Platform = 'wechat' | 'xiaohongshu'
export type AIImageMode = 'demo' | 'live'
export type AIImageProvider = 'demo' | 'tencent-hunyuan' | 'jimeng'

export interface AIImageQuota {
  limitType: 'lifetime' | 'daily'
  limit: number
  used: number
  remaining: number
}

export interface UserEntitlements {
  plan: UserPlan
  accessibleTemplateIds: string[]
  features: {
    aiImageMode: AIImageMode
    aiImageProvider: AIImageProvider
    aiImageQuota: AIImageQuota
    aiFormattingCharLimit: number
    draftLimit: number
    draftUsed: number
    exportFormats: string[]
    customPalette: boolean
  }
}

export interface AuthUser {
  id: string
  name: string
  email: string
  plan: UserPlan
  createdAt: string
  updatedAt: string
}

export interface SubscriptionInfo {
  plan: UserPlan
  status: 'active' | 'inactive' | 'expired'
  cycle: BillingCycle | null
  startedAt: string | null
  expiresAt: string | null
  updatedAt: string
}

export interface PaymentCheckout {
  mode: 'mock' | 'live'
  paymentUrl: string
  qrCodeText: string
  instructions: string
  callbackUrl: string | null
}

export interface PaymentOrder {
  id: string
  method: PaymentMethod
  cycle: BillingCycle
  amount: number
  status: PaymentStatus
  providerOrderId: string
  providerTradeNo: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string
  paidAt: string | null
  subscriptionStartedAt: string | null
  subscriptionExpiresAt: string | null
  checkout: PaymentCheckout
}

export interface DraftRecord {
  id: string
  title: string
  content: string
  platform: Platform
  templateId: string
  paletteId: string
  createdAt: string
  updatedAt: string
}

export interface BrandTheme {
  id: string
  name: string
  accent: string
  soft: string
  glow: string
  platform: Platform | 'all'
  createdAt: string
  updatedAt: string
}

export interface AICover {
  id: string
  title: string
  prompt: string
  image: string
}

const TOKEN_KEY = 'formatter-auth-token'

export const authStorage = {
  getToken() {
    return window.sessionStorage.getItem(TOKEN_KEY)
  },
  setToken(token: string) {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  },
  clearToken() {
    window.sessionStorage.removeItem(TOKEN_KEY)
  },
}

export async function register(payload: { name: string; email: string; password: string }) {
  return request<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(payload: { email: string; password: string }) {
  return request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logout(token?: string) {
  await request('/api/auth/logout', {
    method: 'POST',
    token,
  })
}

export async function getCurrentUser(token?: string) {
  const data = await request<{ user: AuthUser }>('/api/auth/me', { token })
  return data.user
}

export async function getSubscription(token?: string) {
  return request<SubscriptionInfo>('/api/user/subscription', { token })
}

export async function getEntitlements(token?: string) {
  return request<UserEntitlements>('/api/user/entitlements', { token })
}

export async function updateSubscription(token: string | undefined, plan: UserPlan, cycle?: BillingCycle) {
  return request<{ user: AuthUser; subscription: SubscriptionInfo }>('/api/user/subscription', {
    method: 'PATCH',
    token,
    body: JSON.stringify({ plan, cycle }),
  })
}

export async function createPaymentOrder(
  token: string | undefined,
  payload: { method: PaymentMethod; cycle: BillingCycle },
) {
  return request<{ order: PaymentOrder }>('/api/payments/create-order', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function getPaymentOrder(token: string | undefined, orderId: string) {
  return request<{ order: PaymentOrder }>(`/api/payments/orders/${orderId}`, { token })
}

export async function simulatePayment(token: string | undefined, orderId: string) {
  return request<{ order: PaymentOrder; user: AuthUser; subscription: SubscriptionInfo }>(
    `/api/payments/orders/${orderId}/simulate-pay`,
    {
      method: 'POST',
      token,
    },
  )
}

export async function listDrafts(token?: string) {
  return request<{ drafts: DraftRecord[]; entitlements: UserEntitlements }>('/api/drafts', { token })
}

export async function listThemes(token?: string) {
  return request<{ themes: BrandTheme[] }>('/api/themes', { token })
}

export async function createTheme(
  token: string | undefined,
  payload: {
    name: string
    accent: string
    soft: string
    glow: string
    platform: Platform | 'all'
  },
) {
  return request<{ theme: BrandTheme }>('/api/themes', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function deleteTheme(token: string | undefined, themeId: string) {
  await request(`/api/themes/${themeId}`, {
    method: 'DELETE',
    token,
  })
}

export async function createDraft(
  token: string | undefined,
  payload: {
    title?: string
    content: string
    platform: Platform
    templateId: string
    paletteId: string
  },
) {
  return request<{ draft: DraftRecord; entitlements: UserEntitlements }>('/api/drafts', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

export async function updateDraft(
  token: string | undefined,
  draftId: string,
  payload: Partial<{
    title: string
    content: string
    platform: Platform
    templateId: string
    paletteId: string
  }>,
) {
  return request<{ draft: DraftRecord; entitlements: UserEntitlements }>(`/api/drafts/${draftId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  })
}

export async function deleteDraft(token: string | undefined, draftId: string) {
  await request(`/api/drafts/${draftId}`, {
    method: 'DELETE',
    token,
  })
}

export async function generateAICovers(
  token: string | undefined,
  payload: {
    title: string
    content: string
    platform: Platform
    accent: string
  },
) {
  return request<{ mode: AIImageMode; provider?: AIImageProvider; covers: AICover[]; entitlements?: UserEntitlements }>('/api/ai/covers', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  })
}

async function request<T = void>(
  url: string,
  options: {
    method?: string
    token?: string
    body?: string
  } = {},
): Promise<T> {
  const response = await fetch(url, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(error?.message || 'Request failed.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
