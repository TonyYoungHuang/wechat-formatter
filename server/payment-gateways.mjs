import { createDecipheriv, createPrivateKey, createPublicKey, createSign, createVerify, randomBytes } from 'node:crypto'
import 'dotenv/config'

const paymentHttpTimeoutMs = clampNumber(process.env.PAYMENT_HTTP_TIMEOUT_MS, 12000, 3000, 30000)

const wechatConfig = {
  appId: process.env.WECHAT_PAY_APP_ID || '',
  mchId: process.env.WECHAT_PAY_MCH_ID || '',
  mchSerialNo: process.env.WECHAT_PAY_MCH_SERIAL_NO || '',
  privateKeyPem: normalizePem(process.env.WECHAT_PAY_PRIVATE_KEY_PEM || ''),
  apiV3Key: process.env.WECHAT_PAY_API_V3_KEY || '',
  platformCertSerial: process.env.WECHAT_PAY_PLATFORM_CERT_SERIAL || '',
  platformCertPem: normalizePem(process.env.WECHAT_PAY_PLATFORM_CERT_PEM || ''),
  platformPublicKeyPem: normalizePem(process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM || ''),
  notifyBaseUrl: process.env.WECHAT_PAY_NOTIFY_BASE_URL || process.env.PAYMENT_NOTIFY_BASE_URL || '',
}

const alipayConfig = {
  appId: process.env.ALIPAY_APP_ID || '',
  privateKeyPem: normalizePem(process.env.ALIPAY_PRIVATE_KEY_PEM || ''),
  publicKeyPem: normalizePem(process.env.ALIPAY_PUBLIC_KEY_PEM || ''),
  notifyBaseUrl: process.env.ALIPAY_NOTIFY_BASE_URL || process.env.PAYMENT_NOTIFY_BASE_URL || '',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
}

export async function createProviderCheckout({ order, title, method, notifyBaseUrl, clientIp, allowMockFallback = true }) {
  if (method === 'wechat') {
    if (canUseWechat()) {
      return createWechatNativeCheckout({ order, title, notifyBaseUrl, clientIp })
    }
    if (!allowMockFallback) {
      throw new Error('WeChat Pay is not configured for live checkout.')
    }
    return createMockCheckout(order, method, notifyBaseUrl)
  }

  if (canUseAlipay()) {
    return createAlipayPrecreateCheckout({ order, title, notifyBaseUrl })
  }

  if (!allowMockFallback) {
    throw new Error('Alipay is not configured for live checkout.')
  }

  return createMockCheckout(order, method, notifyBaseUrl)
}

export async function parseProviderCallback({ provider, headers, rawBody, body }) {
  if (provider === 'wechat') {
    return parseWechatCallback({ headers, rawBody })
  }

  return parseAlipayCallback(body)
}

function canUseWechat() {
  return Boolean(
    wechatConfig.appId &&
    wechatConfig.mchId &&
    wechatConfig.mchSerialNo &&
    wechatConfig.privateKeyPem &&
    wechatConfig.apiV3Key &&
    (wechatConfig.platformCertPem || wechatConfig.platformPublicKeyPem),
  )
}

function canUseAlipay() {
  return Boolean(alipayConfig.appId && alipayConfig.privateKeyPem && alipayConfig.publicKeyPem)
}

async function createWechatNativeCheckout({ order, title, notifyBaseUrl, clientIp }) {
  const path = '/v3/pay/transactions/native'
  const notifyUrl = `${resolveNotifyBaseUrl(notifyBaseUrl, wechatConfig.notifyBaseUrl)}/api/payments/callback/wechat`
  const body = JSON.stringify({
    appid: wechatConfig.appId,
    mchid: wechatConfig.mchId,
    description: title,
    out_trade_no: order.id,
    notify_url: notifyUrl,
    amount: {
      total: order.amount,
      currency: 'CNY',
    },
    scene_info: {
      payer_client_ip: clientIp || '127.0.0.1',
    },
  })

  const response = await fetchWithTimeout(`https://api.mch.weixin.qq.com${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: buildWechatAuthorization('POST', path, body),
      'Wechatpay-Serial': wechatConfig.mchSerialNo,
      'User-Agent': 'wechat-formatter/1.0',
    },
    body,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || payload.code || 'Failed to create WeChat Pay order.')
  }

  return {
    mode: 'live',
    providerOrderId: order.id,
    checkout: {
      mode: 'live',
      paymentUrl: payload.code_url,
      qrCodeText: payload.code_url,
      instructions: '请使用微信扫描二维码完成支付，支付结果将通过微信支付回调同步。',
      callbackUrl: notifyUrl,
    },
  }
}

async function createAlipayPrecreateCheckout({ order, title, notifyBaseUrl }) {
  const notifyUrl = `${resolveNotifyBaseUrl(notifyBaseUrl, alipayConfig.notifyBaseUrl)}/api/payments/callback/alipay`
  const bizContent = JSON.stringify({
    out_trade_no: order.id,
    total_amount: (order.amount / 100).toFixed(2),
    subject: title,
    timeout_express: '30m',
  })

  const params = {
    app_id: alipayConfig.appId,
    method: 'alipay.trade.precreate',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: formatAlipayTimestamp(new Date()),
    version: '1.0',
    notify_url: notifyUrl,
    biz_content: bizContent,
  }

  const sign = signAlipayParams(params)
  const form = new URLSearchParams({ ...params, sign })
  const response = await fetchWithTimeout(alipayConfig.gateway, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: form.toString(),
  })

  const payload = await response.json().catch(() => ({}))
  const result = payload.alipay_trade_precreate_response

  if (!response.ok || result?.code !== '10000') {
    throw new Error(result?.sub_msg || result?.msg || 'Failed to create Alipay order.')
  }

  return {
    mode: 'live',
    providerOrderId: order.id,
    checkout: {
      mode: 'live',
      paymentUrl: result.qr_code,
      qrCodeText: result.qr_code,
      instructions: '请使用支付宝扫描二维码完成支付，支付结果将通过支付宝异步通知同步。',
      callbackUrl: notifyUrl,
    },
  }
}

function createMockCheckout(order, method, notifyBaseUrl) {
  return {
    mode: 'mock',
    providerOrderId: `${method.toUpperCase()}_${order.id}`,
    checkout: {
      mode: 'mock',
      paymentUrl: `mockpay://${method}/${order.id}`,
      qrCodeText: `${method.toUpperCase()} | ¥${(order.amount / 100).toFixed(2)} | ${order.id}`,
      instructions: '未配置正式商户参数，当前使用本地支付回退模式。可使用“模拟支付回调”完成测试。',
      callbackUrl: notifyBaseUrl ? `${notifyBaseUrl}/api/payments/callback/${method}` : null,
    },
  }
}

