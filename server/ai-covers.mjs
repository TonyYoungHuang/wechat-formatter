import 'dotenv/config'
import { createHash, createHmac } from 'node:crypto'

const imageTimeoutMs = clampNumber(process.env.AI_IMAGE_TIMEOUT_MS, 20000, 5000, 60000)
const imageMaxRetries = clampNumber(process.env.AI_IMAGE_MAX_RETRIES, 1, 0, 3)
const preferredProvider = process.env.AI_IMAGE_PROVIDER || 'tencent-hunyuan'

const tencentHunyuanConfig = {
  secretId: process.env.TENCENT_HUNYUAN_SECRET_ID || '',
  secretKey: process.env.TENCENT_HUNYUAN_SECRET_KEY || '',
  sessionToken: process.env.TENCENT_HUNYUAN_SESSION_TOKEN || '',
  endpoint:
    process.env.TENCENT_HUNYUAN_IMAGE_ENDPOINT ||
    process.env.TENCENT_HUNYUAN_IMAGE_API_URL ||
    'https://hunyuan.tencentcloudapi.com',
  action: 'TextToImageLite',
  version: '2023-09-01',
  region: process.env.TENCENT_HUNYUAN_REGION || 'ap-guangzhou',
  style: process.env.TENCENT_HUNYUAN_IMAGE_STYLE || process.env.TENCENT_HUNYUAN_IMAGE_MODEL || '201',
  resolution: normalizeResolution(process.env.TENCENT_HUNYUAN_IMAGE_SIZE || '1024:1024'),
  logoAdd: normalizeToggle(process.env.TENCENT_HUNYUAN_IMAGE_LOGO_ADD || '0'),
}

const jiMengConfig = {
  apiKey:
    process.env.JIMENG_API_KEY ||
    process.env.VOLCENGINE_IMAGE_API_KEY ||
    process.env.LAS_API_KEY ||
    '',
  apiUrl:
    process.env.JIMENG_API_URL ||
    process.env.VOLCENGINE_IMAGE_API_URL ||
    'https://operator.las.cn-beijing.volces.com/api/v1/online/images/generations',
  model:
    process.env.JIMENG_IMAGE_MODEL ||
    process.env.VOLCENGINE_IMAGE_MODEL ||
    'doubao-seedream-3-0-t2i-250415',
  size:
    process.env.JIMENG_IMAGE_SIZE ||
    process.env.VOLCENGINE_IMAGE_SIZE ||
    '2K',
  watermark:
    (process.env.JIMENG_IMAGE_WATERMARK || process.env.VOLCENGINE_IMAGE_WATERMARK || 'true').toLowerCase() === 'true',
}

export async function generateCoverSuggestions({ title, content, platform, accent }) {
  const blueprint = buildCoverBlueprint({ title, content, platform })
  const provider = resolveProvider()

  if (provider.mode === 'demo') {
    return {
      mode: 'demo',
      provider: 'demo',
      covers: [
        {
          id: `demo-${Date.now()}`,
          title: blueprint.title,
          prompt: blueprint.description,
          image: buildFallbackCover({
            title: blueprint.coverTitle,
            subtitle: blueprint.description,
            accent,
            end: blueprint.gradientEnd,
          }),
        },
      ],
    }
  }

  const image = await provider.generate(blueprint.prompt)

  return {
    mode: 'live',
    provider: provider.id,
    covers: [
      {
        id: `live-${Date.now()}`,
        title: blueprint.title,
        prompt: blueprint.description,
        image,
      },
    ],
  }
}

