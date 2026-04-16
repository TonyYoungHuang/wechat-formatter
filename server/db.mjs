import Database from 'better-sqlite3'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const sqliteFile = path.resolve(process.cwd(), process.env.DATABASE_PATH || path.join('server', 'data', 'app.sqlite'))
const legacyJsonFile = path.join(dataDir, 'db.json')

let sqlite = null
let initialized = false

export async function ensureDb() {
  if (initialized) {
    return
  }

  await mkdir(path.dirname(sqliteFile), { recursive: true })
  const db = getConnection()

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      plan TEXT,
      subscription_plan TEXT,
      subscription_status TEXT,
      subscription_cycle TEXT,
      subscription_started_at TEXT,
      subscription_expires_at TEXT,
      ai_image_total_used INTEGER DEFAULT 0,
      ai_image_daily_used INTEGER DEFAULT 0,
      ai_image_daily_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      method TEXT NOT NULL,
      cycle TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      provider_order_id TEXT,
      provider_trade_no TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      paid_at TEXT,
      provider_mode TEXT,
      checkout_json TEXT,
      subscription_started_at TEXT,
      subscription_expires_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      platform TEXT NOT NULL,
      template_id TEXT NOT NULL,
      palette_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brand_themes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      accent TEXT NOT NULL,
      soft TEXT NOT NULL,
      glow TEXT NOT NULL,
      platform TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON orders(provider_order_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
    CREATE INDEX IF NOT EXISTS idx_brand_themes_user_id ON brand_themes(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
  `)

  ensureColumn(db, 'users', 'ai_image_total_used', 'INTEGER DEFAULT 0')
  ensureColumn(db, 'users', 'ai_image_daily_used', 'INTEGER DEFAULT 0')
  ensureColumn(db, 'users', 'ai_image_daily_date', 'TEXT')

  migrateLegacyJsonIfNeeded(db)
  initialized = true
}

export async function readDb() {
  await ensureDb()
  const db = getConnection()

  return {
    users: db.prepare(`
      SELECT
        id,
        name,
        email,
        password_hash as passwordHash,
        plan,
        subscription_plan as subscriptionPlan,
        subscription_status as subscriptionStatus,
        subscription_cycle as subscriptionCycle,
        subscription_started_at as subscriptionStartedAt,
        subscription_expires_at as subscriptionExpiresAt,
        ai_image_total_used as aiImageTotalUsed,
        ai_image_daily_used as aiImageDailyUsed,
        ai_image_daily_date as aiImageDailyDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
    `).all().map(normalizeUserRecord),
    orders: db.prepare(`
      SELECT
        id,
        user_id as userId,
        method,
        cycle,
        amount,
        status,
        provider_order_id as providerOrderId,
        provider_trade_no as providerTradeNo,
        created_at as createdAt,
        updated_at as updatedAt,
        expires_at as expiresAt,
        paid_at as paidAt,
        provider_mode as providerMode,
        checkout_json as checkoutJson,
        subscription_started_at as subscriptionStartedAt,
        subscription_expires_at as subscriptionExpiresAt
      FROM orders
    `).all().map(deserializeOrder),
    drafts: db.prepare(`
      SELECT
        id,
        user_id as userId,
        title,
        content,
        platform,
        template_id as templateId,
        palette_id as paletteId,
        created_at as createdAt,
        updated_at as updatedAt
      FROM drafts
    `).all(),
    brandThemes: db.prepare(`
      SELECT
        id,
        user_id as userId,
        name,
        accent,
        soft,
        glow,
        platform,
        created_at as createdAt,
        updated_at as updatedAt
      FROM brand_themes
    `).all(),
    authSessions: db.prepare(`
      SELECT
        id,
        user_id as userId,
        created_at as createdAt,
        updated_at as updatedAt,
        expires_at as expiresAt,
        revoked_at as revokedAt
      FROM auth_sessions
    `).all(),
  }
}

export async function writeDb(snapshot) {
  await ensureDb()
  const db = getConnection()
  const safeSnapshot = {
    users: Array.isArray(snapshot?.users) ? snapshot.users : [],
    orders: Array.isArray(snapshot?.orders) ? snapshot.orders : [],
    drafts: Array.isArray(snapshot?.drafts) ? snapshot.drafts : [],
    brandThemes: Array.isArray(snapshot?.brandThemes) ? snapshot.brandThemes : [],
    authSessions: Array.isArray(snapshot?.authSessions) ? snapshot.authSessions : [],
  }

  const transaction = db.transaction((input) => {
    db.prepare('DELETE FROM auth_sessions').run()
    db.prepare('DELETE FROM brand_themes').run()
    db.prepare('DELETE FROM drafts').run()
    db.prepare('DELETE FROM orders').run()
    db.prepare('DELETE FROM users').run()

    const insertUser = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, plan, subscription_plan, subscription_status,
        subscription_cycle, subscription_started_at, subscription_expires_at,
        ai_image_total_used, ai_image_daily_used, ai_image_daily_date, created_at, updated_at
      ) VALUES (
        @id, @name, @email, @passwordHash, @plan, @subscriptionPlan, @subscriptionStatus,
        @subscriptionCycle, @subscriptionStartedAt, @subscriptionExpiresAt,
        @aiImageTotalUsed, @aiImageDailyUsed, @aiImageDailyDate, @createdAt, @updatedAt
      )
    `)

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, user_id, method, cycle, amount, status, provider_order_id, provider_trade_no,
        created_at, updated_at, expires_at, paid_at, provider_mode, checkout_json,
        subscription_started_at, subscription_expires_at
      ) VALUES (
        @id, @userId, @method, @cycle, @amount, @status, @providerOrderId, @providerTradeNo,
        @createdAt, @updatedAt, @expiresAt, @paidAt, @providerMode, @checkoutJson,
        @subscriptionStartedAt, @subscriptionExpiresAt
      )
    `)

    const insertDraft = db.prepare(`
      INSERT INTO drafts (
        id, user_id, title, content, platform, template_id, palette_id, created_at, updated_at
      ) VALUES (
        @id, @userId, @title, @content, @platform, @templateId, @paletteId, @createdAt, @updatedAt
      )
    `)

    const insertBrandTheme = db.prepare(`
      INSERT INTO brand_themes (
        id, user_id, name, accent, soft, glow, platform, created_at, updated_at
      ) VALUES (
        @id, @userId, @name, @accent, @soft, @glow, @platform, @createdAt, @updatedAt
      )
    `)

    const insertAuthSession = db.prepare(`
      INSERT INTO auth_sessions (
        id, user_id, created_at, updated_at, expires_at, revoked_at
      ) VALUES (
        @id, @userId, @createdAt, @updatedAt, @expiresAt, @revokedAt
      )
    `)

    for (const user of input.users) {
      insertUser.run({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        plan: user.plan || 'free',
        subscriptionPlan: user.subscriptionPlan || null,
        subscriptionStatus: user.subscriptionStatus || null,
        subscriptionCycle: user.subscriptionCycle || null,
        subscriptionStartedAt: user.subscriptionStartedAt || null,
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        aiImageTotalUsed: Number(user.aiImageTotalUsed || 0),
        aiImageDailyUsed: Number(user.aiImageDailyUsed || 0),
        aiImageDailyDate: user.aiImageDailyDate || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    }

    for (const order of input.orders) {
      insertOrder.run({
        id: order.id,
        userId: order.userId,
        method: order.method,
        cycle: order.cycle,
        amount: order.amount,
        status: order.status,
        providerOrderId: order.providerOrderId || null,
        providerTradeNo: order.providerTradeNo || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt || null,
        providerMode: order.providerMode || null,
        checkoutJson: order.checkout ? JSON.stringify(order.checkout) : null,
        subscriptionStartedAt: order.subscriptionStartedAt || null,
        subscriptionExpiresAt: order.subscriptionExpiresAt || null,
      })
    }

    for (const draft of input.drafts) {
      insertDraft.run({
        id: draft.id,
        userId: draft.userId,
        title: draft.title,
        content: draft.content,
        platform: draft.platform,
        templateId: draft.templateId,
        paletteId: draft.paletteId,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      })
    }

    for (const theme of input.brandThemes) {
      insertBrandTheme.run({
        id: theme.id,
        userId: theme.userId,
        name: theme.name,
        accent: theme.accent,
        soft: theme.soft,
        glow: theme.glow,
        platform: theme.platform || 'all',
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      })
    }

    for (const session of input.authSessions) {
      insertAuthSession.run({
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt || null,
      })
    }
  })

  transaction(safeSnapshot)
}

function getConnection() {
  if (!sqlite) {
    sqlite = new Database(sqliteFile)
  }

  return sqlite
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  if (columns.some((column) => column.name === columnName)) {
    return
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`)
}

