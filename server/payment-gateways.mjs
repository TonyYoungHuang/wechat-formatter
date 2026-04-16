import { createDecipheriv, createPrivateKey, createPublicKey, createSign, createVerify, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { AlipaySdk } from 'alipay-sdk'
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
  privateKeyPem: resolveTextInput(process.env.ALIPAY_PRIVATE_KEY_PEM || '', process.env.ALIPAY_PRIVATE_KEY_PATH || ''),
  publicKeyPem: resolveTextInput(process.env.ALIPAY_PUBLIC_KEY_PEM || '', process.env.ALIPAY_PUBLIC_KEY_PATH || ''),
  keyType: normalizeAlipayKeyType(process.env.ALIPAY_KEY_TYPE || 'PKCS8'),
  sellerId: process.env.ALIPAY_SELLER_ID || '',
  appCertContent: resolveTextInput(process.env.ALIPAY_APP_CERT_PEM || '', process.env.ALIPAY_APP_CERT_PATH || ''),
  alipayPublicCertContent: resolveTextInput(process.env.ALIPAY_PUBLIC_CERT_PEM || '', process.env.ALIPAY_PUBLIC_CERT_PATH || ''),
  alipayRootCertContent: resolveTextInput(process.env.ALIPAY_ROOT_CERT_PEM || '', process.env.ALIPAY_ROOT_CERT_PATH || ''),
  notifyBaseUrl: process.env.ALIPAY_NOTIFY_BASE_URL || process.env.PAYMENT_NOTIFY_BASE_URL || '',
  returnBaseUrl: process.env.ALIPAY_RETURN_BASE_URL || process.env.PAYMENT_RETURN_BASE_URL || '',
  gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
}

let alipayClient = null

export async function createProviderCheckout({
  order,
  title,
  method,
  notifyBaseUrl,
  returnBaseUrl,
  clientIp,
  userAgent,
  allowMockFallback = true,
}) {
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
    return createAlipayWebsiteCheckout({ order, title, notifyBaseUrl, returnBaseUrl, userAgent })
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
  return Boolean(alipayConfig.appId && alipayConfig.privateKeyPem && (alipayConfig.publicKeyPem || hasAlipayCertMode()))
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
      instructions: '\u8bf7\u4f7f\u7528\u5fae\u4fe1\u626b\u7801\u5b8c\u6210\u652f\u4ed8\uff0c\u652f\u4ed8\u7ed3\u679c\u4f1a\u901a\u8fc7\u5fae\u4fe1\u652f\u4ed8\u56de\u8c03\u81ea\u52a8\u540c\u6b65\u3002',
      callbackUrl: notifyUrl,
    },
  }
}

function createAlipayWebsiteCheckout({ order, title, notifyBaseUrl, returnBaseUrl, userAgent }) {
  const client = getAlipayClient()
  const notifyUrl = `${resolveNotifyBaseUrl(notifyBaseUrl, alipayConfig.notifyBaseUrl)}/api/payments/callback/alipay`
  const returnUrl = buildAlipayReturnUrl(returnBaseUrl, order.id)
  const mobileFlow = isLikelyMobileUserAgent(userAgent)
  const paymentUrl = client.pageExecute(mobileFlow ? 'alipay.trade.wap.pay' : 'alipay.trade.page.pay', 'GET', {
    notifyUrl,
    returnUrl,
    ...(mobileFlow ? { quitUrl: returnUrl } : {}),
    bizContent: {
      outTradeNo: order.id,
      totalAmount: (order.amount / 100).toFixed(2),
      subject: title,
      productCode: mobileFlow ? 'QUICK_WAP_WAY' : 'FAST_INSTANT_TRADE_PAY',
    },
  })

  const instructions = mobileFlow
    ? '\u8bf7\u70b9\u51fb\u6253\u5f00\u652f\u4ed8\u5b9d\u5b8c\u6210\u652f\u4ed8\uff0c\u652f\u4ed8\u6210\u529f\u540e\u4f1a\u901a\u8fc7\u652f\u4ed8\u5b9d\u56de\u8c03\u81ea\u52a8\u540c\u6b65\u3002'
    : '\u8bf7\u6253\u5f00\u652f\u4ed8\u5b9d\u6536\u94f6\u53f0\u5b8c\u6210\u652f\u4ed8\uff0c\u4e5f\u53ef\u5728\u5176\u4ed6\u8bbe\u5907\u4e0a\u626b\u7801\u652f\u4ed8\uff0c\u6210\u529f\u540e\u4f1a\u81ea\u52a8\u540c\u6b65\u4f1a\u5458\u72b6\u6001\u3002'

  return {
    mode: 'live',
    providerOrderId: order.id,
    checkout: {
      mode: 'live',
      paymentUrl,
      qrCodeText: paymentUrl,
      instructions,
      callbackUrl: notifyUrl,
    },
  }
}

