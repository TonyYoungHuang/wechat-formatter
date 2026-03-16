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
  colorMap: Record<string, string>
}

const templates: Record<string, TemplateStyle> = {
  mint: {
    article: 'max-width:100%;padding:12px 14px;background:#f7f8f9;border-radius:14px;',
    title: 'font-size:30px;line-height:1.4;font-weight:800;color:#122322;margin:8px 0 22px;',
    mainTitle: 'font-size:24px;line-height:1.45;font-weight:700;color:#1e5e52;margin:26px 0 14px;',
    subtitle: 'font-size:20px;line-height:1.45;font-weight:700;color:#2a7467;margin:20px 0 12px;',
    sectionTitle: 'font-size:17px;line-height:1.45;font-weight:700;color:#328272;margin:16px 0 10px;',
    paragraph: 'font-size:16px;line-height:1.95;color:#2b3135;margin:12px 0;',
    quote: 'font-size:15px;line-height:1.9;color:#37524c;margin:14px 0;padding:12px 14px;background:#ebf5f3;border-left:3px solid #56a597;border-radius:8px;',
    list: 'font-size:16px;line-height:1.95;color:#2b3135;margin:6px 0;',
    orderedList: 'font-size:16px;line-height:1.95;color:#2b3135;margin:6px 0;',
    divider: 'border:none;height:1px;background:#d8e3e0;margin:18px 0;',
    codeBlock: 'font-size:13px;line-height:1.7;color:#334155;background:#eef2f7;border:1px solid #d7dee7;padding:12px;border-radius:10px;overflow:auto;margin:14px 0;',
    codeInline: 'font-size:13px;color:#0f766e;background:#e5f3f1;border:1px solid #cbe6e1;padding:1px 6px;border-radius:6px;font-family:Consolas,Monaco,monospace;',
    strong: 'font-weight:700;color:#155e55;',
    underline: 'text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:#67b8aa;',
    highlight: 'background:#fff3cd;color:#374151;padding:0 3px;border-radius:4px;',
    colorMap: {
      green: '#1f7a69',
      blue: '#2f6bff',
      orange: '#bf6f1d',
      red: '#b43c2f',
      purple: '#7648c5',
    },
  },
  slate: {
    article: 'max-width:100%;padding:12px 14px;background:#f7f8fa;border-radius:14px;',
    title: 'font-size:30px;line-height:1.4;font-weight:800;color:#1e293b;margin:8px 0 22px;',
    mainTitle: 'font-size:24px;line-height:1.45;font-weight:700;color:#334155;margin:26px 0 14px;',
    subtitle: 'font-size:20px;line-height:1.45;font-weight:700;color:#3f536d;margin:20px 0 12px;',
    sectionTitle: 'font-size:17px;line-height:1.45;font-weight:700;color:#485c74;margin:16px 0 10px;',
    paragraph: 'font-size:16px;line-height:1.95;color:#27313f;margin:12px 0;',
    quote: 'font-size:15px;line-height:1.9;color:#334155;margin:14px 0;padding:12px 14px;background:#eef2f6;border-left:3px solid #7a8ca7;border-radius:8px;',
    list: 'font-size:16px;line-height:1.95;color:#27313f;margin:6px 0;',
    orderedList: 'font-size:16px;line-height:1.95;color:#27313f;margin:6px 0;',
    divider: 'border:none;height:1px;background:#dde3ea;margin:18px 0;',
    codeBlock: 'font-size:13px;line-height:1.7;color:#334155;background:#eef2f7;border:1px solid #d7dee7;padding:12px;border-radius:10px;overflow:auto;margin:14px 0;',
    codeInline: 'font-size:13px;color:#1e40af;background:#eaf0ff;border:1px solid #d7e2ff;padding:1px 6px;border-radius:6px;font-family:Consolas,Monaco,monospace;',
    strong: 'font-weight:700;color:#1e293b;',
    underline: 'text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:#94a3b8;',
    highlight: 'background:#fef3c7;color:#374151;padding:0 3px;border-radius:4px;',
    colorMap: {
      green: '#0f766e',
      blue: '#1d4ed8',
      orange: '#b45309',
      red: '#b91c1c',
      purple: '#6d28d9',
    },
  },
  sunrise: {
    article: 'max-width:100%;padding:12px 14px;background:#fbf8f3;border-radius:14px;',
    title: 'font-size:30px;line-height:1.4;font-weight:800;color:#40210f;margin:8px 0 22px;',
    mainTitle: 'font-size:24px;line-height:1.45;font-weight:700;color:#8a4e1d;margin:26px 0 14px;',
    subtitle: 'font-size:20px;line-height:1.45;font-weight:700;color:#a05d24;margin:20px 0 12px;',
    sectionTitle: 'font-size:17px;line-height:1.45;font-weight:700;color:#b0682b;margin:16px 0 10px;',
    paragraph: 'font-size:16px;line-height:1.95;color:#3f2f23;margin:12px 0;',
    quote: 'font-size:15px;line-height:1.9;color:#614633;margin:14px 0;padding:12px 14px;background:#fff2df;border-left:3px solid #d6a16b;border-radius:8px;',
    list: 'font-size:16px;line-height:1.95;color:#3f2f23;margin:6px 0;',
    orderedList: 'font-size:16px;line-height:1.95;color:#3f2f23;margin:6px 0;',
    divider: 'border:none;height:1px;background:#edd9c4;margin:18px 0;',
    codeBlock: 'font-size:13px;line-height:1.7;color:#7c2d12;background:#fff7ed;border:1px solid #ffedd5;padding:12px;border-radius:10px;overflow:auto;margin:14px 0;',
    codeInline: 'font-size:13px;color:#9a3412;background:#fff1e6;border:1px solid #ffe0cc;padding:1px 6px;border-radius:6px;font-family:Consolas,Monaco,monospace;',
    strong: 'font-weight:700;color:#8a4e1d;',
    underline: 'text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:#d6a16b;',
    highlight: 'background:#ffe7bf;color:#5b3b1f;padding:0 3px;border-radius:4px;',
    colorMap: {
      green: '#047857',
      blue: '#1d4ed8',
      orange: '#b45309',
      red: '#b91c1c',
      purple: '#7c3aed',
    },
  },
  ocean: {
    article: 'max-width:100%;padding:12px 14px;background:#f4f8fb;border-radius:14px;',
    title: 'font-size:30px;line-height:1.4;font-weight:800;color:#163249;margin:8px 0 22px;',
    mainTitle: 'font-size:24px;line-height:1.45;font-weight:700;color:#0f5e78;margin:26px 0 14px;',
    subtitle: 'font-size:20px;line-height:1.45;font-weight:700;color:#1b6f8e;margin:20px 0 12px;',
    sectionTitle: 'font-size:17px;line-height:1.45;font-weight:700;color:#2d86a7;margin:16px 0 10px;',
    paragraph: 'font-size:16px;line-height:1.95;color:#253845;margin:12px 0;',
    quote: 'font-size:15px;line-height:1.9;color:#2f5061;margin:14px 0;padding:12px 14px;background:#e6f4fa;border-left:3px solid #67adc8;border-radius:8px;',
    list: 'font-size:16px;line-height:1.95;color:#253845;margin:6px 0;',
    orderedList: 'font-size:16px;line-height:1.95;color:#253845;margin:6px 0;',
    divider: 'border:none;height:1px;background:#d6e8f1;margin:18px 0;',
    codeBlock: 'font-size:13px;line-height:1.7;color:#155e75;background:#ecfeff;border:1px solid #cffafe;padding:12px;border-radius:10px;overflow:auto;margin:14px 0;',
    codeInline: 'font-size:13px;color:#0e7490;background:#e6f7fb;border:1px solid #cdebf4;padding:1px 6px;border-radius:6px;font-family:Consolas,Monaco,monospace;',
    strong: 'font-weight:700;color:#0f5e78;',
    underline: 'text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:#67adc8;',
    highlight: 'background:#fff3cd;color:#374151;padding:0 3px;border-radius:4px;',
    colorMap: {
      green: '#0f766e',
      blue: '#1d4ed8',
      orange: '#c2410c',
      red: '#b91c1c',
      purple: '#6d28d9',
    },
  },
}

