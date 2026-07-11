function legacyRichCopy(html: string) {
  const container = document.createElement("div");
  container.setAttribute("contenteditable", "true");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "375px";
  container.style.opacity = "0.01";
  container.style.pointerEvents = "none";
  container.innerHTML = html;
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);
  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  container.remove();

  if (!copied) throw new Error("浏览器未允许复制富文本，请使用下载 HTML 作为备用方式。");
}

export async function copyWechatRichHtml(html: string, plainText: string) {
  if (typeof window !== "undefined" && window.isSecureContext && "ClipboardItem" in window && navigator.clipboard?.write) {
    try {
      const ClipboardItemCtor = window.ClipboardItem;
      await navigator.clipboard.write([
        new ClipboardItemCtor({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Some browsers expose ClipboardItem but reject rich clipboard writes.
    }
  }

  legacyRichCopy(html);
}
