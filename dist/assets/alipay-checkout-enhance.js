(function () {
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  var seenOpenedUrls = new Set();
  var seenPaidOrders = new Set();
  var TEXT_ALIPAY = '\u652f\u4ed8\u5b9d';
  var TEXT_WECHAT = '\u5fae\u4fe1\u652f\u4ed8';
  var TEXT_PAID = '\u5df2\u652f\u4ed8';
  var TEXT_PENDING = '\u5f85\u652f\u4ed8';
  var TEXT_CLOSE = '\u5173\u95ed';
  var TEXT_MODAL = '\u6a21\u677f\u5347\u7ea7\u4e0e\u652f\u4ed8';

  var style = document.createElement('style');
  style.textContent = [
    '.pm-alipay-enhance-hidden { display: none !important; }',
    '.pm-alipay-enhance-box { margin-top: 14px; padding: 14px 16px; border: 1px dashed rgba(255,255,255,0.14); border-radius: 18px; background: rgba(255,255,255,0.04); color: var(--text-2, rgba(255,255,255,0.78)); font-size: 14px; line-height: 1.7; }',
    '.pm-alipay-enhance-title { font-size: 14px; font-weight: 700; color: var(--text, #fff); margin-bottom: 6px; }',
    '.pm-alipay-enhance-btn { margin-top: 12px; display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 18px; border: 0; border-radius: 999px; background: linear-gradient(135deg, #1ebd69 0%, #168f52 100%); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 22px rgba(30,189,105,0.24); }',
    '.pm-alipay-enhance-btn:hover { filter: brightness(1.06); }',
    '.pm-alipay-paid-toast { position: fixed; right: 24px; bottom: 24px; z-index: 9999; max-width: 320px; padding: 14px 16px; border-radius: 18px; border: 1px solid #b7ebc6; background: #f6ffed; color: #237804; font-size: 14px; line-height: 1.6; box-shadow: 0 14px 30px rgba(0,0,0,0.16); }'
  ].join('');
  document.head.appendChild(style);

  function textOf(node) {
    return (node && node.textContent || '').trim();
  }

  function findPaymentModal() {
    var cards = Array.from(document.querySelectorAll('.modal-card'));
    return cards.find(function (node) {
      var text = textOf(node);
      return text.indexOf(TEXT_MODAL) !== -1 || text.indexOf('\u4f1a\u5458\u652f\u4ed8') !== -1 || text.indexOf('\u521b\u5efa\u8ba2\u5355') !== -1;
    }) || null;
  }

  function extractPaymentMeta(modal) {
    var infoCard = modal ? modal.querySelector('.pm-order-info-card') : null;
    var rawNodes = infoCard ? Array.from(infoCard.querySelectorAll('.pm-order-link-box, .pm-order-link-note')) : [];
    var urls = rawNodes.map(function (node) {
      var match = textOf(node).match(/https?:\/\/\S+/);
      return match ? match[0] : '';
    }).filter(Boolean);
    var rows = infoCard ? Array.from(infoCard.querySelectorAll('.pm-order-info-row')) : [];
    var orderId = '';
    if (rows[0]) {
      var orderValue = rows[0].querySelector('.pm-order-info-value');
      orderId = textOf(orderValue);
    }
    var statusEl = Array.from(modal.querySelectorAll('span,div,p,button')).find(function (node) {
      var value = textOf(node);
      return value === TEXT_PAID || value === TEXT_PENDING;
    });
    var fullText = textOf(infoCard || modal);

    return {
      infoCard: infoCard,
      rawNodes: rawNodes,
      paymentUrl: urls.find(function (url) { return url.indexOf('/api/payments/callback/') === -1; }) || '',
      orderId: orderId,
      statusText: statusEl ? textOf(statusEl) : '',
      isAlipay: fullText.indexOf(TEXT_ALIPAY) !== -1,
      isWeChat: fullText.indexOf(TEXT_WECHAT) !== -1
    };
  }

  function ensureHelperBox(infoCard) {
    var box = infoCard.querySelector('.pm-alipay-enhance-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'pm-alipay-enhance-box';
      infoCard.appendChild(box);
    }
    return box;
  }

  function openUrl(url) {
    if (!url || seenOpenedUrls.has(url)) {
      return;
    }
    seenOpenedUrls.add(url);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function showPaidToast() {
    var existing = document.querySelector('.pm-alipay-paid-toast');
    if (existing) {
      existing.remove();
    }
    var toast = document.createElement('div');
    toast.className = 'pm-alipay-paid-toast';
    toast.textContent = '\u652f\u4ed8\u6210\u529f\uff0cVIP \u5df2\u81ea\u52a8\u5f00\u901a\u3002';
    document.body.appendChild(toast);
    window.setTimeout(function () { toast.remove(); }, 3600);
  }

  function maybeCloseModal(modal) {
    var closeButton = Array.from(modal.querySelectorAll('button')).find(function (node) {
      return textOf(node) === TEXT_CLOSE;
    });
    if (closeButton) {
      window.setTimeout(function () { closeButton.click(); }, 900);
    }
  }

  function applyEnhancement() {
    var modal = findPaymentModal();
    if (!modal) {
      return;
    }

    var meta = extractPaymentMeta(modal);
    if (!meta.infoCard || !meta.isAlipay) {
      return;
    }

    meta.rawNodes.forEach(function (node) {
      node.classList.add('pm-alipay-enhance-hidden');
    });

    var helper = ensureHelperBox(meta.infoCard);
    var stateKey = [meta.orderId, meta.statusText, isMobile ? 'mobile' : 'desktop'].join('|');
    if (helper.getAttribute('data-state-key') !== stateKey) {
      helper.setAttribute('data-state-key', stateKey);
      helper.innerHTML = '';

      var title = document.createElement('div');
      title.className = 'pm-alipay-enhance-title';
      title.textContent = isMobile ? '\u624b\u673a\u652f\u4ed8\u5f15\u5bfc' : '\u652f\u4ed8\u5b9d\u652f\u4ed8\u5f15\u5bfc';
      helper.appendChild(title);

      var desc = document.createElement('div');
      desc.textContent = isMobile
        ? '\u8bf7\u76f4\u63a5\u8df3\u8f6c\u5230\u652f\u4ed8\u5b9d\u5b8c\u6210\u4ed8\u6b3e\uff0c\u907f\u514d\u770b\u5230\u684c\u9762\u7248\u6536\u94f6\u53f0\u9875\u9762\u3002'
        : '\u8bf7\u4f7f\u7528\u624b\u673a\u652f\u4ed8\u5b9d\u626b\u7801\u5b8c\u6210\u4ed8\u6b3e\uff0c\u9875\u9762\u4e0d\u4f1a\u518d\u5c55\u793a\u539f\u59cb\u94fe\u63a5\u6216\u56de\u8c03\u5730\u5740\u3002';
      helper.appendChild(desc);

      if (isMobile && meta.paymentUrl) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'pm-alipay-enhance-btn';
        button.textContent = '\u7ee7\u7eed\u524d\u5f80\u652f\u4ed8\u5b9d';
        button.addEventListener('click', function () { openUrl(meta.paymentUrl); });
        helper.appendChild(button);
      }

      var note = document.createElement('div');
      note.style.marginTop = '8px';
      note.style.fontSize = '12px';
      note.style.opacity = '0.8';
      note.textContent = '\u652f\u4ed8\u5b8c\u6210\u540e\uff0c\u5f39\u7a97\u4f1a\u81ea\u52a8\u5173\u95ed\uff0c\u5e76\u540c\u6b65\u5237\u65b0 VIP \u72b6\u6001\u3002';
      helper.appendChild(note);
    }

    if (meta.statusText === TEXT_PAID && meta.orderId && !seenPaidOrders.has(meta.orderId)) {
      seenPaidOrders.add(meta.orderId);
      showPaidToast();
      maybeCloseModal(modal);
    }
  }

  function start() {
    window.setInterval(applyEnhancement, 700);
    applyEnhancement();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
