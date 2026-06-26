import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, posts } from "@/components/blogContent";
import ArtalkComments from "@/components/ArtalkComments";
import ProfileCard from "@/components/ProfileCard";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return posts.map((post) => ({
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

  if (!post) {
    notFound();
  }

  return (
    <main className="post-page">
      <div className="post-page-background" aria-hidden="true">
        <img src={post.image} alt="" />
      </div>

      <header className="post-page-header">
        <Link href="/#writing">← 返回文章列表</Link>
        <span>ROPGOD JOURNAL</span>
      </header>

      <div className="post-page-layout">
        <article className="post-detail-card">
          <div className="post-date-badge">
            <span aria-hidden="true">▣</span>
            <time>{post.archiveDate ?? post.date}</time>
          </div>

          <div className="post-detail-divider" aria-hidden="true" />

          <div className="post-detail-meta">
            <span>{post.categoryLabel}</span>
            <span>{post.wordCount}</span>
            <span>{post.readTime}</span>
          </div>

          <h1>
            <span aria-hidden="true">#</span>
            {post.title}
          </h1>

          <p className="post-detail-excerpt">{post.excerpt}</p>

          <div className="post-detail-body">
            {post.content.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <ArtalkComments pageKey={`/posts/${post.slug}`} pageTitle={post.title} />
        </article>

        <aside className="post-detail-sidebar">
          <ProfileCard variant="dark" />
        </aside>
      </div>
    </main>
  );
}
