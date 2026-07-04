import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
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
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
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
