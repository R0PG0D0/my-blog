"use client";

import { useState } from "react";

type MarkdownCodeBlockProps = {
  code: string;
  language?: string;
};

export default function MarkdownCodeBlock({
  code,
  language = "plaintext",
}: MarkdownCodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const lines = code.replace(/\n$/, "").split("\n");
  const normalizedLanguage = language.trim().toLowerCase();
  const languageLabel = ["", "plain", "text", "txt", "plaintext"].includes(
    normalizedLanguage,
  )
    ? "PLAINTEXT"
    : normalizedLanguage.toUpperCase();

  const copyCode = async () => {
    await navigator.clipboard.writeText(code.replace(/\n$/, ""));
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className={`markdown-code-block ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="markdown-code-header">
        <div className="markdown-code-title">
          <span className="markdown-code-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{languageLabel}</span>
        </div>

        <div className="markdown-code-actions">
          <button
            type="button"
            onClick={copyCode}
            aria-label={isCopied ? "代码已复制" : "复制代码"}
            title={isCopied ? "已复制" : "复制代码"}
          >
            {isCopied ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m5 12 4 4L19 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="9" width="10" height="11" rx="2" />
                <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="markdown-code-toggle"
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "展开代码" : "折叠代码"}
            title={isCollapsed ? "展开代码" : "折叠代码"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="markdown-code-body">
          <code>
            {lines.map((line, index) => (
              <span className="markdown-code-line" key={`${index}-${line}`}>
                <span className="markdown-code-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="markdown-code-text">{line || " "}</span>
              </span>
            ))}
          </code>
        </div>
      )}
    </div>
  );
}
