import { PlaceholderPage } from "@/components/app/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="设置"
      description="管理模型中转站、支付、价格、额度和账号安全。"
      items={["OpenAI-compatible 模型接口配置", "价格配置入口", "额度配置入口", "微信支付/支付宝配置"]}
    />
  );
}

