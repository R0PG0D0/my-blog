import { createElement, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import MarkdownCodeBlock from "./MarkdownCodeBlock";

type MarkdownArticleProps = {
  content: string;
};

type CodeElementProps = {
  className?: string;
  children?: ReactNode;
};

export default function MarkdownArticle({ content }: MarkdownArticleProps) {
  let headingIndex = 0;
  const createHeading = (tag: "h1" | "h2" | "h3"): NonNullable<Components["h1"]> =>
    function MarkdownHeading({ node: _node, children, ...props }) {
      const id = `article-heading-${headingIndex++}`;
      return createElement(tag, { ...props, id }, children);
    };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: createHeading("h1"),
        h2: createHeading("h2"),
        h3: createHeading("h3"),
        pre({ children }) {
          if (!isValidElement<CodeElementProps>(children)) return <pre>{children}</pre>;

          const className = children.props.className ?? "";
          const language = className.match(/language-([\w-]+)/)?.[1] ?? "plaintext";
          const code = String(children.props.children ?? "");

          return <MarkdownCodeBlock code={code} language={language} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
