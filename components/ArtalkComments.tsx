"use client";

import { useEffect, useRef, useState } from "react";

type ArtalkCommentsProps = {
  pageKey: string;
  pageTitle: string;
};

const artalkServer = process.env.NEXT_PUBLIC_ARTALK_SERVER;
const artalkSite = process.env.NEXT_PUBLIC_ARTALK_SITE || "ropgod.site";

export default function ArtalkComments({ pageKey, pageTitle }: ArtalkCommentsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!containerRef.current || !artalkServer) {
      return;
    }

    let artalk: { destroy: () => void; setDarkMode: (darkMode: boolean) => void } | null =
      null;
    let isMounted = true;

    const loadArtalk = async () => {
      try {
        const module = await import("artalk");

        if (!isMounted || !containerRef.current) {
          return;
        }

        artalk = module.default.init({
          el: containerRef.current,
          pageKey,
          pageTitle,
          server: artalkServer,
          site: artalkSite,
          placeholder: "留下你的想法，或者补充一条新的攻击思路。",
          noComment: "暂时还没有评论，来留下第一条记录吧。",
          sendBtn: "发布评论",
        });

        artalk.setDarkMode(true);
      } catch {
        if (isMounted) {
          setLoadError("评论组件加载失败，请确认 Artalk 服务地址和网络连接。");
        }
      }
    };

    loadArtalk();

    return () => {
      isMounted = false;
      artalk?.destroy();
    };
  }, [pageKey, pageTitle]);

  return (
    <section className="comments-card" aria-label="文章评论">
      <div className="comments-heading">
        <span>COMMENTS</span>
        <h2>评论区</h2>
        <p>欢迎补充思路、复盘细节，或者指出文章里可以继续深入的地方。</p>
      </div>

      {artalkServer ? (
        <>
          <div ref={containerRef} className="artalk-comments" />
          {loadError && (
            <div className="comments-empty comments-error">
              <strong>评论区暂时没有加载成功</strong>
              <p>{loadError}</p>
            </div>
          )}
        </>
      ) : (
        <div className="comments-empty">
          <strong>Artalk 评论服务还没有配置</strong>
          <p>
            在项目根目录创建 <code>.env.local</code>，写入{" "}
            <code>NEXT_PUBLIC_ARTALK_SERVER=http://你的评论服务地址</code>，
            然后重启 <code>npm run dev</code> 即可启用真实评论。
          </p>
        </div>
      )}
    </section>
  );
}
