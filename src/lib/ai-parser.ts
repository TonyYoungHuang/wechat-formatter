export interface ArticleStructure {
  title: string
  sections: Array<{
    heading: string
    content: string
    imageUrl?: string
  }>
  summary: string
}

export interface AIConfig {
  apiKey: string
  apiEndpoint: string
  model?: string
}

function fallbackStructure(content: string): ArticleStructure {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean)
  const title = lines[0] || '未命名文章'
  const sections = lines.slice(1, 6).map((line, index) => ({
    heading: `段落 ${index + 1}`,
    content: line,
  }))

  return {
    title,
    sections,
    summary: lines.slice(0, 3).join('。'),
  }
}

export async function analyzeArticleStructure(content: string, config: AIConfig): Promise<ArticleStructure> {
  const prompt = `请分析以下文章，返回 JSON：
{
  "title":"文章标题",
  "sections":[{"heading":"小节标题","content":"小节摘要"}],
  "summary":"文章总结"
}

文章内容：
${content.slice(0, 3000)}`

  try {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
      }),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content || ''
    const jsonText = rawText.match(/\{[\s\S]*\}/)?.[0]
    if (!jsonText) {
      throw new Error('模型未返回 JSON')
    }
    return JSON.parse(jsonText) as ArticleStructure
  } catch (error) {
    console.error('AI 结构分析失败，已回退本地解析:', error)
    return fallbackStructure(content)
  }
}

export function getFormattingSuggestions(content: string): string[] {
  const suggestions: string[] = []

  if (!/^#\s+/.test(content.trim())) {
    suggestions.push('建议添加主标题，例如：# 文章标题')
  }

  const paragraphs = content.split('\n\n').filter(Boolean)
  if (paragraphs.some((paragraph) => paragraph.length > 450)) {
    suggestions.push('存在较长段落，建议拆分为 2-3 段，提升可读性')
  }

  if (!/[-*]\s+/.test(content) && !/\d+\.\s+/.test(content)) {
    suggestions.push('可增加列表结构，帮助读者快速提取重点')
  }

  return suggestions
}
