import Link from "next/link";

const articles = [
  "小绿书是什么，适合公众号创作者怎么用？",
  "微信搜一搜关键词怎么布局到公众号文章里？",
  "问一问回答怎么自然引导关注公众号？",
  "一个选题如何拆成公众号、小绿书和朋友圈？",
];

export default function TutorialsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-12 sm:px-6">
      <Link className="text-sm text-emerald-700" href="/">
        返回首页
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">微信内容增长教程</h1>
      <p className="mt-3 text-slate-600">围绕公众号、小绿书、搜一搜、问一问和朋友圈的实操教程。</p>
      <div className="mt-8 grid gap-4">
        {articles.map((item) => (
          <article key={item} className="rounded-2xl border border-emerald-100 bg-white p-5">
            <h2 className="font-semibold text-slate-950">{item}</h2>
            <p className="mt-2 text-sm text-slate-600">教程正文后续接入内容系统，这里先建立 SEO 矩阵入口。</p>
          </article>
        ))}
      </div>
    </main>
  );
}