export function enhanceContentWithAI(input: string): string {
  const normalized = input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!normalized) {
    return ''
  }

  const lines = normalized.split('\n').map((line) => line.trim())
  const output: string[] = []

  let titleInjected = false
  let pendingNumber = 1

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line) {
      output.push('')
      continue
    }

    const isMarkdownTitle = /^#{1,4}\s/.test(line)
    if (!titleInjected && !isMarkdownTitle) {
      if (line.length <= 32 && !/[，。！？；：]/.test(line)) {
        output.push(`# ${line}`)
        titleInjected = true
        continue
      }
      titleInjected = true
    }

    // Keep existing markdown titles unchanged to avoid duplicate "### ###".
    if (isMarkdownTitle) {
      output.push(line)
      pendingNumber = 1
      continue
    }

    if (/^[-*_]{3,}$/.test(line)) {
      output.push('---')
      continue
    }

    if (/^[>＞]/.test(line)) {
      output.push(`> ${line.replace(/^[>＞]\s*/, '')}`)
      continue
    }

    if (/^([一二三四五六七八九十]+[、.．])/.test(line) || /^第.{1,12}(章|节|部分)/.test(line)) {
      output.push(`## ${line.replace(/[、.．]$/, '')}`)
      pendingNumber = 1
      continue
    }

    if (/^(总结|结语|小结|最后|最后总结|写在最后)/.test(line)) {
      output.push(`## ${line}`)
      pendingNumber = 1
      continue
    }

    if (/^(\d+)[)）.．、]\s*/.test(line)) {
      const item = line.replace(/^(\d+)[)）.．、]\s*/, '').trim()
      output.push(`${pendingNumber}. ${enhanceInline(item)}`)
      pendingNumber += 1
      continue
    }

    if (/^[-*•●]\s*/.test(line)) {
      const item = line.replace(/^[-*•●]\s*/, '').trim()
      output.push(`- ${enhanceInline(item)}`)
      continue
    }

    // Keep existing markdown list items unchanged.
    if (/^\d+\.\s+/.test(line) || /^[-*]\s+/.test(line)) {
      output.push(line)
      continue
    }

    if (line.length <= 18 && !/[，。！？；：]/.test(line)) {
      output.push(`### ${line}`)
      pendingNumber = 1
      continue
    }

    output.push(enhanceInline(line))
    pendingNumber = 1
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function enhanceInline(line: string): string {
  let text = line

  // Avoid reprocessing lines that already contain markdown markers.
  if (
    /\*\*[^*]+\*\*/.test(text) ||
    /__[^_]+__/.test(text) ||
    /==[^=]+==/.test(text) ||
    /\{(green|blue|orange|red|purple)\|[^}]+\}/.test(text)
  ) {
    return text
  }

  text = text.replace(/【([^】]{2,20})】/g, '**$1**')
  text = text.replace(/「([^」]{2,20})」/g, '__$1__')
  text = text.replace(/“([^”]{2,20})”/g, '==$1==')

  const keyPointWords = ['核心观点', '重点', '关键', '总结', '结论', '建议', '方法', '步骤', '问题']
  keyPointWords.forEach((word) => {
    const reg = new RegExp(`(${word}[：:])`, 'g')
    text = text.replace(reg, '**$1**')
  })

  text = text.replace(/(非常|特别|一定|务必|必须|显著|明显)([^，。！？；]{2,16})/g, '{green|$1$2}')
  return text
}

