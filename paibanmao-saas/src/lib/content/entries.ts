export type ContentEntry = "wechat_article" | "green_note" | "search" | "question" | "moments";

export const contentEntries: Array<{
  id: ContentEntry;
  label: string;
  summary: string;
}> = [
  {
    id: "wechat_article",
    label: "公众号",
    summary: "长文框架、正文草稿、标题摘要、结尾 CTA 和公众号 HTML。",
  },
  {
    id: "green_note",
    label: "小绿书",
    summary: "短图文文案、图片页脚本、封面文案和图片提示词。",
  },
  {
    id: "search",
    label: "搜一搜",
    summary: "关键词、搜索型标题、摘要优化和问答结构。",
  },
  {
    id: "question",
    label: "问一问",
    summary: "相关问题、回答草稿、讨论话术和关注引导。",
  },
  {
    id: "moments",
    label: "朋友圈",
    summary: "转发理由、个人视角文案、互动话术和私域 CTA。",
  },
];
