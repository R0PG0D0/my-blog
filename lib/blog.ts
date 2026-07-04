import "server-only";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { blogCategories, findBlogCategory } from "@/components/blogContent";

const BLOG_ROOT = path.join(process.cwd(), "content", "blog");
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  dateISO: string;
  date: string;
  archiveDate: string;
  category: string;
  subcategory: string;
  categoryPath: string;
  categoryLabel: string;
  subcategoryLabel: string;
  wordCount: string;
  image: string;
  heroImage: string;
};

export type BlogPost = BlogPostSummary & {
  content: string;
  sourcePath: string;
};

function getMarkdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getMarkdownFiles(entryPath);
    return entry.isFile() && /\.md$/i.test(entry.name) ? [entryPath] : [];
  });
}

function formatDates(dateISO: string) {
  const match = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`文章日期必须使用 YYYY-MM-DD 格式：${dateISO}`);

  const [, year, monthValue, dayValue] = match;
  const month = Number(monthValue);
  const day = Number(dayValue);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`文章日期无效：${dateISO}`);
  }

  return {
    date: `${MONTHS[month - 1]} ${String(day).padStart(2, "0")}, ${year}`,
    archiveDate: `${year}年${month}月${day}日`,
  };
}

function countWords(markdown: string) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]/g, " ");
  const chineseCharacters = plainText.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinWords = plainText.match(/[A-Za-z0-9]+(?:[-_.][A-Za-z0-9]+)*/g)?.length ?? 0;
  return chineseCharacters + latinWords;
}

function createExcerpt(markdown: string) {
  const paragraph = markdown
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .find((part) => part && !part.startsWith("#") && !part.startsWith("```"));

  return (paragraph ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#-]/g, "")
    .trim()
    .slice(0, 140);
}

function readPost(filePath: string): BlogPost | null {
  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);
  if (data.draft === true) return null;

  const fileSlug = path.basename(filePath, path.extname(filePath));
  const slug = String(data.slug ?? fileSlug).trim();
  const title = String(data.title ?? "").trim();
  const dateISO = String(data.date ?? "").trim();
  const excerpt = String(data.excerpt ?? createExcerpt(content)).trim();
  const category = String(data.category ?? "").trim();
  const subcategory = String(data.subcategory ?? "").trim();
  const categorySlugs = [category, ...subcategory.split("/").filter(Boolean)];
  const categoryConfig = blogCategories.find((item) => item.slug === category);
  const subcategoryConfig = findBlogCategory(categorySlugs);

  if (!slug || !title || !dateISO || !category || !subcategory) {
    throw new Error(`文章 frontmatter 缺少必填字段：${path.relative(process.cwd(), filePath)}`);
  }
  if (!categoryConfig || !subcategoryConfig) {
    throw new Error(`文章分类不存在：${categorySlugs.join("/")}（${filePath}）`);
  }

  const expectedDirectory = path.normalize(subcategoryConfig.path);
  const actualDirectory = path.normalize(
    path.relative(process.cwd(), path.dirname(filePath)).replaceAll("\\", "/"),
  );
  if (actualDirectory !== expectedDirectory) {
    throw new Error(
      `文章目录与 frontmatter 分类不一致：${actualDirectory}，应为 ${expectedDirectory}`,
    );
  }

  const formattedDate = formatDates(dateISO);

  return {
    slug,
    title,
    excerpt,
    dateISO,
    ...formattedDate,
    category,
    subcategory,
    categoryPath: categorySlugs.join("/"),
    categoryLabel: categoryConfig.title,
    subcategoryLabel: subcategoryConfig.title,
    wordCount: String(data.wordCount ?? `${countWords(content)} 字`),
    image: String(data.image ?? "/anime-melancholy.png"),
    heroImage: String(data.heroImage ?? "/微信图片_20260702094637_1119_2.png"),
    content: content.trim(),
    sourcePath: path.relative(process.cwd(), filePath).replaceAll("\\", "/"),
  };
}

export function getAllPosts(): BlogPost[] {
  const posts = getMarkdownFiles(BLOG_ROOT)
    .map(readPost)
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  const duplicateSlug = posts.find(
    (post, index) => posts.findIndex((item) => item.slug === post.slug) !== index,
  );
  if (duplicateSlug) throw new Error(`文章 slug 重复：${duplicateSlug.slug}`);

  return posts;
}

export function getAllPostSummaries(): BlogPostSummary[] {
  return getAllPosts().map(({ content: _content, sourcePath: _sourcePath, ...summary }) => summary);
}

export function getPostBySlug(slug: string) {
  return getAllPosts().find((post) => post.slug === slug);
}
