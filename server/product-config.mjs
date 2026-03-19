export const templateCatalog = [
  { id: 'mint', tier: 'free', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'slate', tier: 'free', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'sunrise', tier: 'free', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'ocean', tier: 'free', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'paper', tier: 'free', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'sprout', tier: 'free', platforms: ['xiaohongshu'] },
  { id: 'forest-pro', tier: 'vip', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'graphite-pro', tier: 'vip', platforms: ['wechat'] },
  { id: 'amber-note', tier: 'vip', platforms: ['xiaohongshu'] },
  { id: 'studio-pro', tier: 'vip', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'linen-pro', tier: 'vip', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'berry-note', tier: 'vip', platforms: ['xiaohongshu'] },
  { id: 'editorial-pro', tier: 'vip', platforms: ['wechat'] },
  { id: 'jade-editor', tier: 'vip', platforms: ['wechat', 'xiaohongshu'] },
  { id: 'peach-fizz', tier: 'vip', platforms: ['xiaohongshu'] },
  { id: 'carbon-pro', tier: 'vip', platforms: ['wechat'] },
  { id: 'camellia-note', tier: 'vip', platforms: ['xiaohongshu'] },
  { id: 'mono-brief', tier: 'vip', platforms: ['wechat', 'xiaohongshu'] },
]

const exportFormatsByPlan = {
  free: ['html'],
  vip: ['html', 'markdown', 'note-text'],
}

const aiModesByPlan = {
  free: 'live',
  vip: 'live',
}

const aiFormattingCharLimitByPlan = {
  free: 3000,
  vip: 10000,
}

const draftLimitsByPlan = {
  free: 3,
  vip: 50,
}

export function getEntitlements(plan = 'free', draftUsed = 0, user = null) {
  const normalizedPlan = plan === 'vip' ? 'vip' : 'free'
  const accessibleTemplateIds = templateCatalog
    .filter((template) => normalizedPlan === 'vip' || template.tier === 'free')
    .map((template) => template.id)

  return {
    plan: normalizedPlan,
    accessibleTemplateIds,
    features: {
      aiImageMode: aiModesByPlan[normalizedPlan],
      aiImageProvider: 'tencent-hunyuan',
      aiImageQuota: getAiImageQuota(normalizedPlan, user),
      aiFormattingCharLimit: aiFormattingCharLimitByPlan[normalizedPlan],
      draftLimit: draftLimitsByPlan[normalizedPlan],
      draftUsed,
      exportFormats: exportFormatsByPlan[normalizedPlan],
      customPalette: normalizedPlan === 'vip',
    },
  }
}

export function isTemplateAccessible(plan, templateId) {
  const entitlements = getEntitlements(plan)
  return entitlements.accessibleTemplateIds.includes(templateId)
}

export function getDraftLimit(plan) {
  const normalizedPlan = plan === 'vip' ? 'vip' : 'free'
  return draftLimitsByPlan[normalizedPlan]
}

export function getAiImageQuota(plan, user = null) {
  const normalizedPlan = plan === 'vip' ? 'vip' : 'free'

  if (normalizedPlan === 'vip') {
    const used = Math.max(0, Number(user?.aiImageDailyUsed || 0))
    const limit = 3
    return {
      limitType: 'daily',
      limit,
      used,
      remaining: Math.max(0, limit - used),
    }
  }

  const used = Math.max(0, Number(user?.aiImageTotalUsed || 0))
  const limit = 10
  return {
    limitType: 'lifetime',
    limit,
    used,
    remaining: Math.max(0, limit - used),
  }
}

export function isValidTemplateId(templateId) {
  return templateCatalog.some((template) => template.id === templateId)
}

export function isValidPlatform(platform) {
  return platform === 'wechat' || platform === 'xiaohongshu'
}
