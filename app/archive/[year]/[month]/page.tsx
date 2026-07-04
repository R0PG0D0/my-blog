import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArchiveMonthLabel,
  getAvailableArchiveMonths,
  isPostInArchiveMonth,
} from "@/components/archiveUtils";
import { getAllPostSummaries } from "@/lib/blog";

export const dynamic = "force-dynamic";

type ArchivePageProps = {
  params: Promise<{ year: string; month: string }>;
};

async function getArchive(params: ArchivePageProps["params"]) {
  const { year: yearValue, month: monthValue } = await params;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const href = `/archive/${year}/${String(month).padStart(2, "0")}`;
  const isAvailable = getAvailableArchiveMonths().some(
    (archiveMonth) => archiveMonth.href === href,
  );

  if (!Number.isInteger(year) || month < 1 || month > 12 || !isAvailable) {
    notFound();
  }

  return { year, month };
}

export async function generateMetadata({ params }: ArchivePageProps): Promise<Metadata> {
  const { year, month } = await getArchive(params);
  return { title: `${getArchiveMonthLabel(year, month)} / ROPGOD JOURNAL` };
}

export default async function ArchivePage({ params }: ArchivePageProps) {
  const { year, month } = await getArchive(params);
  const archivePosts = getAllPostSummaries().filter((post) =>
    isPostInArchiveMonth(post, year, month),
  );

  return (
    <main className="archive-page">
      <header className="archive-page-header">
        <Link href="/">← 返回首页</Link>
        <span>ROPGOD JOURNAL</span>
      </header>

      <section className="archive-page-content">
        <p>文章归档</p>
        <h1>{getArchiveMonthLabel(year, month)}</h1>

        <div className="archive-page-list">
          {archivePosts.map((post) => (
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

          {archivePosts.length === 0 && (
            <p className="empty-state">本月暂无文章。</p>
          )}
        </div>
      </section>
    </main>
  );
}
