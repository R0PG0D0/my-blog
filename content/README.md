# 博客文章维护说明

真实文章统一存放在 `content/blog/一级分类/二级分类/` 中，目录映射定义在
`components/blogContent.ts`。

新文章可以复制下面的 frontmatter，并将正文写在第二个 `---` 之后：

```md
---
title: "文章标题"
slug: "unique-english-slug"
date: "2026-07-01"
excerpt: "用于首页文章卡片和 SEO 的简短摘要。"
category: "iot-security"
subcategory: "firmware-analysis"
image: "/images/article-cover.png"
heroImage: "/images/article-hero.png"
wordCount: "可选；不填写会自动统计"
draft: false
---

# 正文标题

这里开始写 Markdown 正文。
```

- `category` 与 `subcategory` 必须和文章所在目录匹配。
- `slug` 必须全站唯一，只使用英文小写、数字和短横线。
- `date` 必须使用 `YYYY-MM-DD`。
- 封面图和本地正文图片建议放进 `public/images/`，Markdown 中使用
  `/images/文件名.png`。
- `image` 只用于首页文章卡片，`heroImage` 只用于文章详情页顶部背景。
- `draft: true` 的文章不会显示，也不会生成文章页面。
