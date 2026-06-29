type EnvVarStatus = {
  key: string;
  configured: boolean;
  purpose: string;
};

export type PaymentProviderConfigStatus = {
  provider: "wechat" | "alipay";
  label: string;
  checkoutMode: string;
  ready: boolean;
  callbackReady: boolean;
  checkoutUrl: string;
  callbackUrl: string;
  required: EnvVarStatus[];
  callbackRequired: EnvVarStatus[];
  optional: EnvVarStatus[];
};

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function envStatus(key: string, purpose: string): EnvVarStatus {
  return {
    key,
    purpose,
    configured: Boolean(process.env[key]?.trim()),
  };
}

function allConfigured(items: EnvVarStatus[]) {
  return items.every((item) => item.configured);
}

export function getPaymentConfigurationStatus() {
  const baseUrl = appUrl();
  const wechatRequired = [
    envStatus("WECHAT_PAY_APP_ID", "公众号/小程序 AppID"),
    envStatus("WECHAT_PAY_MCH_ID", "微信支付商户号"),
    envStatus("WECHAT_PAY_MCH_SERIAL_NO", "商户证书序列号"),
    envStatus("WECHAT_PAY_PRIVATE_KEY_PEM", "商户 API 私钥 PEM"),
  ];
  const wechatCallbackRequired = [
    envStatus("WECHAT_PAY_API_V3_KEY", "回调资源解密与开发兜底验签"),
    envStatus("WECHAT_PAY_PLATFORM_CERT_PEM", "微信支付平台证书验签"),
  ];
  const alipayRequired = [
    envStatus("ALIPAY_APP_ID", "支付宝应用 ID"),
    envStatus("ALIPAY_PRIVATE_KEY_PEM", "支付宝应用私钥 PEM"),
  ];
  const alipayCallbackRequired = [envStatus("ALIPAY_PUBLIC_KEY_PEM", "支付宝公钥回调验签")];

  const providers: PaymentProviderConfigStatus[] = [
    {
      provider: "wechat",
      label: "微信支付 Native",
      checkoutMode: "Native 扫码下单",
      ready: allConfigured(wechatRequired),
      callbackReady: allConfigured(wechatCallbackRequired),
      checkoutUrl: "https://api.mch.weixin.qq.com/v3/pay/transactions/native",
      callbackUrl: `${baseUrl}/api/billing/callback/wechat`,
      required: wechatRequired,
      callbackRequired: wechatCallbackRequired,
      optional: [envStatus("APP_URL", "生成支付回调 URL，未配置时本地使用 localhost")],
    },
    {
      provider: "alipay",
      label: "支付宝电脑网站支付",
      checkoutMode: "Page Pay 跳转链接",
      ready: allConfigured(alipayRequired),
      callbackReady: allConfigured(alipayCallbackRequired),
      checkoutUrl: process.env.ALIPAY_GATEWAY_URL || "https://openapi.alipay.com/gateway.do",
      callbackUrl: `${baseUrl}/api/billing/callback/alipay`,
      required: alipayRequired,
      callbackRequired: alipayCallbackRequired,
      optional: [
        envStatus("ALIPAY_GATEWAY_URL", "支付宝网关，未配置时使用正式网关"),
        envStatus("APP_URL", "生成支付回调和返回 URL，未配置时本地使用 localhost"),
      ],
    },
  ];

  return {
    appUrl: baseUrl,
    providers,
    productionReady: providers.every((provider) => provider.ready && provider.callbackReady),
    message: "只返回环境变量是否配置，不返回任何密钥内容。",
  };
}