function resolveProvider() {
  const tencentReady = Boolean(
    tencentHunyuanConfig.secretId &&
    tencentHunyuanConfig.secretKey &&
    tencentHunyuanConfig.endpoint,
  )
  const jiMengReady = Boolean(jiMengConfig.apiKey && jiMengConfig.apiUrl)

  if (preferredProvider === 'tencent-hunyuan' && tencentReady) {
    return {
      id: 'tencent-hunyuan',
      mode: 'live',
      generate: requestTencentHunyuanImage,
    }
  }

  if (preferredProvider === 'jimeng' && jiMengReady) {
    return {
      id: 'jimeng',
      mode: 'live',
      generate: requestJiMengImage,
    }
  }

  if (tencentReady) {
    return {
      id: 'tencent-hunyuan',
      mode: 'live',
      generate: requestTencentHunyuanImage,
    }
  }

  if (jiMengReady) {
    return {
      id: 'jimeng',
      mode: 'live',
      generate: requestJiMengImage,
    }
  }

  return {
    id: 'demo',
    mode: 'demo',
  }
}

function buildCoverBlueprint({ title, content, platform }) {
  const cleanTitle = sanitizeText(title || '未命名内容')
  const summary = buildSummary(content)
  const platformLabel = platform === 'wechat' ? '微信公众号封面' : '小红书首图'
  const ratioHint = platform === 'wechat'
    ? '画面比例偏横版，适合公众号头图。'
    : '画面比例偏竖版，适合小红书首图。'

  return {
    title: '推荐封面',
    coverTitle: cleanTitle,
    description: `${platformLabel}，根据正文自动提炼的主视觉方案。`,
    gradientEnd: platform === 'wechat' ? '#1f2937' : '#7c2d12',
    prompt: [
      `请生成一张适合${platformLabel}的高质量封面图。`,
      ratioHint,
      '风格简洁、现代、适合内容创作场景，画面清晰且留白充足。',
      '不要水印，不要品牌 logo，不要大段文字，不要复杂拼贴。',
      `标题主题：${cleanTitle}。`,
      `内容摘要：${summary}。`,
    ].join(' '),
  }
}

function buildSummary(content) {
  const lines = String(content)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)

  return sanitizeText(lines.join('；')).slice(0, 160) || '围绕内容创作、排版、封面与发布流程展开。'
}

function sanitizeText(value) {
  return String(value)
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
}

function buildFallbackCover({ title, subtitle, accent, end }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="${end}"/></linearGradient></defs>
      <rect width="1200" height="720" rx="44" fill="url(#g)"/>
      <rect x="72" y="72" width="1056" height="576" rx="36" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.2)"/>
      <text x="96" y="158" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="30" opacity=".85">AI Cover Demo</text>
      <text x="96" y="320" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="76" font-weight="700">${escapeXml(title.slice(0, 24))}</text>
      <text x="96" y="396" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="34" opacity=".88">${escapeXml(subtitle.slice(0, 26))}</text>
      <rect x="96" y="466" width="288" height="56" rx="28" fill="rgba(255,255,255,.16)"/>
      <text x="132" y="503" fill="white" font-family="'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif" font-size="24">Tencent Hunyuan Demo</text>
    </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function requestTencentHunyuanImage(prompt) {
  const payload = JSON.stringify({
    Prompt: prompt,
    Style: tencentHunyuanConfig.style,
    Resolution: tencentHunyuanConfig.resolution,
    LogoAdd: tencentHunyuanConfig.logoAdd,
    RspImgType: 'url',
  })

  const result = await requestWithRetry(async () => {
    const headers = buildTencentCloudHeaders(payload)
    const response = await fetchWithTimeout(tencentHunyuanConfig.endpoint, {
      method: 'POST',
      headers,
      body: payload,
    })

    const parsed = await response.json().catch(() => ({}))
    const errorMessage =
      parsed?.Response?.Error?.Message ||
      parsed?.Response?.Error?.Code ||
      parsed?.message ||
      'Tencent Hunyuan image generation failed.'

    if (!response.ok || parsed?.Response?.Error) {
      const error = new Error(errorMessage)
      error.retryable = response.status === 429 || response.status >= 500
      throw error
    }

    return parsed
  }, 'Tencent Hunyuan image generation failed.')

  const image = result?.Response?.ResultImage || null
  if (!image) {
    throw new Error('Tencent Hunyuan image payload is missing image url.')
  }

  return image
}

