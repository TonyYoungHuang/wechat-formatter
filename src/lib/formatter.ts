type BlockType =
  | 'title'
  | 'mainTitle'
  | 'subtitle'
  | 'sectionTitle'
  | 'paragraph'
  | 'quote'
  | 'listItem'
  | 'orderedItem'
  | 'divider'
  | 'codeBlock'

export type PlatformName = 'wechat' | 'xiaohongshu'

type Block = {
  type: BlockType
  content: string
}

type TemplateStyle = {
  article: string
  title: string
  mainTitle: string
  subtitle: string
  sectionTitle: string
  paragraph: string
  quote: string
  list: string
  orderedList: string
  divider: string
  codeBlock: string
  codeInline: string
  strong: string
  underline: string
  highlight: string
  tagChip: string
  notePanel: string
  noteLabel: string
  colorMap: Record<string, string>
}

type TemplateSeed = {
  surface: string
  title: string
  accent: string
  accentSoft: string
  subtitle: string
  body: string
  quoteBg: string
  quoteBorder: string
  divider: string
  inlineCodeBg: string
  inlineCodeBorder: string
  inlineCodeColor: string
  strong: string
  underline: string
  highlight: string
  tagBg: string
  tagColor: string
  colorMap: Record<string, string>
}

const SENTENCE_PUNCTUATION = /[，。！？；：,.!?;:]/
const KEYWORDS = ['核心', '关键', '结论', '建议', '方法', '步骤', '总结', '重点']
const TAG_STOP_WORDS = /^(如果|因为|所以|然后|但是|这个|那个|我们|你们|他们|今天|一个|可以|已经|还是|进行|需要)$/

