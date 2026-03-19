import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { generateCoverSuggestions } from './ai-covers.mjs'
import { ensureDb, readDb, writeDb } from './db.mjs'
import { createProviderCheckout, parseProviderCallback } from './payment-gateways.mjs'
import { getDraftLimit, getEntitlements, isTemplateAccessible, isValidPlatform, isValidTemplateId } from './product-config.mjs'

const port = Number(process.env.API_PORT || 3001)
const authSecret = process.env.AUTH_SECRET || 'wechat-formatter-dev-secret'
const nodeEnv = process.env.NODE_ENV || 'development'
const adminApiKey = process.env.ADMIN_API_KEY || ''
const allowMockPayments = process.env.ALLOW_MOCK_PAYMENTS === 'true' || nodeEnv !== 'production'
const paymentNotifyBaseUrl = process.env.PAYMENT_NOTIFY_BASE_URL || ''
const corsOrigins = buildAllowedOrigins(process.env.CORS_ORIGINS || '')
const sessionTtlDays = clampNumber(process.env.SESSION_TTL_DAYS, 7, 1, 30)
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'formatter_session'
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, scope: 'auth' })
const aiLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 12, scope: 'ai' })
const paymentLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 12, scope: 'payments' })
const paymentCatalog = {
  monthly: { firstPrice: 1900, renewalPrice: 2900 },
  quarterly: { price: 5900 },
  yearly: { price: 17900 },
}

if (nodeEnv === 'production' && authSecret === 'wechat-formatter-dev-secret') {
  throw new Error('AUTH_SECRET must be configured in production.')
}

const app = express()

app.set('trust proxy', 1)
app.use(cors(buildCorsOptions()))
app.use(setSecurityHeaders)
app.use(requestLogger)
app.use(express.json({ verify: storeRawBody }))
app.use(express.urlencoded({ extended: false, verify: storeRawBody }))

app.get('/api/health', async (_request, response) => {
  response.json(await buildHealthReport())
})

app.get('/api/health/ready', async (_request, response) => {
  const report = await buildHealthReport()
  response.status(report.readiness.ready ? 200 : 503).json(report)
})

