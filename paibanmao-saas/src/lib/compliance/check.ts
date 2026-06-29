export type ComplianceIssue = {
  category: string;
  severity: "low" | "medium" | "high";
  excerpt: string;
  message: string;
  suggestion: string;
};

const forbiddenPatterns = [
  { pattern: /最[佳强]|第一|唯一|全网最低|稳赚|保证|躺赚/g, category: "夸大承诺" },
  { pattern: /诱导分享|转发后领取|强制关注/g, category: "诱导行为" },
  { pattern: /治疗|疗效|投资收益|保本/g, category: "高风险行业表达" },
];

export function checkContentCompliance(input: { title?: string; content: string }) {
  const issues: ComplianceIssue[] = [];
  const text = `${input.title || ""}\n${input.content}`;

  for (const item of forbiddenPatterns) {
    const matches = text.match(item.pattern) || [];
    for (const match of matches.slice(0, 5)) {
      issues.push({
        category: item.category,
        severity: item.category === "高风险行业表达" ? "high" : "medium",
        excerpt: match,
        message: `发现可能存在风险的表达：「${match}」。`,
        suggestion: "建议改成更克制、可验证、不承诺结果的表达。",
      });
    }
  }

  if (input.content.length < 300) {
    issues.push({
      category: "内容完整度",
      severity: "low",
      excerpt: input.content.slice(0, 40),
      message: "正文较短，可能不足以支撑公众号长文发布。",
      suggestion: "可以补充案例、步骤或读者常见问题。",
    });
  }

  const score = Math.max(40, 100 - issues.reduce((sum, issue) => sum + (issue.severity === "high" ? 25 : issue.severity === "medium" ? 15 : 8), 0));
  const level = score >= 85 ? "可发布" : score >= 65 ? "建议修改" : "高风险";

  return {
    score,
    level,
    summary: issues.length ? "发现一些发布前建议修改的问题。" : "未发现明显风险，仍建议人工复核。",
    issues,
  };
}