function parseContent(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const line = raw.trim()
    if (!line) {
      continue
    }

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

    if (/^#\s+/.test(line)) {
      blocks.push({ type: 'title', content: line.replace(/^#\s+/, '') })
      continue
    }
    if (/^##\s+/.test(line)) {
      blocks.push({ type: 'mainTitle', content: line.replace(/^##\s+/, '') })
      continue
    }
    if (/^###\s+/.test(line)) {
      blocks.push({ type: 'subtitle', content: line.replace(/^###\s+/, '') })
      continue
    }
    if (/^####\s+/.test(line)) {
      blocks.push({ type: 'sectionTitle', content: line.replace(/^####\s+/, '') })
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

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function processInlineStyles(text: string, style: TemplateStyle): string {
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

function blockToHTML(blocks: Block[], style: TemplateStyle): string {
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
        parts.push(`<pre style="${style.codeBlock}">${content}</pre>`)
        break
      default:
        parts.push(`<p style="${style.paragraph}">${content}</p>`)
        break
    }
    index += 1
  }

  return parts.join('\n')
}

export function formatArticle(content: string, template = 'mint'): string {
  const style = templates[template] || templates.mint
  const blocks = parseContent(content)
  const html = blockToHTML(blocks, style)

  return `<article style="${style.article}">${html}</article>`
}
