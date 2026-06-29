import { createSign, randomBytes } from "node:crypto";
import QRCode from "qrcode";

type PaymentProvider = "wechat" | "alipay";

type CheckoutInput = {
  orderId: string;
  provider: PaymentProvider;
  amountCents: number;
  description: string;
  expiresAt: Date;
};

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function pemFromEnv(value: string | undefined) {
  return value?.replace(/\\n/g, "\n") || "";
}

function toRfc3339(date: Date) {
  return date.toISOString();
}

function signWithRsaSha256(message: string, privateKeyPem: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

function buildDevCheckout(input: CheckoutInput) {
  return {
    mode: "development",
    provider: input.provider,
    orderId: input.orderId,
    amountCents: input.amountCents,
    expiresAt: input.expiresAt.toISOString(),
    instructions:
      input.provider === "wechat"
        ? "微信支付参数未完整配置，当前返回开发模式订单。配置商户号、证书序列号和私钥后会调用 Native 下单。"
        : "支付宝参数未完整配置，当前返回开发模式订单。配置应用 ID 和应用私钥后会生成电脑网站支付跳转链接。",
  };
}

function wechatConfigured() {
  return Boolean(
    process.env.WECHAT_PAY_APP_ID &&
      process.env.WECHAT_PAY_MCH_ID &&
      process.env.WECHAT_PAY_MCH_SERIAL_NO &&
      process.env.WECHAT_PAY_PRIVATE_KEY_PEM,
  );
}

async function createWechatNativeCheckout(input: CheckoutInput) {
  if (!wechatConfigured()) {
    return buildDevCheckout(input);
  }

  const appid = process.env.WECHAT_PAY_APP_ID!;
  const mchid = process.env.WECHAT_PAY_MCH_ID!;
  const serialNo = process.env.WECHAT_PAY_MCH_SERIAL_NO!;
  const privateKey = pemFromEnv(process.env.WECHAT_PAY_PRIVATE_KEY_PEM);
  const path = "/v3/pay/transactions/native";
  const body = JSON.stringify({
    appid,
    mchid,
    description: input.description.slice(0, 127),
    out_trade_no: input.orderId,
    time_expire: toRfc3339(input.expiresAt),
    notify_url: `${appUrl()}/api/billing/callback/wechat`,
    amount: {
      total: input.amountCents,
      currency: "CNY",
    },
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("hex");
  const message = `POST\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signWithRsaSha256(message, privateKey);
  const authorization = [
    "WECHATPAY2-SHA256-RSA2048",
    `mchid="${mchid}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${serialNo}"`,
  ].join(",");

  const response = await fetch(`https://api.mch.weixin.qq.com${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || typeof payload.code_url !== "string") {
    throw new Error(typeof payload.message === "string" ? payload.message : "Wechat Pay Native order failed.");
  }

  return {
    mode: "wechat_native",
    provider: "wechat",
    orderId: input.orderId,
    amountCents: input.amountCents,
    expiresAt: input.expiresAt.toISOString(),
    codeUrl: payload.code_url as string,
    qrCodeDataUrl: await QRCode.toDataURL(payload.code_url as string),
  };
}

function alipayConfigured() {
  return Boolean(process.env.ALIPAY_APP_ID && process.env.ALIPAY_PRIVATE_KEY_PEM);
}

function serializeSortedParams(params: Record<string, string>) {
  return Object.keys(params)
    .filter((key) => params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function createAlipayPageCheckout(input: CheckoutInput) {
  if (!alipayConfigured()) {
    return buildDevCheckout(input);
  }

  const gateway = process.env.ALIPAY_GATEWAY_URL || "https://openapi.alipay.com/gateway.do";
  const params: Record<string, string> = {
    app_id: process.env.ALIPAY_APP_ID!,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
    version: "1.0",
    notify_url: `${appUrl()}/api/billing/callback/alipay`,
    return_url: `${appUrl()}/dashboard/billing`,
    biz_content: JSON.stringify({
      out_trade_no: input.orderId,
      total_amount: (input.amountCents / 100).toFixed(2),
      subject: input.description.slice(0, 256),
      product_code: "FAST_INSTANT_TRADE_PAY",
      time_expire: input.expiresAt.toISOString().slice(0, 19).replace("T", " "),
    }),
  };
  const signature = signWithRsaSha256(serializeSortedParams(params), pemFromEnv(process.env.ALIPAY_PRIVATE_KEY_PEM));
  const url = `${gateway}?${new URLSearchParams({ ...params, sign: signature }).toString()}`;

  return {
    mode: "alipay_page",
    provider: "alipay",
    orderId: input.orderId,
    amountCents: input.amountCents,
    expiresAt: input.expiresAt.toISOString(),
    paymentUrl: url,
  };
}

export async function createPaymentCheckout(input: CheckoutInput) {
  if (input.amountCents <= 0) {
    return {
      mode: "free_activation",
      provider: input.provider,
      orderId: input.orderId,
      amountCents: input.amountCents,
      expiresAt: input.expiresAt.toISOString(),
      instructions: "当前套餐价格为 0 元，可通过回调或后台直接开通。",
    };
  }

  if (input.provider === "wechat") {
    return createWechatNativeCheckout(input);
  }

  return createAlipayPageCheckout(input);
}