function buildTencentCloudHeaders(payload) {
  const url = new URL(tencentHunyuanConfig.endpoint)
  const host = url.host
  const canonicalUri = url.pathname || '/'
  const timestamp = Math.floor(Date.now() / 1000)
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10)
  const service = 'hunyuan'
  const algorithm = 'TC3-HMAC-SHA256'
  const signedHeaders = 'content-type;host'
  const contentType = 'application/json; charset=utf-8'
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`
  const hashedPayload = sha256Hex(payload)
  const canonicalRequest = ['POST', canonicalUri, '', canonicalHeaders, signedHeaders, hashedPayload].join('\n')
  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = [
    algorithm,
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n')

  const secretDate = hmacSha256(`TC3${tencentHunyuanConfig.secretKey}`, date)
  const secretService = hmacSha256(secretDate, service)
  const secretSigning = hmacSha256(secretService, 'tc3_request')
  const signature = hmacSha256(secretSigning, stringToSign).toString('hex')
  const authorization = `${algorithm} Credential=${tencentHunyuanConfig.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return {
    Authorization: authorization,
    'Content-Type': contentType,
    'X-TC-Action': tencentHunyuanConfig.action,
    'X-TC-Region': tencentHunyuanConfig.region,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': tencentHunyuanConfig.version,
    ...(tencentHunyuanConfig.sessionToken ? { 'X-TC-Token': tencentHunyuanConfig.sessionToken } : {}),
  }
}

async function requestJiMengImage(prompt) {
  const payload = await requestJsonWithRetry({
    url: jiMengConfig.apiUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jiMengConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: jiMengConfig.model,
      prompt,
      size: jiMengConfig.size,
      response_format: 'url',
      watermark: jiMengConfig.watermark,
    }),
    defaultError: 'JiMeng image generation failed.',
  })

  return extractImageUrl(payload, 'JiMeng image payload is missing image url.')
}

function extractImageUrl(payload, errorMessage) {
  const firstItem = payload?.data?.[0] || payload?.output?.[0] || payload?.images?.[0] || payload?.result?.[0] || null
  const image =
    firstItem?.url ||
    firstItem?.image_url ||
    firstItem?.imageUrl ||
    payload?.image_url ||
    payload?.imageUrl ||
    payload?.url ||
    null

  if (!image) {
    throw new Error(errorMessage)
  }

  return image
}

async function requestJsonWithRetry({ url, headers, body, defaultError }) {
  return requestWithRetry(async () => {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body,
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(payload.error?.message || payload.message || defaultError)
      error.retryable = response.status === 429 || response.status >= 500
      throw error
    }

    return payload
  }, defaultError)
}

async function requestWithRetry(executor, defaultError) {
  let attempt = 0

  while (attempt <= imageMaxRetries) {
    try {
      return await executor()
    } catch (error) {
      const retryable = isRetryableError(error)
      if (!retryable || attempt >= imageMaxRetries) {
        if (error instanceof Error) {
          throw error
        }

        throw new Error(defaultError)
      }

      attempt += 1
      await wait(400 * attempt)
    }
  }

  throw new Error(defaultError)
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), imageTimeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error('AI image generation timed out.')
      timeoutError.retryable = true
      throw timeoutError
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function isRetryableError(error) {
  if (!error) {
    return false
  }

  if (error.retryable === true) {
    return true
  }

  return error instanceof Error && error.name === 'TypeError'
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex')
}

function hmacSha256(key, value) {
  return createHmac('sha256', key).update(value).digest()
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function normalizeResolution(value) {
  const normalized = String(value || '').trim().replace(/[xX]/g, ':')
  if (!/^\d{3,4}:\d{3,4}$/.test(normalized)) {
    return '1024:1024'
  }

  return normalized
}

function normalizeToggle(value) {
  return String(value).trim() === '1' ? 1 : 0
}
