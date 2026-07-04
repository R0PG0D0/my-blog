"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAvailableArchiveMonths } from "./archiveUtils";
import {
  categories,
  type CategoryFilter,
  type CategoryMenuItem,
} from "./blogContent";
import type { BlogPostSummary } from "@/lib/blog";
import ContactModal from "./ContactModal";
import ProfileCard from "./ProfileCard";

type HeroSectionProps = {
  posts: BlogPostSummary[];
};

export default function HeroSection({ posts }: HeroSectionProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [activeCategoryKey, setActiveCategoryKey] = useState("全部-0");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [archiveMonths, setArchiveMonths] = useState(() =>
    getAvailableArchiveMonths(),
  );

  useEffect(() => {
    const updateArchiveMonths = () => {
      setArchiveMonths(getAvailableArchiveMonths());
    };
    const timer = window.setInterval(updateArchiveMonths, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory =
        category === "all" ||
        post.categoryPath === category ||
        post.categoryPath.startsWith(`${category}/`);
      const matchesQuery =
        !normalizedQuery ||
        `${post.title} ${post.excerpt} ${post.categoryPath} ${post.categoryLabel} ${post.subcategoryLabel}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const handleCategorySelect = (value: CategoryFilter, activeKey: string) => {
    setCategory(value);
    setActiveCategoryKey(activeKey);
    setQuery("");

    window.requestAnimationFrame(() => {
      document
        .getElementById("writing")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const renderCategoryItem = (
    item: CategoryMenuItem,
    path: string,
    depth = 0,
  ) => {
    const hasChildren = Boolean(item.children?.length);
    const isActive = activeCategoryKey === path;

    return (
      <div
        className={`category-item ${hasChildren ? "has-submenu" : ""}`}
        key={path}
      >
        {item.href ? (
          <a className="category-trigger" href={item.href}>
            {item.label}
            {hasChildren && <span aria-hidden="true">›</span>}
          </a>
        ) : (
          <button
            type="button"
            className={`category-trigger ${isActive ? "is-active" : ""}`}
            onClick={() => item.value && handleCategorySelect(item.value, path)}
            aria-pressed={isActive}
          >
            {item.label}
            {hasChildren && <span aria-hidden="true">›</span>}
          </button>
        )}

        {hasChildren && (
          <div
            className={`category-submenu ${
              depth > 0 ? "category-submenu-nested" : ""
            }`}
          >
            {item.children?.map((child, index) =>
              renderCategoryItem(child, `${path}-${index}`, depth + 1),
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="blog-page">
      <div className="blog-background" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto">
          <source src="/Kuroha.mp4" type="video/mp4" />
        </video>
        <div className="blog-grade" />
        <div className="blog-vignette" />
        <div className="noise-layer" />
      </div>

      <header className="blog-header">
        <div className="header-main">
          <a href="#home" className="blog-name">
            ROPGOD<span>—</span>JOURNAL
          </a>
          <nav aria-label="主导航">
            <a href="#home">首页</a>
            <a href="#writing">文章</a>
            <button type="button" onClick={() => setIsContactOpen(true)}>
              联系
            </button>
          </nav>
        </div>

        <div className="header-tools">
          <div className="category-filter" aria-label="文章分类">
            {categories.map((item, index) =>
              renderCategoryItem(item, `${item.label}-${index}`),
            )}
          </div>

          <label className="search-field">
            <span className="sr-only">搜索文章</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索文章"
            />
          </label>
        </div>
      </header>

      <main id="home" className="blog-content">
        <section className="blog-intro">
          <div className="intro-message">
            <h2>
              Break systems.
              <br />
              <em>Build knowledge.</em>
            </h2>
          </div>
        </section>

        <section id="writing" className="writing-section">
          <div className="writing-layout">
            <aside className="writing-sidebar">
              <ProfileCard postCount={posts.length} />

              <section id="archive" className="archive-card" aria-label="文章归档">
                <h3>归档</h3>
                {archiveMonths.map((archiveMonth) => (
                  <Link href={archiveMonth.href} key={archiveMonth.href}>
                    <i aria-hidden="true" />
                    <span>{archiveMonth.label}</span>
                    <b aria-hidden="true">→</b>
                  </Link>
                ))}
              </section>

              <section className="latest-card" aria-label="最新文章">
                <h3>最新文章</h3>
                <ul>
                  {posts.slice(0, 4).map((post, index) => (
                    <li key={post.title}>
                      <Link href={`/posts/${post.slug}`}>
                        <i aria-hidden="true" />
                        <span>{post.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </aside>

            <div className="post-list" aria-live="polite">
              {filteredPosts.map((post, index) => (
                <Link
                  href={`/posts/${post.slug}`}
                  id={`post-${
                    posts.findIndex((item) => item.title === post.title) + 1
                  }`}
                  className={`post-card ${
                    index % 2 === 1 ? "post-card-reverse" : ""
                  }`}
                  key={post.title}
                >
                  <div className="post-image">
                    <img src={post.image} alt="" />
                  </div>
                  <div className="post-body">
                    <div className="post-meta">
                      <span>▣ {post.date}</span>
                      <span>✒ {post.wordCount}</span>
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                  </div>
                </Link>
              ))}

              {filteredPosts.length === 0 && (
                <p className="empty-state">当前分类还没有文章，之后可以继续补充。</p>
              )}
            </div>
          </div>
        </section>
      </main>

      {isContactOpen && <ContactModal onClose={() => setIsContactOpen(false)} />}
    </section>
  );
}