app.post('/api/auth/register', authLimiter, async (request, response) => {
  const { name, email, password } = request.body ?? {}

  if (!name?.trim()) {
    response.status(400).json({ message: 'Name is required.' })
    return
  }

  if (!isValidEmail(email)) {
    response.status(400).json({ message: 'A valid email is required.' })
    return
  }

  if (typeof password !== 'string' || password.length < 8) {
    response.status(400).json({ message: 'Password must be at least 8 characters.' })
    return
  }

  const normalizedEmail = normalizeEmail(email)
  const db = await readDb()
  const existingUser = db.users.find((user) => user.email === normalizedEmail)

  if (existingUser) {
    response.status(409).json({ message: 'This email is already registered.' })
    return
  }

  const timestamp = new Date().toISOString()
  const user = {
    id: randomId(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    plan: 'free',
    subscriptionPlan: 'free',
    subscriptionStatus: 'inactive',
    subscriptionCycle: null,
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    aiImageTotalUsed: 0,
    aiImageDailyUsed: 0,
    aiImageDailyDate: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  db.users.push(user)
  const token = issueSession(db, user.id, timestamp)
  await writeDb(db)
  setSessionCookie(response, token)

  response.status(201).json({
    token,
    user: serializeUser(user),
  })
})

app.post('/api/auth/login', authLimiter, async (request, response) => {
  const { email, password } = request.body ?? {}

  if (!isValidEmail(email) || typeof password !== 'string') {
    response.status(400).json({ message: 'Email and password are required.' })
    return
  }

  const db = await readDb()
  const user = db.users.find((entry) => entry.email === normalizeEmail(email))

  if (!user || !verifyPassword(password, user.passwordHash)) {
    response.status(401).json({ message: 'Invalid email or password.' })
    return
  }

  const token = issueSession(db, user.id)
  await writeDb(db)
  setSessionCookie(response, token)

  response.json({
    token,
    user: serializeUser(user),
  })
})

app.post('/api/auth/logout', authenticate, async (request, response) => {
  const db = await readDb()
  const session = db.authSessions.find((entry) => entry.id === request.authSession.id)

  if (session) {
    session.revokedAt = new Date().toISOString()
    session.updatedAt = session.revokedAt
    await writeDb(db)
  }

  clearSessionCookie(response)
  response.status(204).end()
})

app.get('/api/auth/me', authenticate, async (request, response) => {
  response.json({ user: serializeUser(request.user) })
})

app.get('/api/user/subscription', authenticate, async (request, response) => {
  response.json(serializeSubscription(request.user))
})

app.get('/api/user/entitlements', authenticate, async (request, response) => {
  const db = await readDb()
  const draftUsed = db.drafts.filter((entry) => entry.userId === request.user.id).length
  response.json(getEntitlements(getUserPlan(request.user), draftUsed, request.user))
})

app.patch('/api/user/subscription', authenticate, async (request, response) => {
  if (!isAdminRequest(request)) {
    response.status(403).json({ message: 'Manual subscription changes are restricted to admins.' })
    return
  }

  const { plan, cycle } = request.body ?? {}

  if (plan !== 'free' && plan !== 'vip') {
    response.status(400).json({ message: 'Plan must be either free or vip.' })
    return
  }

  const db = await readDb()
  const targetUser = db.users.find((entry) => entry.id === request.user.id)

  if (!targetUser) {
    response.status(404).json({ message: 'User not found.' })
    return
  }

  const timestamp = new Date().toISOString()

  if (plan === 'free') {
    clearSubscription(targetUser, timestamp)
  } else {
    if (cycle !== 'monthly' && cycle !== 'quarterly' && cycle !== 'yearly') {
      response.status(400).json({ message: 'Cycle must be monthly, quarterly, or yearly when granting vip.' })
      return
    }
    grantSubscription(targetUser, cycle, timestamp)
  }

  await writeDb(db)

  response.json({
    user: serializeUser(targetUser),
    subscription: serializeSubscription(targetUser),
  })
})

app.get('/api/themes', authenticate, async (request, response) => {
  const db = await readDb()
  const themes = db.brandThemes
    .filter((entry) => entry.userId === request.user.id)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())

  response.json({
    themes: themes.map(serializeBrandTheme),
  })
})

app.post('/api/themes', authenticate, async (request, response) => {
  const plan = getUserPlan(request.user)
  const entitlements = getEntitlements(plan)

  if (!entitlements.features.customPalette) {
    response.status(403).json({ message: 'Saving brand themes is a VIP feature.' })
    return
  }

  const { name, accent, soft, glow, platform } = request.body ?? {}

  if (typeof name !== 'string' || !name.trim()) {
    response.status(400).json({ message: 'Theme name is required.' })
    return
  }

  if (!isHexColor(accent) || !isHexColor(soft) || !isRgbaColor(glow)) {
    response.status(400).json({ message: 'Theme colors are invalid.' })
    return
  }

  if (!isThemePlatform(platform)) {
    response.status(400).json({ message: 'Theme platform must be wechat, xiaohongshu, or all.' })
    return
  }

  const db = await readDb()
  const currentThemes = db.brandThemes.filter((entry) => entry.userId === request.user.id)
  if (currentThemes.length >= 12) {
    response.status(403).json({ message: 'VIP plan supports up to 12 saved brand themes.' })
    return
  }

  const timestamp = new Date().toISOString()
  const theme = {
    id: randomId(),
    userId: request.user.id,
    name: name.trim().slice(0, 24),
    accent: accent.toLowerCase(),
    soft: soft.toLowerCase(),
    glow,
    platform,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  db.brandThemes.push(theme)
  await writeDb(db)

  response.status(201).json({
    theme: serializeBrandTheme(theme),
  })
})

app.delete('/api/themes/:themeId', authenticate, async (request, response) => {
  const db = await readDb()
  const index = db.brandThemes.findIndex((entry) => entry.id === request.params.themeId && entry.userId === request.user.id)

  if (index === -1) {
    response.status(404).json({ message: 'Theme not found.' })
    return
  }

  db.brandThemes.splice(index, 1)
  await writeDb(db)
  response.status(204).end()
})

app.get('/api/drafts', authenticate, async (request, response) => {
  const db = await readDb()
  const drafts = db.drafts
    .filter((entry) => entry.userId === request.user.id)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())

  response.json({
    drafts: drafts.map(serializeDraft),
    entitlements: getEntitlements(getUserPlan(request.user), drafts.length, request.user),
  })
})

app.post('/api/drafts', authenticate, async (request, response) => {
  const { title, content, platform, templateId, paletteId } = request.body ?? {}

  if (typeof content !== 'string' || !content.trim()) {
    response.status(400).json({ message: 'Draft content is required.' })
    return
  }

  if (!isValidPlatform(platform)) {
    response.status(400).json({ message: 'A valid platform is required.' })
    return
  }

  if (!isValidTemplateId(templateId) || !isTemplateAccessible(getUserPlan(request.user), templateId)) {
    response.status(403).json({ message: 'Current plan cannot save this template.' })
    return
  }

  const db = await readDb()
  const userDrafts = db.drafts.filter((entry) => entry.userId === request.user.id)
  const draftLimit = getDraftLimit(getUserPlan(request.user))

  if (userDrafts.length >= draftLimit) {
    response.status(403).json({ message: `Current plan supports up to ${draftLimit} drafts.` })
    return
  }

  const timestamp = new Date().toISOString()
  const draft = {
    id: randomId(),
    userId: request.user.id,
    title: deriveDraftTitle(title, content),
    content: String(content),
    platform,
    templateId,
    paletteId: typeof paletteId === 'string' ? paletteId : 'mist',
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  db.drafts.push(draft)
  await writeDb(db)

  response.status(201).json({
    draft: serializeDraft(draft),
    entitlements: getEntitlements(getUserPlan(request.user), userDrafts.length + 1, request.user),
  })
})

app.patch('/api/drafts/:draftId', authenticate, async (request, response) => {
  const db = await readDb()
  const draft = db.drafts.find((entry) => entry.id === request.params.draftId)

  if (!draft || draft.userId !== request.user.id) {
    response.status(404).json({ message: 'Draft not found.' })
    return
  }

  const { title, content, platform, templateId, paletteId } = request.body ?? {}

  if (content !== undefined) {
    if (typeof content !== 'string' || !content.trim()) {
      response.status(400).json({ message: 'Draft content is required.' })
      return
    }
    draft.content = content
  }

  if (platform !== undefined) {
    if (!isValidPlatform(platform)) {
      response.status(400).json({ message: 'A valid platform is required.' })
      return
    }
    draft.platform = platform
  }

  if (templateId !== undefined) {
    if (!isValidTemplateId(templateId) || !isTemplateAccessible(getUserPlan(request.user), templateId)) {
      response.status(403).json({ message: 'Current plan cannot use this template.' })
      return
    }
    draft.templateId = templateId
  }

  if (paletteId !== undefined && typeof paletteId === 'string') {
    draft.paletteId = paletteId
  }

  draft.title = deriveDraftTitle(title ?? draft.title, draft.content)
  draft.updatedAt = new Date().toISOString()

  await writeDb(db)

  response.json({
    draft: serializeDraft(draft),
    entitlements: getEntitlements(getUserPlan(request.user), db.drafts.filter((entry) => entry.userId === request.user.id).length, request.user),
  })
})

app.delete('/api/drafts/:draftId', authenticate, async (request, response) => {
  const db = await readDb()
  const index = db.drafts.findIndex((entry) => entry.id === request.params.draftId && entry.userId === request.user.id)

  if (index === -1) {
    response.status(404).json({ message: 'Draft not found.' })
    return
  }

  db.drafts.splice(index, 1)
  await writeDb(db)
  response.status(204).end()
})

app.post('/api/ai/covers', authenticate, aiLimiter, async (request, response) => {
  const { title, content, platform, accent } = request.body ?? {}
  if (typeof content !== 'string' || !content.trim()) {
    response.status(400).json({ message: 'Article content is required.' })
    return
  }

  if (!isValidPlatform(platform)) {
    response.status(400).json({ message: 'A valid platform is required.' })
    return
  }

  const db = await readDb()
  const targetUser = db.users.find((entry) => entry.id === request.user.id)
  if (!targetUser) {
    response.status(404).json({ message: 'User not found.' })
    return
  }

  const plan = getUserPlan(targetUser)
  const quotaState = consumeAiCoverQuota(targetUser, plan, false, 1)
  if (!quotaState.allowed) {
    response.status(403).json({
      message: quotaState.message,
      entitlements: getEntitlements(plan, db.drafts.filter((entry) => entry.userId === targetUser.id).length, targetUser),
    })
    return
  }

  try {
    const result = await generateCoverSuggestions({
      title: typeof title === 'string' ? title : '',
      content,
      platform,
      accent: typeof accent === 'string' && accent ? accent : '#6d8f7c',
    })

    consumeAiCoverQuota(targetUser, plan, true, result.covers.length || 1)
    await writeDb(db)

    response.json({
      ...result,
      entitlements: getEntitlements(plan, db.drafts.filter((entry) => entry.userId === targetUser.id).length, targetUser),
    })
  } catch (error) {
    response.status(502).json({ message: error instanceof Error ? error.message : 'AI cover generation failed.' })
  }
})

app.post('/api/payments/create-order', authenticate, paymentLimiter, async (request, response) => {
  const { method, cycle } = request.body ?? {}

  if ((method !== 'wechat' && method !== 'alipay') || (cycle !== 'monthly' && cycle !== 'quarterly' && cycle !== 'yearly')) {
    response.status(400).json({ message: 'Payment method and cycle are required.' })
    return
  }

  const db = await readDb()
  const targetUser = db.users.find((entry) => entry.id === request.user.id)

  if (!targetUser) {
    response.status(404).json({ message: 'User not found.' })
    return
  }

  const timestamp = new Date().toISOString()
  const order = {
    id: randomId(),
    userId: targetUser.id,
    method,
    cycle,
    amount: getPaymentAmountForUser(db, targetUser.id, cycle),
    status: 'pending',
    providerOrderId: null,
    providerTradeNo: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    paidAt: null,
    providerMode: 'mock',
    checkout: null,
  }

  try {
    const checkout = await createProviderCheckout({
      order,
      title: getPaymentTitle(order),
      method,
      notifyBaseUrl: paymentNotifyBaseUrl || resolveBaseUrl(request),
      clientIp: request.ip,
      allowMockFallback: allowMockPayments,
    })

    order.providerOrderId = checkout.providerOrderId
    order.providerMode = checkout.mode
    order.checkout = checkout.checkout

    db.orders.push(order)
    await writeDb(db)

    response.status(201).json({
      order: serializeOrder(order),
    })
  } catch (error) {
    response.status(502).json({ message: error instanceof Error ? error.message : 'Payment order creation failed.' })
  }
})

app.get('/api/payments/orders/:orderId', authenticate, async (request, response) => {
  const db = await readDb()
  const order = db.orders.find((entry) => entry.id === request.params.orderId)

  if (!order || order.userId !== request.user.id) {
    response.status(404).json({ message: 'Order not found.' })
    return
  }

  response.json({ order: serializeOrder(order) })
})

app.post('/api/payments/orders/:orderId/simulate-pay', authenticate, paymentLimiter, async (request, response) => {
  if (!allowMockPayments) {
    response.status(403).json({ message: 'Mock payment is disabled in the current environment.' })
    return
  }

  const db = await readDb()
  const order = db.orders.find((entry) => entry.id === request.params.orderId)

  if (!order || order.userId !== request.user.id) {
    response.status(404).json({ message: 'Order not found.' })
    return
  }

  if (order.providerMode !== 'mock') {
    response.status(400).json({ message: 'Live gateway orders must be completed via provider callback.' })
    return
  }

  const result = await markOrderPaid(db, order, `${order.method.toUpperCase()}_TRADE_${randomId(8)}`)

  response.json({
    order: serializeOrder(result.order),
    user: serializeUser(result.user),
    subscription: serializeSubscription(result.user),
  })
})

app.post('/api/payments/callback/:provider', async (request, response) => {
  const provider = request.params.provider
  if (provider !== 'wechat' && provider !== 'alipay') {
    response.status(400).json({ message: 'Invalid callback payload.' })
    return
  }

  try {
    const parsed = await parseProviderCallback({
      provider,
      headers: request.headers,
      rawBody: request.rawBody,
      body: request.body,
    })

    const db = await readDb()
    const order = db.orders.find((entry) => entry.id === parsed.orderId && entry.method === provider)

    if (!order) {
      throw new Error('Order not found.')
    }

    if (parsed.amount !== null && parsed.amount !== order.amount) {
      throw new Error('Callback amount mismatch.')
    }

    if (parsed.paid) {
      const result = await markOrderPaid(db, order, parsed.providerTradeNo || `${provider.toUpperCase()}_TRADE_${randomId(8)}`)

      if (provider === 'wechat') {
        response.json({ code: 'SUCCESS', message: '成功' })
        return
      }

      response.type('text/plain').send('success')
      return
    }

    order.status = 'failed'
    order.updatedAt = new Date().toISOString()
    await writeDb(db)

    if (provider === 'wechat') {
      response.status(500).json({ code: 'FAIL', message: '支付未成功' })
      return
    }

    response.type('text/plain').send('failure')
  } catch (error) {
    if (provider === 'wechat') {
      response.status(401).json({ code: 'FAIL', message: error instanceof Error ? error.message : '回调验签失败' })
      return
    }

    response.status(400).type('text/plain').send('failure')
  }
})

await ensureDb()

app.listen(port, () => {
  void logStartupReadiness()
  console.log(`Auth API listening on http://localhost:${port}`)
})

async function authenticate(request, response, next) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      response.status(401).json({ message: 'Authentication required.' })
      return
    }

    const payload = verifyToken(token)
    const db = await readDb()
    const session = db.authSessions.find((entry) => entry.id === payload.sid)
    if (!isSessionActive(session) || session.userId !== payload.sub) {
      clearSessionCookie(response)
      response.status(401).json({ message: 'Session expired. Please sign in again.' })
      return
    }
    const user = db.users.find((entry) => entry.id === payload.sub)

    if (!user) {
      clearSessionCookie(response)
      response.status(401).json({ message: 'User not found.' })
      return
    }

    request.user = user
    request.authSession = session
    next()
  } catch (error) {
    clearSessionCookie(response)
    response.status(401).json({ message: error instanceof Error ? error.message : 'Invalid token.' })
  }
}

