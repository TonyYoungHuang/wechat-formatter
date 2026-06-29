export type ComplianceIssue = {
  category: string;
  severity: "low" | "medium" | "high";
  excerpt: string;
  message: string;
  suggestion: string;
};

type CheckOptions = {
  advanced?: boolean;
  entry?: ContentEntry;
};

type ContentEntry = "wechat_article" | "green_note" | "search" | "question" | "moments";

const entryLabels: Record<ContentEntry, string> = {
  wechat_article: "公众号",
  green_note: "小绿书",
  search: "搜一搜",
  question: "问一问",
  moments: "朋友圈",
};

const basePatterns = [
  {
    pattern: /全网最|唯一|第一|最强|最稳|稳赚|暴富|保证|躺赚|百分百|100%/g,
    category: "夸大承诺",
    severity: "medium" as const,
    suggestion: "改成更克制、可验证的表达，例如“更适合”“有机会”“可以尝试”。",
  },
  {
    pattern: /转发后领取|分享后领取|强制关注|不转不是|拉人头/g,
    category: "诱导行为",
    severity: "medium" as const,
    suggestion: "避免把转发、关注作为强制条件，改成自然收藏、评论或私信引导。",
  },
  {
    pattern: /治疗|疗效|治愈|投资收益|保本|贷款包过|诊断|处方/g,
    category: "高风险行业表达",
    severity: "high" as const,
    suggestion: "医疗、金融、教育等方向要避免结果承诺，必要时增加资质、风险和免责声明。",
  },
];

const aiSmellPatterns = [
  /作为一名AI|作为一个语言模型|综上所述|总而言之|在当今时代|不可否认的是/g,
  /赋能|闭环|抓手|矩阵化|降本增效|私域流量池/g,
];

function countOccurrences(text: string, keyword: string) {
  if (!keyword.trim()) {
    return 0;
  }

  return text.split(keyword).length - 1;
}

function pushPatternIssues(issues: ComplianceIssue[], text: string) {
  for (const item of basePatterns) {
    const matches = text.match(item.pattern) || [];

    for (const match of matches.slice(0, 5)) {
      issues.push({
        category: item.category,
        severity: item.severity,
        excerpt: match,
        message: `发现可能存在风险的表达: “${match}”。`,
        suggestion: item.suggestion,
      });
    }
  }
}

function pushAdvancedIssues(issues: ComplianceIssue[], input: { title?: string; content: string }) {
  const title = input.title?.trim() || "";
  const content = input.content.trim();

  if (title.length > 32) {
    issues.push({
      category: "标题风险",
      severity: "low",
      excerpt: title,
      message: "标题偏长，可能影响公众号列表页和搜一搜结果中的完整展示。",
      suggestion: "尽量把标题压缩到 18-28 个中文字符，并保留核心关键词。",
    });
  }

  for (const pattern of aiSmellPatterns) {
    const matches = content.match(pattern) || [];

    for (const match of matches.slice(0, 4)) {
      issues.push({
        category: "AI 味",
        severity: "low",
        excerpt: match,
        message: `这类表达容易显得模板化: “${match}”。`,
        suggestion: "替换成更具体的场景、真实经历、数据或读者问题。",
      });
    }
  }

  const titleKeyword = title.replace(/[，。！？、\s]/g, "").slice(0, 8);

  if (titleKeyword && countOccurrences(content, titleKeyword) >= 6) {
    issues.push({
      category: "搜索优化",
      severity: "medium",
      excerpt: titleKeyword,
      message: "核心词出现频率偏高，可能显得关键词堆砌。",
      suggestion: "保留标题、开头、一个小标题和结尾中的自然出现即可。",
    });
  }

  if (!/(私信|评论|收藏|关注|回复|领取|咨询|保存)/.test(content)) {
    issues.push({
      category: "转化 CTA",
      severity: "low",
      excerpt: "",
      message: "正文缺少明确但自然的下一步行动。",
      suggestion: "可以补一个低压力 CTA，例如收藏清单、评论问题、私信关键词或继续阅读。",
    });
  }
}