function buildWechatAuthorization(method, path, body) {
  const nonce = randomNonce()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`
  const sign = createSign('RSA-SHA256')
  sign.update(message)
  sign.end()

  const signature = sign.sign(createPrivateKey(wechatConfig.privateKeyPem), 'base64')

  return `WECHATPAY2-SHA256-RSA2048 mchid="${wechatConfig.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${wechatConfig.mchSerialNo}"`
}

function parseWechatCallback({ headers, rawBody }) {
  const serial = headers['wechatpay-serial']
  const signature = headers['wechatpay-signature']
  const timestamp = headers['wechatpay-timestamp']
  const nonce = headers['wechatpay-nonce']

  if (!serial || !signature || !timestamp || !nonce || !rawBody) {
    throw new Error('Missing WeChat Pay callback headers.')
  }

  if (wechatConfig.platformCertSerial && serial !== wechatConfig.platformCertSerial) {
    throw new Error('Unexpected WeChat Pay platform certificate serial.')
  }

  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`)
  verifier.end()

  const publicKey = createPublicKey(wechatConfig.platformPublicKeyPem || wechatConfig.platformCertPem)
  const verified = verifier.verify(publicKey, signature, 'base64')

  if (!verified) {
    throw new Error('WeChat Pay callback signature verification failed.')
  }

  const payload = JSON.parse(rawBody)
  const resource = decryptWechatResource(payload.resource)

  return {
    orderId: resource.out_trade_no,
    providerTradeNo: resource.transaction_id || null,
    amount: resource.amount?.total || null,
    paid: resource.trade_state === 'SUCCESS',
  }
}

function parseAlipayCallback(body) {
  const sign = body?.sign
  const signType = body?.sign_type

  if (!sign || signType !== 'RSA2') {
    throw new Error('Invalid Alipay callback signature metadata.')
  }

  const verify = createVerify('RSA-SHA256')
  verify.update(buildAlipaySignContent(body))
  verify.end()

  const verified = verify.verify(createPublicKey(alipayConfig.publicKeyPem), sign, 'base64')
  if (!verified) {
    throw new Error('Alipay callback signature verification failed.')
  }

  return {
    orderId: body.out_trade_no,
    providerTradeNo: body.trade_no || null,
    amount: body.total_amount ? Math.round(Number(body.total_amount) * 100) : null,
    paid: body.trade_status === 'TRADE_SUCCESS' || body.trade_status === 'TRADE_FINISHED',
  }
}

function decryptWechatResource(resource) {
  if (!resource?.ciphertext || !resource?.nonce) {
    throw new Error('Invalid WeChat Pay callback resource.')
  }

  const ciphertext = Buffer.from(resource.ciphertext, 'base64')
  const nonce = Buffer.from(resource.nonce, 'utf8')
  const associatedData = Buffer.from(resource.associated_data || '', 'utf8')
  const authTag = ciphertext.subarray(ciphertext.length - 16)
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16)

  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(wechatConfig.apiV3Key, 'utf8'), nonce)
  decipher.setAAD(associatedData)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  return JSON.parse(decrypted)
}

function signAlipayParams(params) {
  const sign = createSign('RSA-SHA256')
  sign.update(buildAlipaySignContent(params))
  sign.end()
  return sign.sign(createPrivateKey(alipayConfig.privateKeyPem), 'base64')
}

function buildAlipaySignContent(params) {
  return Object.keys(params)
    .filter((key) => !['sign', 'sign_type'].includes(key) && params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
}

function formatAlipayTimestamp(date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

function resolveNotifyBaseUrl(requestBase, envBase) {
  return envBase || requestBase || 'http://localhost:3001'
}

function normalizePem(value) {
  return value ? value.replace(/\\n/g, '\n').trim() : ''
}

function randomNonce() {
  return randomBytes(16).toString('hex')
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), paymentHttpTimeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Payment gateway request timed out.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}