function getBearerToken(header) {
  if (!header?.startsWith('Bearer ')) {
    return null
  }

  return header.slice(7)
}

function getTokenFromRequest(request) {
  const bearerToken = getBearerToken(request.headers.authorization)
  if (bearerToken) {
    return bearerToken
  }

  const cookies = parseCookies(request.headers.cookie)
  return cookies[sessionCookieName] || null
}

function isAdminRequest(request) {
  return Boolean(adminApiKey) && request.headers['x-admin-key'] === adminApiKey
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeEmail(value) {
  return String(value).trim().toLowerCase()
}

function getUserPlan(user) {
  return isSubscriptionActive(user) ? 'vip' : 'free'
}

function isSubscriptionActive(user) {
  if (!user?.subscriptionExpiresAt) {
    return false
  }

  const expiresAt = new Date(user.subscriptionExpiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

function clearSubscription(user, timestamp = new Date().toISOString()) {
  user.plan = 'free'
  user.subscriptionPlan = 'free'
  user.subscriptionStatus = 'inactive'
  user.subscriptionCycle = null
  user.subscriptionStartedAt = null
  user.subscriptionExpiresAt = null
  user.updatedAt = timestamp
}

function grantSubscription(user, cycle, referenceTimestamp = new Date().toISOString()) {
  const baseTime = getSubscriptionBaseTime(user, referenceTimestamp)
  const expiresAt = addSubscriptionCycle(baseTime, cycle)

  user.plan = 'vip'
  user.subscriptionPlan = 'vip'
  user.subscriptionStatus = 'active'
  user.subscriptionCycle = cycle
  user.subscriptionStartedAt = baseTime.toISOString()
  user.subscriptionExpiresAt = expiresAt.toISOString()
  user.updatedAt = referenceTimestamp

  return {
    startedAt: user.subscriptionStartedAt,
    expiresAt: user.subscriptionExpiresAt,
  }
}

function getSubscriptionBaseTime(user, referenceTimestamp) {
  if (isSubscriptionActive(user) && user.subscriptionExpiresAt) {
    return new Date(user.subscriptionExpiresAt)
  }

  return new Date(referenceTimestamp)
}

function addSubscriptionCycle(date, cycle) {
  const next = new Date(date)
  if (cycle === 'quarterly') {
    next.setDate(next.getDate() + 90)
    return next
  }

  if (cycle === 'yearly') {
    next.setMonth(next.getMonth() + 13)
    return next
  }

  next.setDate(next.getDate() + 30)
  return next
}

function getPaymentAmountForUser(db, userId, cycle) {
  if (cycle === 'quarterly') {
    return paymentCatalog.quarterly.price
  }

  if (cycle === 'yearly') {
    return paymentCatalog.yearly.price
  }

  const hasPaidMonthlyOrder = db.orders.some(
    (order) => order.userId === userId && order.status === 'paid' && order.cycle === 'monthly',
  )

  return hasPaidMonthlyOrder ? paymentCatalog.monthly.renewalPrice : paymentCatalog.monthly.firstPrice
}

function getPaymentTitle(order) {
  if (order.cycle === 'quarterly') {
    return 'Paibanmao VIP Quarterly'
  }

  if (order.cycle === 'yearly') {
    return 'Paibanmao VIP Yearly 13 Months'
  }

  return order.amount === paymentCatalog.monthly.firstPrice
    ? 'Paibanmao VIP Monthly First Offer'
    : 'Paibanmao VIP Monthly Renewal'
}

function consumeAiCoverQuota(user, plan, commit, quantity = 1) {
  const nowDate = getQuotaDateLabel()
  const normalizedQuantity = Math.max(1, Number(quantity || 1))

  if (plan === 'vip') {
    if (user.aiImageDailyDate !== nowDate) {
      user.aiImageDailyDate = nowDate
      user.aiImageDailyUsed = 0
    }

    if (user.aiImageDailyUsed + normalizedQuantity > 3) {
      return {
        allowed: false,
        message: '今日 AI 生成封面额度已用完，会员用户每天可生成 3 次。',
      }
    }

    if (commit) {
      user.aiImageDailyUsed += normalizedQuantity
      user.aiImageTotalUsed = Number(user.aiImageTotalUsed || 0) + normalizedQuantity
    }

    return { allowed: true }
  }

  if (Number(user.aiImageTotalUsed || 0) + normalizedQuantity > 10) {
    return {
      allowed: false,
      message: '免费用户 AI 生成封面累计 10 次额度已用完，请升级会员继续使用。',
    }
  }

  if (commit) {
    user.aiImageTotalUsed = Number(user.aiImageTotalUsed || 0) + normalizedQuantity
  }

  return { allowed: true }
}

function getQuotaDateLabel() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function randomId(size = 12) {
  return randomBytes(size).toString('hex')
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash).split(':')
  if (!salt || !hash) {
    return false
  }

  const derived = scryptSync(password, salt, 64)
  const stored = Buffer.from(hash, 'hex')

  return stored.length === derived.length && timingSafeEqual(stored, derived)
}

function signToken(userId, sessionId, expiresAt) {
  const payload = {
    sub: userId,
    sid: sessionId,
    exp: new Date(expiresAt).getTime(),
  }

  const encodedHeader = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = createHmac('sha256', authSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

function verifyToken(token) {
  const [encodedHeader, encodedPayload, signature] = token.split('.')

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Invalid token.')
  }

  const expectedSignature = createHmac('sha256', authSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature.')
  }

  const payload = JSON.parse(decodeBase64Url(encodedPayload))

  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('Invalid token payload.')
  }

  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    throw new Error('Token expired.')
  }

  return payload
}

function encodeBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

async function markOrderPaid(db, order, providerTradeNo) {
  if (order.status === 'paid') {
    const user = db.users.find((entry) => entry.id === order.userId)
    return { order, user }
  }

  const user = db.users.find((entry) => entry.id === order.userId)
  if (!user) {
    throw new Error('User not found for payment order.')
  }

  const timestamp = new Date().toISOString()
  order.status = 'paid'
  order.providerTradeNo = providerTradeNo
  order.paidAt = timestamp
  order.updatedAt = timestamp
  const subscriptionWindow = grantSubscription(user, order.cycle, timestamp)
  order.subscriptionStartedAt = subscriptionWindow.startedAt
  order.subscriptionExpiresAt = subscriptionWindow.expiresAt

  await writeDb(db)

  return { order, user }
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: getUserPlan(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function serializeSubscription(user) {
  return {
    plan: getUserPlan(user),
    status: isSubscriptionActive(user)
      ? 'active'
      : user.subscriptionExpiresAt
        ? 'expired'
        : 'inactive',
    cycle: user.subscriptionCycle,
    startedAt: user.subscriptionStartedAt,
    expiresAt: user.subscriptionExpiresAt,
    updatedAt: user.updatedAt,
  }
}

function serializeOrder(order) {
  return {
    id: order.id,
    method: order.method,
    cycle: order.cycle,
    amount: order.amount,
    status: order.status,
    providerOrderId: order.providerOrderId,
    providerTradeNo: order.providerTradeNo,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    subscriptionStartedAt: order.subscriptionStartedAt || null,
    subscriptionExpiresAt: order.subscriptionExpiresAt || null,
    checkout: order.checkout,
  }
}

function serializeDraft(draft) {
  return {
    id: draft.id,
    title: draft.title,
    content: draft.content,
    platform: draft.platform,
    templateId: draft.templateId,
    paletteId: draft.paletteId,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  }
}

function serializeBrandTheme(theme) {
  return {
    id: theme.id,
    name: theme.name,
    accent: theme.accent,
    soft: theme.soft,
    glow: theme.glow,
    platform: theme.platform,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
  }
}

function deriveDraftTitle(title, content) {
  const explicitTitle = typeof title === 'string' ? title.trim() : ''
  if (explicitTitle) {
    return explicitTitle.slice(0, 60)
  }

  const firstLine = String(content)
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  return (firstLine || '未命名草稿').slice(0, 60)
}

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function isRgbaColor(value) {
  return typeof value === 'string' && /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|0?\.\d+|1)\s*\)$/.test(value)
}

function isThemePlatform(value) {
  return value === 'wechat' || value === 'xiaohongshu' || value === 'all'
}

function storeRawBody(request, _response, buffer) {
  request.rawBody = buffer.toString('utf8')
}

function resolveBaseUrl(request) {
  return `${request.protocol}://${request.get('host')}`
}

function requestLogger(request, response, next) {
  const requestId = randomId(6)
  const startedAt = Date.now()

  request.requestId = requestId
  response.setHeader('X-Request-Id', requestId)
  response.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.log(
      `[${new Date().toISOString()}] ${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms req=${requestId}`,
    )
  })

  next()
}

