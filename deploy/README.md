# 洛杉矶服务器部署

生产环境采用以下流程：本地提交并推送到 GitHub，服务器再从 `origin/main` 快进同步并构建。博客、Artalk 和现有 API 共用 `/opt/ropgod-api` 的 Caddy 与 `web` Docker 网络。

## 首次安装

```bash
git clone https://github.com/R0PG0D0/my-blog.git /var/www/ropgod-site
mkdir -p /opt/ropgod-blog/{artalk-data,releases,npm-cache}
cd /var/www/ropgod-site
bash deploy/deploy-server.sh
```

Caddy 需要包含以下站点：

```caddyfile
http://ropgod.site, http://www.ropgod.site, http://comment.ropgod.site {
    redir https://{host}{uri} permanent
}

https://ropgod.site {
    redir https://www.ropgod.site{uri} permanent
}

https://www.ropgod.site {
    reverse_proxy blog:3000
}

https://comment.ropgod.site {
    reverse_proxy artalk:23366
}
```

## 日常发布

本地执行 `git push origin main` 后，在服务器运行：

```bash
cd /var/www/ropgod-site
bash deploy/deploy-server.sh
```

脚本只接受干净的服务器工作区和可快进更新；构建或健康检查失败时会自动切回上一个运行版本。Artalk 数据保存在 `/opt/ropgod-blog/artalk-data`，不会被代码发布覆盖。