const templates: Record<string, TemplateStyle> = {
  mint: createTemplateStyle({
    surface: '#f7f8f9',
    title: '#122322',
    accent: '#1e5e52',
    accentSoft: '#ebf5f3',
    subtitle: '#328272',
    body: '#2b3135',
    quoteBg: '#ebf5f3',
    quoteBorder: '#56a597',
    divider: '#d8e3e0',
    inlineCodeBg: '#e5f3f1',
    inlineCodeBorder: '#cbe6e1',
    inlineCodeColor: '#0f766e',
    strong: '#155e55',
    underline: '#67b8aa',
    highlight: '#fff3cd',
    tagBg: '#e6f3ef',
    tagColor: '#195d52',
    colorMap: {
      green: '#1f7a69',
      blue: '#2f6bff',
      orange: '#bf6f1d',
      red: '#b43c2f',
      purple: '#7648c5',
    },
  }),
  slate: createTemplateStyle({
    surface: '#f7f8fa',
    title: '#1e293b',
    accent: '#334155',
    accentSoft: '#eef2f6',
    subtitle: '#485c74',
    body: '#27313f',
    quoteBg: '#eef2f6',
    quoteBorder: '#7a8ca7',
    divider: '#dde3ea',
    inlineCodeBg: '#eaf0ff',
    inlineCodeBorder: '#d7e2ff',
    inlineCodeColor: '#1e40af',
    strong: '#1e293b',
    underline: '#94a3b8',
    highlight: '#fef3c7',
    tagBg: '#edf2f7',
    tagColor: '#334155',
    colorMap: {
      green: '#0f766e',
      blue: '#1d4ed8',
      orange: '#b45309',
      red: '#b91c1c',
      purple: '#6d28d9',
    },
  }),
  sunrise: createTemplateStyle({
    surface: '#fbf8f3',
    title: '#40210f',
    accent: '#8a4e1d',
    accentSoft: '#fff2df',
    subtitle: '#b0682b',
    body: '#3f2f23',
    quoteBg: '#fff2df',
    quoteBorder: '#d6a16b',
    divider: '#edd9c4',
    inlineCodeBg: '#fff1e6',
    inlineCodeBorder: '#ffe0cc',
    inlineCodeColor: '#9a3412',
    strong: '#8a4e1d',
    underline: '#d6a16b',
    highlight: '#ffe7bf',
    tagBg: '#fff1e1',
    tagColor: '#9a5d1f',
    colorMap: {
      green: '#047857',
      blue: '#1d4ed8',
      orange: '#b45309',
      red: '#b91c1c',
      purple: '#7c3aed',
    },
  }),
  ocean: createTemplateStyle({
    surface: '#f4f8fb',
    title: '#163249',
    accent: '#0f5e78',
    accentSoft: '#e6f4fa',
    subtitle: '#2d86a7',
    body: '#253845',
    quoteBg: '#e6f4fa',
    quoteBorder: '#67adc8',
    divider: '#d6e8f1',
    inlineCodeBg: '#e6f7fb',
    inlineCodeBorder: '#cdebf4',
    inlineCodeColor: '#0e7490',
    strong: '#0f5e78',
    underline: '#67adc8',
    highlight: '#fff3cd',
    tagBg: '#e8f5fb',
    tagColor: '#136783',
    colorMap: {
      green: '#0f766e',
      blue: '#1d4ed8',
      orange: '#c2410c',
      red: '#b91c1c',
      purple: '#6d28d9',
    },
  }),
  paper: createTemplateStyle({
    surface: '#fcfbf8',
    title: '#2a241c',
    accent: '#705c3a',
    accentSoft: '#f5efe4',
    subtitle: '#8b7248',
    body: '#3a3025',
    quoteBg: '#f5efe4',
    quoteBorder: '#b59a6a',
    divider: '#e9dfcf',
    inlineCodeBg: '#f8f1e8',
    inlineCodeBorder: '#ebdfcf',
    inlineCodeColor: '#8b5e34',
    strong: '#705c3a',
    underline: '#c5aa73',
    highlight: '#fff1bf',
    tagBg: '#f6efe5',
    tagColor: '#705c3a',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  sprout: createTemplateStyle({
    surface: '#f6fcf7',
    title: '#203128',
    accent: '#3f925f',
    accentSoft: '#eaf8ef',
    subtitle: '#5aa873',
    body: '#314137',
    quoteBg: '#eaf8ef',
    quoteBorder: '#86c998',
    divider: '#d8ebdc',
    inlineCodeBg: '#edf8f0',
    inlineCodeBorder: '#d6ebdc',
    inlineCodeColor: '#2f855a',
    strong: '#2f855a',
    underline: '#86c998',
    highlight: '#fef3c7',
    tagBg: '#eaf8ef',
    tagColor: '#2f855a',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'forest-pro': createTemplateStyle({
    surface: '#f5f8f2',
    title: '#1f2f20',
    accent: '#3f6f4b',
    accentSoft: '#edf5ef',
    subtitle: '#5d8a62',
    body: '#28332a',
    quoteBg: '#edf5ef',
    quoteBorder: '#5d8a62',
    divider: '#d8e4d7',
    inlineCodeBg: '#eef5ef',
    inlineCodeBorder: '#d7e7d9',
    inlineCodeColor: '#1f6a43',
    strong: '#2e6a3e',
    underline: '#6fa57c',
    highlight: '#eef8bf',
    tagBg: '#e7f0e5',
    tagColor: '#3f6f4b',
    colorMap: {
      green: '#2e7d4f',
      blue: '#325fc9',
      orange: '#b96d1e',
      red: '#b53b40',
      purple: '#6f56b9',
    },
  }),
  'graphite-pro': createTemplateStyle({
    surface: '#f5f6f8',
    title: '#111827',
    accent: '#202939',
    accentSoft: '#eef1f5',
    subtitle: '#4b5563',
    body: '#1f2937',
    quoteBg: '#eef1f5',
    quoteBorder: '#5b6473',
    divider: '#d8dde6',
    inlineCodeBg: '#f3f4f6',
    inlineCodeBorder: '#e5e7eb',
    inlineCodeColor: '#1f2937',
    strong: '#111827',
    underline: '#6b7280',
    highlight: '#fde68a',
    tagBg: '#eef2f7',
    tagColor: '#273244',
    colorMap: {
      green: '#116466',
      blue: '#2949d1',
      orange: '#b45309',
      red: '#be123c',
      purple: '#6d28d9',
    },
  }),
  'amber-note': createTemplateStyle({
    surface: '#fff7f2',
    title: '#5b3121',
    accent: '#d16b4b',
    accentSoft: '#fff0e6',
    subtitle: '#de876d',
    body: '#4b342b',
    quoteBg: '#fff0e6',
    quoteBorder: '#f0a085',
    divider: '#f4d8cc',
    inlineCodeBg: '#fff2ea',
    inlineCodeBorder: '#ffd9cb',
    inlineCodeColor: '#c65c3a',
    strong: '#c65c3a',
    underline: '#ee9d7e',
    highlight: '#fff1a8',
    tagBg: '#fff0e8',
    tagColor: '#c65c3a',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'studio-pro': createTemplateStyle({
    surface: '#f8f7ff',
    title: '#1f1b3a',
    accent: '#5b53d6',
    accentSoft: '#eeedff',
    subtitle: '#7168e7',
    body: '#2a2e43',
    quoteBg: '#efeeff',
    quoteBorder: '#847bf1',
    divider: '#ddd9ff',
    inlineCodeBg: '#f1efff',
    inlineCodeBorder: '#ddd9ff',
    inlineCodeColor: '#5548d9',
    strong: '#4f46e5',
    underline: '#847bf1',
    highlight: '#fef3c7',
    tagBg: '#efeeff',
    tagColor: '#5548d9',
    colorMap: {
      green: '#0f766e',
      blue: '#1d4ed8',
      orange: '#c2410c',
      red: '#be123c',
      purple: '#6d28d9',
    },
  }),
  'linen-pro': createTemplateStyle({
    surface: '#faf7f1',
    title: '#3f3527',
    accent: '#8a6a3f',
    accentSoft: '#f5ede0',
    subtitle: '#9f7a4a',
    body: '#43382c',
    quoteBg: '#f5ede0',
    quoteBorder: '#c4a678',
    divider: '#eadfce',
    inlineCodeBg: '#f8efe5',
    inlineCodeBorder: '#eadfce',
    inlineCodeColor: '#9a5d1f',
    strong: '#8a6a3f',
    underline: '#c4a678',
    highlight: '#fff0bf',
    tagBg: '#f5ede0',
    tagColor: '#8a6a3f',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'berry-note': createTemplateStyle({
    surface: '#fff7fa',
    title: '#5a2440',
    accent: '#c13b71',
    accentSoft: '#ffe9f1',
    subtitle: '#d15888',
    body: '#4e3141',
    quoteBg: '#ffe9f1',
    quoteBorder: '#eb85ad',
    divider: '#f6d4e1',
    inlineCodeBg: '#fff0f6',
    inlineCodeBorder: '#ffd8e7',
    inlineCodeColor: '#c13b71',
    strong: '#b83267',
    underline: '#eb85ad',
    highlight: '#fff0bf',
    tagBg: '#ffe9f1',
    tagColor: '#b83267',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'editorial-pro': createTemplateStyle({
    surface: '#fbfbfb',
    title: '#101828',
    accent: '#1f2937',
    accentSoft: '#f1f5f9',
    subtitle: '#475467',
    body: '#344054',
    quoteBg: '#f8fafc',
    quoteBorder: '#98a2b3',
    divider: '#e4e7ec',
    inlineCodeBg: '#f8fafc',
    inlineCodeBorder: '#eaecf0',
    inlineCodeColor: '#111827',
    strong: '#111827',
    underline: '#98a2b3',
    highlight: '#fef3c7',
    tagBg: '#f2f4f7',
    tagColor: '#344054',
    colorMap: {
      green: '#0f766e',
      blue: '#1d4ed8',
      orange: '#c2410c',
      red: '#be123c',
      purple: '#6d28d9',
    },
  }),
  'jade-editor': createTemplateStyle({
    surface: '#f4fbf9',
    title: '#10342f',
    accent: '#17806d',
    accentSoft: '#e6f6f1',
    subtitle: '#239c85',
    body: '#23413c',
    quoteBg: '#e6f6f1',
    quoteBorder: '#56b9a4',
    divider: '#cfeae2',
    inlineCodeBg: '#eaf8f4',
    inlineCodeBorder: '#d5eee7',
    inlineCodeColor: '#0f766e',
    strong: '#0f766e',
    underline: '#56b9a4',
    highlight: '#fff3cd',
    tagBg: '#e6f6f1',
    tagColor: '#0f766e',
    colorMap: {
      green: '#17806d',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'peach-fizz': createTemplateStyle({
    surface: '#fff8f5',
    title: '#5f2d25',
    accent: '#eb7a5c',
    accentSoft: '#fff0ea',
    subtitle: '#f08f74',
    body: '#523932',
    quoteBg: '#fff0ea',
    quoteBorder: '#f7b099',
    divider: '#f5ddd4',
    inlineCodeBg: '#fff2ec',
    inlineCodeBorder: '#ffdfd3',
    inlineCodeColor: '#dd6b4d',
    strong: '#dd6b4d',
    underline: '#f7b099',
    highlight: '#fff0bf',
    tagBg: '#fff0ea',
    tagColor: '#dd6b4d',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'carbon-pro': createTemplateStyle({
    surface: '#f5f7fa',
    title: '#0f172a',
    accent: '#111827',
    accentSoft: '#e5e7eb',
    subtitle: '#374151',
    body: '#1f2937',
    quoteBg: '#edf2f7',
    quoteBorder: '#6b7280',
    divider: '#d1d5db',
    inlineCodeBg: '#f3f4f6',
    inlineCodeBorder: '#e5e7eb',
    inlineCodeColor: '#111827',
    strong: '#111827',
    underline: '#9ca3af',
    highlight: '#fde68a',
    tagBg: '#eef2f7',
    tagColor: '#1f2937',
    colorMap: {
      green: '#116466',
      blue: '#2949d1',
      orange: '#b45309',
      red: '#be123c',
      purple: '#6d28d9',
    },
  }),
  'camellia-note': createTemplateStyle({
    surface: '#fff8fb',
    title: '#61203f',
    accent: '#cf4b7b',
    accentSoft: '#ffe8f1',
    subtitle: '#de6a93',
    body: '#553446',
    quoteBg: '#ffe8f1',
    quoteBorder: '#f097b8',
    divider: '#f4d7e3',
    inlineCodeBg: '#fff0f5',
    inlineCodeBorder: '#ffd8e6',
    inlineCodeColor: '#cf4b7b',
    strong: '#bf3f70',
    underline: '#f097b8',
    highlight: '#fff0bf',
    tagBg: '#ffe8f1',
    tagColor: '#bf3f70',
    colorMap: {
      green: '#2f855a',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
  'mono-brief': createTemplateStyle({
    surface: '#f7f7f7',
    title: '#171717',
    accent: '#404040',
    accentSoft: '#ededed',
    subtitle: '#525252',
    body: '#2f2f2f',
    quoteBg: '#ededed',
    quoteBorder: '#a3a3a3',
    divider: '#d4d4d4',
    inlineCodeBg: '#f1f1f1',
    inlineCodeBorder: '#dddddd',
    inlineCodeColor: '#262626',
    strong: '#171717',
    underline: '#a3a3a3',
    highlight: '#fef08a',
    tagBg: '#ededed',
    tagColor: '#262626',
    colorMap: {
      green: '#15803d',
      blue: '#2563eb',
      orange: '#d97706',
      red: '#dc2626',
      purple: '#7c3aed',
    },
  }),
}

export function enhanceContentWithAI(input: string): string {
  const normalized = normalizeInput(input)
  if (!normalized) return ''

  const lines = normalized.split('\n')
  const output: string[] = []
  let titleInjected = false
  let orderedIndex = 1

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      output.push('')
      continue
    }

    if (/^#{1,4}\s/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^>\s+/.test(line)) {
      output.push(line)
      if (/^#{1,4}\s/.test(line)) orderedIndex = 1
      continue
    }

    if (!titleInjected && !SENTENCE_PUNCTUATION.test(line) && line.length <= 32) {
      output.push(`# ${line}`)
      titleInjected = true
      continue
    }

    titleInjected = true

    if (/^[-*_]{3,}$/.test(line)) {
      output.push('---')
      continue
    }

    if (/^>\s*/.test(line)) {
      output.push(`> ${line.replace(/^>\s*/, '')}`)
      continue
    }

    if (/^\d+[.)、]\s*/.test(line)) {
      output.push(`${orderedIndex}. ${enhanceInline(line.replace(/^\d+[.)、]\s*/, '').trim())}`)
      orderedIndex += 1
      continue
    }

    if (/^[-*•]\s*/.test(line)) {
      output.push(`- ${enhanceInline(line.replace(/^[-*•]\s*/, '').trim())}`)
      continue
    }

    if (!SENTENCE_PUNCTUATION.test(line) && line.length <= 18) {
      output.push(`### ${line}`)
      orderedIndex = 1
      continue
    }

    output.push(enhanceInline(line))
    orderedIndex = 1
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function formatArticle(content: string, template = 'mint', platform: PlatformName = 'wechat'): string {
  const normalized = normalizeInput(content)
  if (!normalized) return ''

  const style = templates[template] || templates.mint
  const blocks = parseContent(normalized)
  const html = blockToHTML(blocks, style)
  const noteExtras = platform === 'xiaohongshu'
    ? `${renderXiaohongshuPanel(style)}${renderTags(extractTags(normalized), style)}`
    : ''
  const articleStyle = platform === 'xiaohongshu'
    ? `${style.article}padding:18px 16px 20px;border-radius:22px;box-shadow:0 10px 24px rgba(15,23,42,0.06);`
    : style.article

  return `<article style="${articleStyle}">${html}${noteExtras}</article>`
}

function createTemplateStyle(seed: TemplateSeed): TemplateStyle {
  return {
    article: `max-width:100%;padding:12px 14px;background:${seed.surface};border-radius:14px;`,
    title: `font-size:30px;line-height:1.4;font-weight:800;color:${seed.title};margin:8px 0 22px;`,
    mainTitle: `font-size:24px;line-height:1.45;font-weight:700;color:${seed.accent};margin:26px 0 14px;`,
    subtitle: `font-size:20px;line-height:1.45;font-weight:700;color:${seed.subtitle};margin:20px 0 12px;`,
    sectionTitle: `font-size:17px;line-height:1.45;font-weight:700;color:${seed.subtitle};margin:16px 0 10px;`,
    paragraph: `font-size:16px;line-height:1.95;color:${seed.body};margin:12px 0;`,
    quote: `font-size:15px;line-height:1.9;color:${seed.body};margin:14px 0;padding:12px 14px;background:${seed.quoteBg};border-left:3px solid ${seed.quoteBorder};border-radius:8px;`,
    list: `font-size:16px;line-height:1.95;color:${seed.body};margin:6px 0;`,
    orderedList: `font-size:16px;line-height:1.95;color:${seed.body};margin:6px 0;`,
    divider: `border:none;height:1px;background:${seed.divider};margin:18px 0;`,
    codeBlock: `font-size:13px;line-height:1.7;color:${seed.body};background:#ffffff;border:1px solid ${seed.divider};padding:12px;border-radius:10px;overflow:auto;margin:14px 0;`,
    codeInline: `font-size:13px;color:${seed.inlineCodeColor};background:${seed.inlineCodeBg};border:1px solid ${seed.inlineCodeBorder};padding:1px 6px;border-radius:6px;font-family:Consolas,Monaco,monospace;`,
    strong: `font-weight:700;color:${seed.strong};`,
    underline: `text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:${seed.underline};`,
    highlight: `background:${seed.highlight};color:#374151;padding:0 3px;border-radius:4px;`,
    tagChip: `display:inline-block;margin:0 8px 8px 0;padding:6px 12px;border-radius:999px;background:${seed.tagBg};color:${seed.tagColor};font-size:13px;line-height:1.2;font-weight:600;`,
    notePanel: `margin-top:18px;padding:14px 14px 10px;border-radius:16px;background:${seed.accentSoft};`,
    noteLabel: `display:inline-block;margin-bottom:8px;padding:4px 10px;border-radius:999px;background:${seed.tagBg};color:${seed.tagColor};font-size:12px;font-weight:700;`,
    colorMap: seed.colorMap,
  }
}

function normalizeInput(input: string) {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function enhanceInline(line: string) {
  let text = line

  if (
    /\*\*[^*]+\*\*/.test(text) ||
    /__[^_]+__/.test(text) ||
    /==[^=]+==/.test(text) ||
    /\{(green|blue|orange|red|purple)\|[^}]+\}/.test(text)
  ) {
    return text
  }

  for (const keyword of KEYWORDS) {
    const pattern = new RegExp(`(${keyword}[：:])`, 'g')
    text = text.replace(pattern, '**$1**')
  }

  return text.replace(/(非常|尤其|一定|务必|必须)([^，。！？；：,.!?;:]{2,14})/g, '{green|$1$2}')
}

function parseContent(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('```')) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'codeBlock', content: codeLines.join('\n') })
      continue
    }

    if (/^####\s+/.test(line)) {
      blocks.push({ type: 'sectionTitle', content: line.replace(/^####\s+/, '') })
      continue
    }
    if (/^###\s+/.test(line)) {
      blocks.push({ type: 'subtitle', content: line.replace(/^###\s+/, '') })
      continue
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ type: 'mainTitle', content: line.replace(/^##\s+/, '') })
      continue
    }
    if (/^#\s+/.test(line)) {
      blocks.push({ type: 'title', content: line.replace(/^#\s+/, '') })
      continue
    }
    if (/^>\s+/.test(line)) {
      blocks.push({ type: 'quote', content: line.replace(/^>\s+/, '') })
      continue
    }
    if (/^[-*_]{3,}$/.test(line)) {
      blocks.push({ type: 'divider', content: '' })
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      blocks.push({ type: 'orderedItem', content: line.replace(/^\d+\.\s+/, '') })
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      blocks.push({ type: 'listItem', content: line.replace(/^[-*]\s+/, '') })
      continue
    }

    blocks.push({ type: 'paragraph', content: line })
  }

  return blocks
}

function blockToHTML(blocks: Block[], style: TemplateStyle) {
  const parts: string[] = []
  let index = 0

  while (index < blocks.length) {
    const block = blocks[index]

    if (block.type === 'listItem') {
      const items: string[] = []
      while (index < blocks.length && blocks[index].type === 'listItem') {
        items.push(`<li style="${style.list}">${processInlineStyles(blocks[index].content, style)}</li>`)
        index += 1
      }
      parts.push(`<ul style="padding-left:22px;margin:8px 0;">${items.join('')}</ul>`)
      continue
    }

    if (block.type === 'orderedItem') {
      const items: string[] = []
      while (index < blocks.length && blocks[index].type === 'orderedItem') {
        items.push(`<li style="${style.orderedList}">${processInlineStyles(blocks[index].content, style)}</li>`)
        index += 1
      }
      parts.push(`<ol style="padding-left:24px;margin:8px 0;">${items.join('')}</ol>`)
      continue
    }

    const content = processInlineStyles(block.content, style)
    switch (block.type) {
      case 'title':
        parts.push(`<h1 style="${style.title}">${content}</h1>`)
        break
      case 'mainTitle':
        parts.push(`<h2 style="${style.mainTitle}">${content}</h2>`)
        break
      case 'subtitle':
        parts.push(`<h3 style="${style.subtitle}">${content}</h3>`)
        break
      case 'sectionTitle':
        parts.push(`<h4 style="${style.sectionTitle}">${content}</h4>`)
        break
      case 'paragraph':
        parts.push(`<p style="${style.paragraph}">${content}</p>`)
        break
      case 'quote':
        parts.push(`<blockquote style="${style.quote}">${content}</blockquote>`)
        break
      case 'divider':
        parts.push(`<hr style="${style.divider}" />`)
        break
      case 'codeBlock':
        parts.push(`<pre style="${style.codeBlock}">${escapeHTML(block.content)}</pre>`)
        break
      default:
        parts.push(`<p style="${style.paragraph}">${content}</p>`)
        break
    }
    index += 1
  }

  return parts.join('\n')
}

function processInlineStyles(text: string, style: TemplateStyle) {
  let result = escapeHTML(text)

  result = result.replace(/\{(green|blue|orange|red|purple)\|([^}]+)\}/g, (_, color, words) => {
    const value = style.colorMap[color] || style.colorMap.green
    return `<span style="color:${value};font-weight:700;">${words}</span>`
  })
  result = result.replace(/==([^=]+)==/g, (_, words) => `<span style="${style.highlight}">${words}</span>`)
  result = result.replace(/__([^_]+)__/g, (_, words) => `<span style="${style.underline}">${words}</span>`)
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, words) => `<span style="${style.strong}">${words}</span>`)
  result = result.replace(/`([^`]+)`/g, (_, words) => `<code style="${style.codeInline}">${words}</code>`)

  return result
}

function renderXiaohongshuPanel(style: TemplateStyle) {
  const items = ['首段保持 1 句钩子', '结尾补充互动提问', '保留 3 到 5 个标签']
    .map((item) => `<li style="${style.list}">${escapeHTML(item)}</li>`)
    .join('')

  return `<section style="${style.notePanel}"><span style="${style.noteLabel}">小红书发布建议</span><ul style="padding-left:20px;margin:0;">${items}</ul></section>`
}

function renderTags(tags: string[], style: TemplateStyle) {
  if (!tags.length) return ''
  const html = tags.map((tag) => `<span style="${style.tagChip}">${escapeHTML(tag)}</span>`).join('')
  return `<div style="margin-top:18px;padding-top:10px;">${html}</div>`
}

function extractTags(content: string) {
  const tags = new Set<string>()
  const explicitTags = content.match(/#[^\s#]{2,18}/g) || []

  explicitTags.forEach((tag) => tags.add(tag))

  const candidates = content.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,8}/g) || []
  for (const candidate of candidates) {
    if (tags.size >= 5) break
    if (TAG_STOP_WORDS.test(candidate)) continue
    tags.add(`#${candidate}`)
  }

  return Array.from(tags).slice(0, 5)
}

function escapeHTML(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
