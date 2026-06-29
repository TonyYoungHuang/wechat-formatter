import { PlaceholderPage } from "@/components/app/placeholder-page";

export default function ProjectsPage() {
  return (
    <PlaceholderPage
      title="内容项目"
      description="一个内容项目保存同一选题下的五入口内容、检查报告和发布复盘。"
      items={["五入口内容版本", "编辑历史", "发布链接", "阅读/互动/咨询数据手动记录"]}
    />
  );
}

