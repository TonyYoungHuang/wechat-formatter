const FORBIDDEN_BLOCKS = /<(script|style|iframe|form|object|embed)[^>]*>[\s\S]*?<\/\1>/gi;
const FORBIDDEN_SINGLE_TAGS = /<(script|style|iframe|form|object|embed|input|button|textarea|select|link|meta)[^>]*\/?\s*>/gi;

export function sanitizeRenderedWechatHtml(html: string) {
  return html
    .replace(FORBIDDEN_BLOCKS, "")
    .replace(FORBIDDEN_SINGLE_TAGS, "")
    .replace(/\sclass=("[^"]*"|'[^']*')/gi, "")
    .replace(/\sid=("[^"]*"|'[^']*')/gi, "")
    .replace(/\son[a-z]+=("[^"]*"|'[^']*')/gi, "")
    .replace(/(href|src)=("|')\s*javascript:[\s\S]*?\2/gi, '$1="#"');
}