function getAlipayClient() {
  if (alipayClient) {
    return alipayClient
  }

  if (!canUseAlipay()) {
    throw new Error('Alipay is not configured for live checkout.')
  }

  const config = {
    appId: alipayConfig.appId,
    privateKey: alipayConfig.privateKeyPem,
    keyType: alipayConfig.keyType,
    gateway: alipayConfig.gateway,
  }

  if (hasAlipayCertMode()) {
    config.appCertContent = alipayConfig.appCertContent
    config.alipayPublicCertContent = alipayConfig.alipayPublicCertContent
    config.alipayRootCertContent = alipayConfig.alipayRootCertContent
  } else {
    config.alipayPublicKey = alipayConfig.publicKeyPem
  }

  alipayClient = new AlipaySdk(config)
  return alipayClient
}

function hasAlipayCertMode() {
  return Boolean(
    alipayConfig.appCertContent &&
    alipayConfig.alipayPublicCertContent &&
    alipayConfig.alipayRootCertContent,
  )
}

function buildAlipayReturnUrl(returnBaseUrl, orderId) {
  const baseUrl = resolveReturnBaseUrl(returnBaseUrl, alipayConfig.returnBaseUrl)
  const url = new URL(baseUrl)
  url.searchParams.set('payment', 'alipay')
  url.searchParams.set('orderId', orderId)
  return url.toString()
}

function createMockCheckout(order, method, notifyBaseUrl) {
  return {
    mode: 'mock',
    providerOrderId: `${method.toUpperCase()}_${order.id}`,
    checkout: {
      mode: 'mock',
      paymentUrl: `mockpay://${method}/${order.id}`,
      qrCodeText: `${method.toUpperCase()} | CNY ${(order.amount / 100).toFixed(2)} | ${order.id}`,
      instructions: '\u6b63\u5f0f\u5546\u6237\u53c2\u6570\u8fd8\u672a\u914d\u7f6e\u5b8c\u6210\uff0c\u5f53\u524d\u5df2\u56de\u9000\u5230\u672c\u5730\u6a21\u62df\u652f\u4ed8\u6d41\u7a0b\uff0c\u53ef\u4ee5\u7ee7\u7eed\u4f7f\u7528\u201c\u6a21\u62df\u652f\u4ed8\u56de\u8c03\u201d\u8fdb\u884c\u6d4b\u8bd5\u3002',
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
  const client = getAlipayClient()
  const verified = client.checkNotifySignV2(body)

  if (!verified) {
    throw new Error('Alipay callback signature verification failed.')
  }

  if (body?.app_id && body.app_id !== alipayConfig.appId) {
    throw new Error('Unexpected Alipay app id in callback.')
  }

  if (alipayConfig.sellerId && body?.seller_id && body.seller_id !== alipayConfig.sellerId) {
    throw new Error('Unexpected Alipay seller id in callback.')
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

function resolveNotifyBaseUrl(requestBase, envBase) {
  return envBase || requestBase || 'http://localhost:3001'
}

function resolveReturnBaseUrl(requestBase, envBase) {
  return envBase || requestBase || 'http://localhost:5173'
}

function normalizePem(value) {
  return value ? value.replace(/\\n/g, '\n').trim() : ''
}

function resolveTextInput(rawValue, pathValue) {
  if (rawValue) {
    return normalizePem(rawValue)
  }

  if (!pathValue) {
    return ''
  }

  return readFileSync(pathValue, 'utf8').trim()
}

function normalizeAlipayKeyType(value) {
  return String(value).toUpperCase() === 'PKCS1' ? 'PKCS1' : 'PKCS8'
}

function isLikelyMobileUserAgent(userAgent) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent || '')
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
