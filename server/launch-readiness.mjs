import 'dotenv/config'

const args = new Set(process.argv.slice(2))
const scope = args.has('--scope=pre-icp') ? 'pre-icp' : 'full'
const asJson = args.has('--json')

const checks = [
  {
    name: 'Common production env',
    scopes: ['pre-icp', 'full'],
    required: [
      'NODE_ENV',
      'AUTH_SECRET',
      'ADMIN_API_KEY',
      'DATABASE_PATH',
      'CORS_ORIGINS',
      'PAYMENT_NOTIFY_BASE_URL',
      'SESSION_TTL_DAYS',
      'SESSION_COOKIE_NAME',
    ],
  },
  {
    name: 'WeChat Pay live env',
    scopes: ['full'],
    required: [
      'WECHAT_PAY_APP_ID',
      'WECHAT_PAY_MCH_ID',
      'WECHAT_PAY_MCH_SERIAL_NO',
      'WECHAT_PAY_PRIVATE_KEY_PEM',
      'WECHAT_PAY_API_V3_KEY',
    ],
    oneOf: [['WECHAT_PAY_PLATFORM_CERT_PEM', 'WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM']],
  },
  {
    name: 'Alipay live env',
    scopes: ['full'],
    required: [
      'ALIPAY_APP_ID',
      'ALIPAY_PRIVATE_KEY_PEM',
      'ALIPAY_PUBLIC_KEY_PEM',
    ],
  },
  {
    name: 'Tencent Hunyuan live env',
    scopes: ['pre-icp', 'full'],
    required: [
      'AI_IMAGE_PROVIDER',
      'TENCENT_HUNYUAN_SECRET_ID',
      'TENCENT_HUNYUAN_SECRET_KEY',
      'TENCENT_HUNYUAN_REGION',
      'TENCENT_HUNYUAN_IMAGE_STYLE',
      'TENCENT_HUNYUAN_IMAGE_SIZE',
    ],
  },
  {
    name: 'JiMeng reserved env',
    scopes: ['pre-icp', 'full'],
    required: [],
  },
]

const activeChecks = checks.filter((item) => item.scopes.includes(scope))
const results = activeChecks.map(runCheck)
const blocking = results.filter((item) => !item.ready)
const report = {
  scope,
  updatedAt: new Date().toISOString(),
  blockingGroups: blocking.map((item) => item.name),
  env: {
    NODE_ENV: process.env.NODE_ENV || '',
    ALLOW_MOCK_PAYMENTS: process.env.ALLOW_MOCK_PAYMENTS || '',
    PAYMENT_NOTIFY_BASE_URL: process.env.PAYMENT_NOTIFY_BASE_URL || '',
  },
  results,
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
  if (blocking.length > 0) {
    process.exitCode = 1
  }
  process.exit()
}

console.log(`Launch readiness report (${scope})`)
console.log(`Updated at: ${report.updatedAt}`)
console.log('')

for (const result of results) {
  console.log(`${result.ready ? '[OK]' : '[MISSING]'} ${result.name}`)
  if (result.missing.length > 0) {
    console.log(`  Missing: ${result.missing.join(', ')}`)
  }
  if (result.oneOfMissing.length > 0) {
    for (const group of result.oneOfMissing) {
      console.log(`  Need one of: ${group.join(' | ')}`)
    }
  }
}

console.log('')
console.log(`ALLOW_MOCK_PAYMENTS=${report.env.ALLOW_MOCK_PAYMENTS}`)
console.log(`NODE_ENV=${report.env.NODE_ENV}`)
console.log(`PAYMENT_NOTIFY_BASE_URL=${report.env.PAYMENT_NOTIFY_BASE_URL}`)

if ((process.env.NODE_ENV || '').toLowerCase() === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'false') {
  console.log('Warning: production launch should use ALLOW_MOCK_PAYMENTS=false')
}

if (scope === 'pre-icp') {
  console.log('Scope note: payment merchant env is intentionally excluded before ICP approval.')
}

if (blocking.length > 0) {
  console.log('')
  console.log(`Launch is not ready for scope=${scope}. Blocking groups: ${blocking.map((item) => item.name).join(', ')}`)
  process.exitCode = 1
} else {
  console.log('')
  console.log(`Launch env looks ready for scope=${scope}.`)
}

function runCheck(definition) {
  const missing = definition.required.filter((key) => !hasValue(process.env[key]))
  const oneOfMissing = (definition.oneOf || []).filter((group) => !group.some((key) => hasValue(process.env[key])))

  return {
    name: definition.name,
    ready: missing.length === 0 && oneOfMissing.length === 0,
    missing,
    oneOfMissing,
  }
}

function hasValue(value) {
  return typeof value === 'string' && value.trim() !== ''
}
