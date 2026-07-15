import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { load } from "cheerio";

const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_CHARS = 50000;
const MAX_REDIRECTS = 4;
const SOURCE_FETCH_TIMEOUT_MS = Number(process.env.SOURCE_FETCH_TIMEOUT_MS || 12000);

export type ExtractedWebSource = {
  url: string;
  title: string;
  description: string;
  text: string;
  charCount: number;
  truncated: boolean;
};

function isBlockedIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

export function isBlockedSourceAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  const version = isIP(normalized);

  if (version === 4) return isBlockedIpv4(normalized);
  if (version !== 6) return true;

  if (normalized.startsWith("::ffff:")) {
    return isBlockedIpv4(normalized.slice("::ffff:".length));
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("2001:db8")
  );
}

async function assertPublicUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("只支持不含账号密码的公开 http/https 链接。");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("这个链接不是公开网页，无法读取。");
  }

  if (isIP(hostname)) {
    if (isBlockedSourceAddress(hostname)) throw new Error("内网或保留地址不能作为素材链接。");
    return url;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isBlockedSourceAddress(item.address))) {
    throw new Error("链接解析到了内网或保留地址，已停止读取。");
  }

  return url;
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBoilerplateLine(value: string) {
  return [
    /^扫码或复制.*(?:客服|微信号)/,
    /^添加时备注[：:]/,
    /^客服不会主动索要/,
    /^(?:登录|注册|退出|返回首页|打开微信客服)$/,
    /^(?:隐私政策|用户协议|免责声明|版权所有|Copyright)/i,
  ].some((pattern) => pattern.test(value));
}

function decodeBody(bytes: Uint8Array, contentType: string) {
  const asciiHead = Buffer.from(bytes.subarray(0, Math.min(bytes.length, 4096))).toString("ascii");
  const charset =
    contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1] ||
    asciiHead.match(/<meta[^>]+charset\s*=\s*["']?([^"'\s/>]+)/i)?.[1] ||
    "utf-8";

  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

async function readLimitedBody(response: Response) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_DOWNLOAD_BYTES) throw new Error("网页内容超过 2MB，请改为粘贴转写稿或正文。");
  if (!response.body) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error("网页内容超过 2MB，请改为粘贴转写稿或正文。");
    }
    chunks.push(value);
  }

  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function extractHtmlContent(html: string) {
  const $ = load(html);
  const title = normalizeText($("meta[property='og:title']").attr("content") || $("h1").first().text() || $("title").text()).slice(0, 160);
  const description = normalizeText(
    $("meta[property='og:description']").attr("content") || $("meta[name='description']").attr("content") || "",
  ).slice(0, 500);

  $("script,style,noscript,svg,canvas,iframe,form,button,nav,header,footer,aside").remove();
  $("[hidden],[aria-hidden='true'],.advertisement,.ads,.comment,.comments,.recommend,.related").remove();

  const selectors = [
    "#js_content",
    "article",
    "main",
    "[role='main']",
    ".article-content",
    ".article_content",
    ".post-content",
    ".entry-content",
    ".rich_media_content",
    ".content",
    "body",
  ];
  let bestText = "";

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const root = $(element).clone();
      const blocks = root
        .find("h1,h2,h3,h4,p,li,blockquote,figcaption")
        .map((__, block) => normalizeText($(block).text()))
        .get()
        .filter((item) => item.length > 0 && !isBoilerplateLine(item));
      const candidate = normalizeText(blocks.length ? blocks.join("\n") : root.text());
      if (candidate.length > bestText.length) bestText = candidate;
    });
    if (bestText.length >= 800) break;
  }

  if (bestText.length < 50 && description) bestText = description;
  return { title, description, text: bestText };
}

export async function extractPublicWebSource(value: string): Promise<ExtractedWebSource> {
  let url = await assertPublicUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);

  try {
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6",
          "User-Agent": "Mozilla/5.0 (compatible; PaibanmaoSourceReader/1.0; +https://paibanmao.cn)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("网页重定向缺少目标地址。");
        url = await assertPublicUrl(new URL(location, url).toString());
        continue;
      }

      if (!response.ok) throw new Error(`网页返回 ${response.status}，暂时无法读取。`);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        throw new Error("该链接不是可读取的网页正文，请直接粘贴文字稿。");
      }

      const bytes = await readLimitedBody(response);
      const raw = decodeBody(bytes, contentType);
      const extracted = contentType.includes("text/plain")
        ? { title: "", description: "", text: normalizeText(raw) }
        : extractHtmlContent(raw);
      if (extracted.text.length < 50) {
        throw new Error("页面没有提取到足够正文。B 站或播客页面若不公开文稿，请粘贴转写稿。");
      }

      const truncated = extracted.text.length > MAX_SOURCE_CHARS;
      const text = extracted.text.slice(0, MAX_SOURCE_CHARS);
      return {
        url: url.toString(),
        title: extracted.title || new URL(url).hostname,
        description: extracted.description,
        text,
        charCount: text.length,
        truncated,
      };
    }

    throw new Error("网页重定向次数过多，已停止读取。");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("读取链接超时，请直接粘贴文稿内容。");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