function buildAllowedOrigins(value) {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function buildHealthReport() {
  let databaseReady = true
  let databaseError = null

  try {
    await ensureDb()
  } catch (error) {
    databaseReady = false
    databaseError = error instanceof Error ? error.message : 'Database init failed.'
  }

  const checks = buildStartupChecks(databaseReady)
  const blocking = Object.entries(checks)
    .filter(([, value]) => value.required && !value.ready)
    .map(([key]) => key)

  return {
    status: blocking.length === 0 ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: nodeEnv,
    databaseError,
    checks,
    readiness: {
      ready: blocking.length === 0,
      blocking,
    },
  }
}

async function logStartupReadiness() {
  const report = await buildHealthReport()
  if (report.readiness.ready) {
    console.log('[startup] readiness=ready')
    return
  }

  console.warn(`[startup] readiness=not-ready missing=${report.readiness.blocking.join(',')}`)
}

function buildStartupChecks(databaseReady) {
  return {
    authSecretConfigured: {
      ready: nodeEnv !== 'production' || authSecret !== 'wechat-formatter-dev-secret',
      required: nodeEnv === 'production',
    },
    adminApiKeyConfigured: {
      ready: Boolean(adminApiKey),
      required: nodeEnv === 'production',
    },
    corsOriginsConfigured: {
      ready: nodeEnv !== 'production' || corsOrigins.length > 0,
      required: nodeEnv === 'production',
    },
    databaseReady: {
      ready: databaseReady,
      required: true,
    },
    paymentCallbackConfigured: {
      ready: nodeEnv !== 'production' || Boolean(paymentNotifyBaseUrl),
      required: nodeEnv === 'production',
    },
    mockPaymentsDisabled: {
      ready: nodeEnv !== 'production' || !allowMockPayments,
      required: nodeEnv === 'production',
    },
    wechatLiveConfigReady: {
      ready: hasWechatLiveConfig(),
      required: nodeEnv === 'production',
    },
    alipayLiveConfigReady: {
      ready: hasAlipayLiveConfig(),
      required: nodeEnv === 'production',
    },
    aiImageConfigReady: {
      ready: hasTencentHunyuanConfig(),
      required: nodeEnv === 'production',
    },
  }
}

function hasWechatLiveConfig() {
  return Boolean(
    process.env.WECHAT_PAY_APP_ID &&
    process.env.WECHAT_PAY_MCH_ID &&
    process.env.WECHAT_PAY_MCH_SERIAL_NO &&
    process.env.WECHAT_PAY_PRIVATE_KEY_PEM &&
    process.env.WECHAT_PAY_API_V3_KEY &&
    (process.env.WECHAT_PAY_PLATFORM_CERT_PEM || process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM),
  )
}

function hasAlipayLiveConfig() {
  return Boolean(
    process.env.ALIPAY_APP_ID &&
    process.env.ALIPAY_PRIVATE_KEY_PEM &&
    process.env.ALIPAY_PUBLIC_KEY_PEM,
  )
}

function hasTencentHunyuanConfig() {
  return Boolean(
    process.env.TENCENT_HUNYUAN_SECRET_ID &&
    process.env.TENCENT_HUNYUAN_SECRET_KEY &&
    process.env.TENCENT_HUNYUAN_REGION &&
    process.env.TENCENT_HUNYUAN_IMAGE_STYLE,
  )
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function createRateLimiter({ windowMs, max, scope }) {
  const hits = new Map()

  return (request, response, next) => {
    const now = Date.now()
    const key = `${scope}:${request.ip || request.headers['x-forwarded-for'] || 'unknown'}`
    const current = hits.get(key)

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      next()
      return
    }

    current.count += 1
    hits.set(key, current)

    if (current.count > max) {
      response.setHeader('Retry-After', String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))))
      response.status(429).json({ message: 'Too many requests. Please try again later.' })
      return
    }

    next()
  }
}

function buildCorsOptions() {
  const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ]
  const allowedOrigins = corsOrigins.length > 0 ? corsOrigins : nodeEnv === 'production' ? [] : devOrigins

  return {
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }

      callback(null, allowedOrigins.includes(origin))
    },
  }
}

function setSecurityHeaders(_request, response, next) {
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (nodeEnv === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {}
  }

  return cookieHeader.split(';').reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split('=')
    if (!name) {
      return cookies
    }

    cookies[name] = decodeURIComponent(rest.join('='))
    return cookies
  }, {})
}

function issueSession(db, userId, timestamp = new Date().toISOString()) {
  const expiresAt = new Date(new Date(timestamp).getTime() + sessionTtlDays * 24 * 60 * 60 * 1000).toISOString()
  const session = {
    id: randomId(16),
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt,
    revokedAt: null,
  }

  db.authSessions.push(session)
  return signToken(userId, session.id, expiresAt)
}

function setSessionCookie(response, token) {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
    maxAge: sessionTtlDays * 24 * 60 * 60 * 1000,
  })
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
  })
}

function isSessionActive(session) {
  if (!session || session.revokedAt || !session.expiresAt) {
    return false
  }

  const expiresAt = new Date(session.expiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}
