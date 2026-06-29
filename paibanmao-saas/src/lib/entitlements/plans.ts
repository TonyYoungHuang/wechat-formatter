export type PlanCode = "free" | "starter" | "pro";

export type PlanConfig = {
  code: PlanCode;
  name: string;
  description: string;
  priceCents: number | null;
  accountProfileLimit: number;
  dailyGenerationLimit: number | null;
  monthlyGenerationLimit: number | null;
  advancedChecks: boolean;
};

export const defaultPlans: PlanConfig[] = [
  {
    code: "free",
    name: "免费版",
    description: "适合体验排版猫的五入口生成能力。",
    priceCents: 0,
    accountProfileLimit: 1,
    dailyGenerationLimit: 1,
    monthlyGenerationLimit: null,
    advancedChecks: false,
  },
  {
    code: "starter",
    name: "入门版",
    description: "适合一个人运营多个微信副业账号。",
    priceCents: null,
    accountProfileLimit: 3,
    dailyGenerationLimit: null,
    monthlyGenerationLimit: null,
    advancedChecks: false,
  },
  {
    code: "pro",
    name: "专业版",
    description: "适合高频创作者和小团队做微信内容矩阵。",
    priceCents: null,
    accountProfileLimit: 10,
    dailyGenerationLimit: null,
    monthlyGenerationLimit: null,
    advancedChecks: true,
  },
];

export function getDefaultPlan(code: PlanCode) {
  return defaultPlans.find((plan) => plan.code === code) ?? defaultPlans[0];
}

