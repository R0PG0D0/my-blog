"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { categories, posts, type CategoryFilter } from "./blogContent";
import ContactModal from "./ContactModal";
import ProfileCard from "./ProfileCard";

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [isContactOpen, setIsContactOpen] = useState(false);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesCategory = category === "ALL" || post.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${post.title} ${post.excerpt} ${post.category} ${post.categoryLabel}`
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const handleCategorySelect = (value: CategoryFilter) => {
    setCategory(value);
    setQuery("");

    window.requestAnimationFrame(() => {
      document
        .getElementById("writing")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
            {categories.map((item) => (
              <button
                key={item.value}
                type="button"
                className={category === item.value ? "is-active" : ""}
                onClick={() => handleCategorySelect(item.value)}
                aria-pressed={category === item.value}
              >
                {item.label}
              </button>
            ))}
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
              <ProfileCard />

              <section className="archive-card" aria-label="文章归档">
                <h3>归档</h3>
                <a href="/archive/2026/06">
                  <i aria-hidden="true" />
                  <span>六月 2026</span>
                  <b aria-hidden="true">→</b>
                </a>
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
                      <span>⌛ {post.readTime}</span>
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