function pushEntryRuleIssues(issues: ComplianceIssue[], input: { title?: string; content: string }, entry?: ContentEntry) {
  if (!entry) {
    return;
  }

  const title = input.title?.trim() || "";
  const content = input.content.trim();

  if (entry === "wechat_article" && content.length < 800) {
    issues.push({
      category: "入口规则检查",
      severity: "low",
      excerpt: content.slice(0, 40),
      message: "公众号长文内容偏短，可能不足以支撑完整论证和搜一搜收录。",
      suggestion: "补充问题背景、步骤拆解、案例、常见误区和自然 CTA，让文章更像完整公众号正文。",
    });
  }

  if (entry === "green_note") {
    if (content.length > 1000) {
      issues.push({
        category: "入口规则检查",
        severity: "medium",
        excerpt: content.slice(0, 40),
        message: "小绿书文案超过 1000 字，手机图文阅读压力较大。",
        suggestion: "拆成 3/6/9 页脚本，每页只保留一个观点，把长解释放回公众号正文。",
      });
    }

    if (!/(第\s*\d+\s*页|封面|图片提示词|图文|3:4)/.test(content)) {
      issues.push({
        category: "入口规则检查",
        severity: "low",
        excerpt: "",
        message: "小绿书内容缺少明显的分页脚本或图片提示词结构。",
        suggestion: "补充封面页、观点页、结尾行动页，并为每页准备图片提示词。",
      });
    }
  }

  if (entry === "search" && !/(关键词|长尾词|搜索|搜一搜|摘要|标题)/.test(`${title}\n${content}`)) {
    issues.push({
      category: "入口规则检查",
      severity: "medium",
      excerpt: title,
      message: "搜一搜版本缺少关键词、摘要或搜索型标题信号。",
      suggestion: "明确主关键词、长尾词、搜索型标题和摘要前 100 字，避免只写普通正文。",
    });
  }

  if (entry === "question") {
    if (content.length > 1200) {
      issues.push({
        category: "入口规则检查",
        severity: "low",
        excerpt: content.slice(0, 40),
        message: "问一问回答偏长，可能不适合快速阅读和互动。",
        suggestion: "先直接回答，再用 2-4 个要点解释，最后自然引导关注或阅读完整文章。",
      });
    }

    if (!/(建议|可以|先|第一|直接回答|关注|完整文章)/.test(content)) {
      issues.push({
        category: "入口规则检查",
        severity: "low",
        excerpt: "",
        message: "问一问回答缺少清晰行动建议或关注引导。",
        suggestion: "开头先给结论，结尾补一个低压力关注或延伸阅读引导。",
      });
    }
  }

  if (entry === "moments") {
    if (content.length > 500) {
      issues.push({
        category: "入口规则检查",
        severity: "medium",
        excerpt: content.slice(0, 40),
        message: "朋友圈文案过长，容易不像自然转发。",
        suggestion: "压缩到 80-200 字，用个人观察开头，再自然说明为什么推荐这篇内容。",
      });
    }

    if (/(本文|本篇文章|读者朋友|综上所述|首先|其次|最后)/.test(content)) {
      issues.push({
        category: "入口规则检查",
        severity: "low",
        excerpt: "",
        message: "朋友圈文案有偏公众号正文的书面表达。",
        suggestion: "改成更像个人口吻的转发理由，减少正式小标题和总结腔。",
      });
    }
  }
}

export function checkContentCompliance(input: { title?: string; content: string }, options: CheckOptions = {}) {
  const issues: ComplianceIssue[] = [];
  const text = `${input.title || ""}\n${input.content}`;

  pushPatternIssues(issues, text);
  pushEntryRuleIssues(issues, input, options.entry);

  if ((!options.entry || options.entry === "wechat_article") && input.content.trim().length < 300) {
    issues.push({
      category: "内容完整度",
      severity: "low",
      excerpt: input.content.slice(0, 40),
      message: "正文较短，可能不足以支撑公众号长文发布。",
      suggestion: "可以补充案例、步骤、读者常见问题或结尾行动建议。",
    });
  }

  if (options.advanced) {
    pushAdvancedIssues(issues, input);
  }

  const score = Math.max(
    40,
    100 - issues.reduce((sum, issue) => sum + (issue.severity === "high" ? 25 : issue.severity === "medium" ? 15 : 8), 0),
  );
  const level = score >= 85 ? "可发布" : score >= 65 ? "建议修改" : "高风险";

  return {
    score,
    level,
    mode: options.advanced ? "advanced" : "basic",
    entry: options.entry ? entryLabels[options.entry] : undefined,
    summary: issues.length
      ? "发现一些发布前建议修改的问题。排版猫只提供辅助检查，不保证平台审核结果。"
      : "未发现明显风险，仍建议人工复核重点表述和行业合规边界。",
    issues,
  };
}