function deserializeOrder(order) {
  return {
    ...order,
    checkout: order.checkoutJson ? JSON.parse(order.checkoutJson) : null,
  }
}

function normalizeUserRecord(user) {
  const timestamp = user.updatedAt || user.createdAt || new Date().toISOString()
  const normalized = {
    ...user,
    subscriptionPlan: user.subscriptionPlan || (user.plan === 'vip' ? 'vip' : 'free'),
    subscriptionStatus: user.subscriptionStatus || (user.plan === 'vip' ? 'active' : 'inactive'),
    subscriptionCycle: user.subscriptionCycle || null,
    subscriptionStartedAt: user.subscriptionStartedAt || null,
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    aiImageTotalUsed: Number(user.aiImageTotalUsed || 0),
    aiImageDailyUsed: Number(user.aiImageDailyUsed || 0),
    aiImageDailyDate: user.aiImageDailyDate || null,
  }

  if (normalized.plan === 'vip' && !normalized.subscriptionExpiresAt) {
    normalized.subscriptionPlan = 'vip'
    normalized.subscriptionStatus = 'active'
    normalized.subscriptionCycle = normalized.subscriptionCycle || 'yearly'
    normalized.subscriptionStartedAt = normalized.subscriptionStartedAt || timestamp
    normalized.subscriptionExpiresAt = normalized.subscriptionExpiresAt || addSubscriptionCycle(new Date(timestamp), 'yearly').toISOString()
  }

  if (!isSubscriptionActive(normalized)) {
    normalized.plan = 'free'
    normalized.subscriptionPlan = 'free'
    normalized.subscriptionStatus = 'inactive'
    normalized.subscriptionCycle = normalized.subscriptionCycle || null
    if (normalized.subscriptionExpiresAt && new Date(normalized.subscriptionExpiresAt).getTime() <= Date.now()) {
      normalized.subscriptionStatus = 'expired'
    }
  } else {
    normalized.plan = 'vip'
  }

  return normalized
}

