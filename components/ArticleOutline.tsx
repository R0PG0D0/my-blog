"use client";

import { useEffect, useState } from "react";
import type { MarkdownHeading } from "@/lib/markdownHeadings";

type ArticleOutlineProps = {
  headings: MarkdownHeading[];
};

export default function ArticleOutline({ headings }: ArticleOutlineProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -72%", threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav className="article-outline" aria-label="文章大纲">
      <div className="article-outline-heading">
        <span>大纲</span>
        <small>{headings.length} 个标题</small>
      </div>

      <ol>
        {headings.map((heading) => (
          <li
            className={`outline-level-${heading.level}${activeId === heading.id ? " is-active" : ""}`}
            key={heading.id}
          >
            <a href={`#${heading.id}`} onClick={() => setActiveId(heading.id)}>
              <span aria-hidden="true" />
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
