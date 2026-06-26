import Link from "next/link";
import { posts } from "@/components/blogContent";

const junePosts = posts.filter(
  (post) => post.date.includes("JUN") && post.date.includes("2026"),
);

export default function JuneArchivePage() {
  return (
    <main className="archive-page">
      <header className="archive-page-header">
        <Link href="/">← 返回首页</Link>
        <span>ROPGOD JOURNAL</span>
      </header>

      <section className="archive-page-content">
        <p>文章归档</p>
        <h1>六月 2026</h1>

        <div className="archive-page-list">
          {junePosts.map((post) => (
            <article key={post.title}>
              <div>
                <span>{post.archiveDate ?? post.date}</span>
                <span>{post.categoryLabel}</span>
              </div>
              <h2>
                <Link href={`/posts/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
