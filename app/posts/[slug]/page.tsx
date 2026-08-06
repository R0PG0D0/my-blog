import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSummaries, getPostBySlug } from "@/lib/blog";
import ArtalkComments from "@/components/ArtalkComments";
import ArticleOutline from "@/components/ArticleOutline";
import MarkdownArticle from "@/components/MarkdownArticle";
import ProfileCard from "@/components/ProfileCard";
import { getMarkdownHeadings } from "@/lib/markdownHeadings";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getAllPostSummaries().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "文章不存在 / ropgod",
    };
  }

  return {
    title: `${post.title} / ropgod`,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const postCount = getAllPostSummaries().length;

  if (!post) {
    notFound();
  }

  const headings = getMarkdownHeadings(post.content);

  return (
    <main className="post-page">
      <section
        className="post-page-hero"
        aria-labelledby="post-hero-title"
      >
        <img
          className="post-hero-image"
          src={post.heroImage}
          alt=""
          aria-hidden="true"
        />

        <header className="post-page-header">
          <Link href="/#writing">← 返回文章列表</Link>
          <span>ROPGOD JOURNAL</span>
        </header>

        <div className="post-hero-content">
          <h1 id="post-hero-title">{post.title}</h1>
        </div>
      </section>

      <div className="post-page-layout">
        <aside className="post-profile-sidebar">
          <ProfileCard variant="dark" postCount={postCount} />
        </aside>

        <article className="post-detail-card" data-post-slug={post.slug}>
          <div className="post-date-badge">
            <span aria-hidden="true">▣</span>
            <time>{post.archiveDate ?? post.date}</time>
          </div>

          <div className="post-detail-divider" aria-hidden="true" />

          <div className="post-detail-meta">
            <span>{post.categoryLabel}</span>
            <span>{post.wordCount}</span>
          </div>

          <h2 className="post-content-title">
            <span aria-hidden="true">#</span>
            {post.title}
          </h2>

          <p className="post-detail-excerpt">{post.excerpt}</p>

          <div className="post-detail-body">
            <MarkdownArticle content={post.content} />
          </div>

          <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
        </article>

        <aside className="post-outline-sidebar">
          <ArticleOutline headings={headings} />
        </aside>
      </div>
    </main>
  );
}
