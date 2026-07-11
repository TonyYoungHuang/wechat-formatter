import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { wechatPasteRegressionDocument } from "../src/lib/wechat-layout/fixtures";
import { renderWechatDocument } from "../src/lib/wechat-layout/render/wechat-renderer";
import { wechatThemes } from "../src/lib/wechat-layout/themes";

function wrapPreview(title: string, body: string) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:32px;background:#eef4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;"><div style="position:sticky;top:12px;z-index:2;max-width:420px;margin:0 auto 16px;text-align:right;"><button id="copy-regression" type="button" style="border:0;border-radius:6px;padding:10px 16px;background:#059669;color:#ffffff;font-size:15px;font-weight:700;cursor:pointer;">复制回归样文</button><p id="copy-status" style="margin:7px 0 0;color:#047857;font-size:13px;"></p></div><main id="regression-content" style="width:100%;max-width:420px;margin:0 auto;background:#ffffff;box-shadow:0 8px 30px rgba(15,23,42,.08);">${body}</main><script>document.getElementById('copy-regression').addEventListener('click',async()=>{const content=document.getElementById('regression-content');const status=document.getElementById('copy-status');try{if(window.isSecureContext&&window.ClipboardItem&&navigator.clipboard?.write){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([content.innerHTML],{type:'text/html'}),'text/plain':new Blob([content.innerText],{type:'text/plain'})})]);}else{const range=document.createRange();range.selectNodeContents(content);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);if(!document.execCommand('copy'))throw new Error('copy failed');selection.removeAllRanges();}status.textContent='已复制。请到微信公众号正文区直接粘贴，不要发布测试稿。';}catch{status.textContent='浏览器未允许复制，请用排版猫编辑器里的“复制到公众号后台”。';}});</script></body></html>`;
}

async function main() {
  const outputDirectory = resolve(".artifacts");
  const outputPath = resolve(outputDirectory, "wechat-paste-regression.html");
  const fragmentPath = resolve(outputDirectory, "wechat-paste-regression.fragment.html");
  const textPath = resolve(outputDirectory, "wechat-paste-regression.txt");
  const galleryPath = resolve(outputDirectory, "wechat-theme-gallery.html");
  const harnessPath = resolve(outputDirectory, "wechat-paste-harness.html");
  const result = renderWechatDocument(wechatPasteRegressionDocument, "classic-green");

  if (!result.audit.passed) {
    throw new Error(result.audit.issues.map((issue) => issue.message).join("; "));
  }

  await mkdir(outputDirectory, { recursive: true });
  const gallery = Object.values(wechatThemes)
    .map((theme) => {
      const rendered = renderWechatDocument(wechatPasteRegressionDocument, theme.id);
      return `<article style="width:420px;flex:0 0 420px;"><h2 style="margin:0 0 12px;font-size:18px;">${theme.name}</h2><div style="background:#ffffff;box-shadow:0 8px 30px rgba(15,23,42,.08);">${rendered.html}</div></article>`;
    })
    .join("");
  const galleryDocument = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>排版猫精品模板回归画廊</title></head><body style="margin:0;padding:28px;background:#eef4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;"><h1 style="margin:0 0 24px;font-size:26px;">排版猫 10 套精品模板回归画廊</h1><main style="display:flex;align-items:flex-start;gap:24px;overflow-x:auto;padding-bottom:24px;">${gallery}</main></body></html>`;
  const harnessDocument = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>排版猫富文本粘贴回归台</title></head><body style="margin:0;padding:28px;background:#eef4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;"><h1 style="margin:0 auto 18px;max-width:420px;font-size:24px;">富文本粘贴回归台</h1><div id="paste-target" contenteditable="true" style="box-sizing:border-box;width:100%;max-width:420px;min-height:720px;margin:0 auto;padding:0;background:#ffffff;box-shadow:0 8px 30px rgba(15,23,42,.08);outline:2px dashed #34d399;" aria-label="公众号正文粘贴测试区"></div></body></html>`;
  await Promise.all([
    writeFile(outputPath, wrapPreview("排版猫微信公众号粘贴兼容测试", result.html), "utf8"),
    writeFile(fragmentPath, result.html, "utf8"),
    writeFile(textPath, result.text, "utf8"),
    writeFile(galleryPath, galleryDocument, "utf8"),
    writeFile(harnessPath, harnessDocument, "utf8"),
  ]);

  console.log(outputPath);
}

void main();
