const preferredProvider = normalizeTitleProvider(process.env.AI_TITLE_PROVIDER || 'reserved')

export async function generateTitleSuggestions({ title = '', content = '', platform = 'wechat' } = {}) {
  const cleanTitle = String(title || '').trim()
  const cleanContent = String(content || '').replace(/\r\n?/g, '\n').trim()
  const titleBase = cleanTitle || deriveFocus(cleanContent) || (platform === 'wechat' ? '公众号排版' : '小红书笔记')
  const focus = deriveFocus(cleanContent) || titleBase
  const audience = platform === 'wechat' ? '公众号读者' : '小红书用户'
  const verbs = platform === 'wechat'
    ? ['讲透', '拆开看', '说清楚', '一次讲明白', '完整复盘']
    : ['讲透', '避坑', '做成模板', '直接套用', '高效搞定']

  const suggestions = [
    {
      id: 'hook-story',
      title: platform === 'wechat'
        ? `我为什么建议你现在就把「${titleBase}」这件事做对`
        : `把「${titleBase}」做对之后，我的内容效率真的上来了`,
      reason: `偏故事切入，适合先用真实场景把 ${audience} 带进来。`,
    },
    {
      id: 'problem-solution',
      title: platform === 'wechat'
        ? `还在为「${titleBase}」头疼？这篇把原因和方法一次讲明白`
        : `「${titleBase}」总是做不好？这篇直接给你方法和顺序`,
      reason: '偏问题解决型，适合知识型和教程型内容。',
    },
    {
      id: 'checklist',
      title: platform === 'wechat'
        ? `关于「${focus}」，最容易忽略的 3 个关键动作`
        : `做「${focus}」之前，先把这 3 个重点存下来`,
      reason: '偏清单结构，适合带步骤、要点和经验总结的正文。',
    },
    {
      id: 'authority',
      title: platform === 'wechat'
        ? `从经验到结果：${verbs[0]}「${focus}」背后的真正逻辑`
        : `把「${focus}」${verbs[3]}，这套思路比你想的更好用`,
      reason: '偏专业权威感，适合需要提升信任感和收藏率的内容。',
    },
    {
      id: 'conversion',
      title: platform === 'wechat'
        ? `为什么说「${focus}」决定了内容的打开率和转化`
        : `原来「${focus}」会直接影响点击和停留，难怪以前总没效果`,
      reason: '偏结果导向，适合运营、商业和转化相关主题。',
    },
  ]

  return {
    mode: preferredProvider === 'reserved' ? 'demo' : 'live',
    provider: preferredProvider,
    suggestions,
  }
}

function deriveFocus(content) {
  const firstLine = content
    .split('\n')
    .map((item) => item.trim())
    .find(Boolean)

  if (!firstLine) {
    return ''
  }

  return firstLine
    .replace(/^#+\s*/, '')
    .replace(/[。！？!?：:；;，,].*$/, '')
    .slice(0, 18)
    .trim()
}

function normalizeTitleProvider(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'openai' || normalized === 'tencent-hunyuan') {
    return normalized
  }
  return 'reserved'
}
