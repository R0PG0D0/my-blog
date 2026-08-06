export type MarkdownHeading = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

function cleanHeadingText(value: string) {
  return value
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

export function getMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  let inCodeFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) continue;

    const match = line.match(/^\s*(#{1,3})\s+(.+?)\s*$/);
    if (!match) continue;

    const text = cleanHeadingText(match[2]);
    if (!text) continue;

    headings.push({
      id: `article-heading-${headings.length}`,
      text,
      level: match[1].length as 1 | 2 | 3,
    });
  }

  return headings;
}