function migrateLegacyJsonIfNeeded(db) {
  if (!existsSync(legacyJsonFile) || hasExistingData(db)) {
    return
  }

  const snapshot = readLegacyJson()
  if (!snapshot) {
    return
  }

  const transaction = db.transaction((input) => {
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, plan, subscription_plan, subscription_status,
        subscription_cycle, subscription_started_at, subscription_expires_at,
        ai_image_total_used, ai_image_daily_used, ai_image_daily_date, created_at, updated_at
      ) VALUES (
        @id, @name, @email, @passwordHash, @plan, @subscriptionPlan, @subscriptionStatus,
        @subscriptionCycle, @subscriptionStartedAt, @subscriptionExpiresAt,
        @aiImageTotalUsed, @aiImageDailyUsed, @aiImageDailyDate, @createdAt, @updatedAt
      )
    `)

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        id, user_id, method, cycle, amount, status, provider_order_id, provider_trade_no,
        created_at, updated_at, expires_at, paid_at, provider_mode, checkout_json,
        subscription_started_at, subscription_expires_at
      ) VALUES (
        @id, @userId, @method, @cycle, @amount, @status, @providerOrderId, @providerTradeNo,
        @createdAt, @updatedAt, @expiresAt, @paidAt, @providerMode, @checkoutJson,
        @subscriptionStartedAt, @subscriptionExpiresAt
      )
    `)

    const insertDraft = db.prepare(`
      INSERT INTO drafts (
        id, user_id, title, content, platform, template_id, palette_id, created_at, updated_at
      ) VALUES (
        @id, @userId, @title, @content, @platform, @templateId, @paletteId, @createdAt, @updatedAt
      )
    `)

    const insertBrandTheme = db.prepare(`
      INSERT INTO brand_themes (
        id, user_id, name, accent, soft, glow, platform, created_at, updated_at
      ) VALUES (
        @id, @userId, @name, @accent, @soft, @glow, @platform, @createdAt, @updatedAt
      )
    `)

    const insertAuthSession = db.prepare(`
      INSERT INTO auth_sessions (
        id, user_id, created_at, updated_at, expires_at, revoked_at
      ) VALUES (
        @id, @userId, @createdAt, @updatedAt, @expiresAt, @revokedAt
      )
    `)

    for (const user of input.users) {
      insertUser.run({
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        plan: user.plan || 'free',
        subscriptionPlan: user.subscriptionPlan || null,
        subscriptionStatus: user.subscriptionStatus || null,
        subscriptionCycle: user.subscriptionCycle || null,
        subscriptionStartedAt: user.subscriptionStartedAt || null,
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        aiImageTotalUsed: Number(user.aiImageTotalUsed || 0),
        aiImageDailyUsed: Number(user.aiImageDailyUsed || 0),
        aiImageDailyDate: user.aiImageDailyDate || null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
    }

    for (const order of input.orders) {
      insertOrder.run({
        id: order.id,
        userId: order.userId,
        method: order.method,
        cycle: order.cycle,
        amount: order.amount,
        status: order.status,
        providerOrderId: order.providerOrderId || null,
        providerTradeNo: order.providerTradeNo || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt || null,
        providerMode: order.providerMode || null,
        checkoutJson: order.checkout ? JSON.stringify(order.checkout) : null,
        subscriptionStartedAt: order.subscriptionStartedAt || null,
        subscriptionExpiresAt: order.subscriptionExpiresAt || null,
      })
    }

    for (const draft of input.drafts) {
      insertDraft.run({
        id: draft.id,
        userId: draft.userId,
        title: draft.title,
        content: draft.content,
        platform: draft.platform,
        templateId: draft.templateId,
        paletteId: draft.paletteId,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      })
    }

    for (const theme of input.brandThemes || []) {
      insertBrandTheme.run({
        id: theme.id,
        userId: theme.userId,
        name: theme.name,
        accent: theme.accent,
        soft: theme.soft,
        glow: theme.glow,
        platform: theme.platform || 'all',
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      })
    }

    for (const session of input.authSessions || []) {
      insertAuthSession.run({
        id: session.id,
        userId: session.userId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt || null,
      })
    }
  })

  transaction(snapshot)
}

function hasExistingData(db) {
  const { userCount } = db.prepare('SELECT COUNT(1) as userCount FROM users').get()
  const { orderCount } = db.prepare('SELECT COUNT(1) as orderCount FROM orders').get()
  const { draftCount } = db.prepare('SELECT COUNT(1) as draftCount FROM drafts').get()
  const { brandThemeCount } = db.prepare('SELECT COUNT(1) as brandThemeCount FROM brand_themes').get()
  const { authSessionCount } = db.prepare('SELECT COUNT(1) as authSessionCount FROM auth_sessions').get()
  return userCount > 0 || orderCount > 0 || draftCount > 0 || brandThemeCount > 0 || authSessionCount > 0
}

function readLegacyJson() {
  try {
    const raw = readFileSync(legacyJsonFile, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      brandThemes: Array.isArray(parsed.brandThemes) ? parsed.brandThemes : [],
      authSessions: Array.isArray(parsed.authSessions) ? parsed.authSessions : [],
    }
  } catch {
    return null
  }
}

function isSubscriptionActive(user) {
  if (!user?.subscriptionExpiresAt) {
    return false
  }

  const expiresAt = new Date(user.subscriptionExpiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
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
