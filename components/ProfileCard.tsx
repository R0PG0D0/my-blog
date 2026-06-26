"use client";

import Link from "next/link";
import { useState } from "react";
import { posts } from "./blogContent";
import ContactModal from "./ContactModal";

type ProfileCardProps = {
  variant?: "light" | "dark";
};

export default function ProfileCard({ variant = "light" }: ProfileCardProps) {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <>
      <section
        className={`profile-panel ${variant === "dark" ? "profile-panel-dark" : ""}`}
        aria-label="站点信息"
      >
        <div className="profile-avatar">
          <img src="/avatar-boy.png" alt="ROPGOD 头像" />
        </div>

        <h3>ROPGOD</h3>

        <div className="profile-count" aria-label="文章数量">
          <span>文章</span>
          <strong>{posts.length}</strong>
        </div>

        <div className="profile-socials" aria-label="社交链接">
          <a
            href="https://github.com/R0PG0D0"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.11.79-.25.79-.56v-2.15c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.16 1.18A10.9 10.9 0 0 1 12 6.06c.98 0 1.95.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.42-2.69 5.38-5.25 5.67.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
            </svg>
          </a>
          <a
            href="https://space.bilibili.com/3546719652416020?spm_id_from=333.1387.0.0"
            target="_blank"
            rel="noreferrer"
            aria-label="Bilibili"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.63 3.55a.9.9 0 0 1 1.28 0L12 5.65l2.09-2.1a.9.9 0 1 1 1.27 1.28l-1.2 1.2h2.47c2.24 0 4.06 1.82 4.06 4.06v5.3c0 2.24-1.82 4.06-4.06 4.06H7.37a4.06 4.06 0 0 1-4.06-4.06v-5.3c0-2.24 1.82-4.06 4.06-4.06h2.47l-1.2-1.2a.9.9 0 0 1 0-1.28Zm-1.26 4.3a2.25 2.25 0 0 0-2.25 2.24v5.3a2.25 2.25 0 0 0 2.25 2.25h9.26a2.25 2.25 0 0 0 2.25-2.25v-5.3a2.25 2.25 0 0 0-2.25-2.25H7.37Zm1.63 3.07c.5 0 .9.4.9.9v1.72a.9.9 0 1 1-1.8 0v-1.72c0-.5.4-.9.9-.9Zm6 0c.5 0 .9.4.9.9v1.72a.9.9 0 1 1-1.8 0v-1.72c0-.5.4-.9.9-.9Zm-4.8 4.42h3.6a.82.82 0 0 1 0 1.64h-3.6a.82.82 0 0 1 0-1.64Z" />
            </svg>
          </a>
        </div>

        <div className="profile-links">
          <Link href="/">首页</Link>
          <Link href="/archive/2026/06">归档</Link>
          <button type="button" onClick={() => setIsContactOpen(true)}>
            联系
          </button>
        </div>
      </section>

      {isContactOpen && <ContactModal onClose={() => setIsContactOpen(false)} />}
    </>
  );
}
