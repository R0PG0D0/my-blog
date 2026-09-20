#!/usr/bin/env bash
set -Eeuo pipefail

SITE_DIR="${SITE_DIR:-/var/www/ropgod-site}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/ropgod-blog}"
STACK_DIR="${STACK_DIR:-/opt/ropgod-api}"
COMPOSE=(docker compose -f "$STACK_DIR/compose.yml" -f "$SITE_DIR/deploy/compose.blog.yml")
RELEASE_ID="$(date +%Y%m%d-%H%M%S)"
RELEASE_DIR="$DEPLOY_ROOT/releases/$RELEASE_ID"
CURRENT_LINK="$DEPLOY_ROOT/current"
PREVIOUS_TARGET=""

if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK")"
fi

rollback() {
  if [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
    ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
    "${COMPOSE[@]}" up -d --force-recreate blog
  fi
}

cd "$SITE_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing to deploy: $SITE_DIR has uncommitted changes." >&2
  exit 1
fi

echo "[1/6] Fetching origin/main"
git fetch --prune origin main
git merge --ff-only origin/main

echo "[2/6] Building Next.js"
mkdir -p "$DEPLOY_ROOT/npm-cache" "$DEPLOY_ROOT/releases"
docker run --rm \
  --memory=1400m \
  --memory-swap=2g \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e NEXT_PUBLIC_ARTALK_SERVER=https://comment.ropgod.site \
  -e NEXT_PUBLIC_ARTALK_SITE=ropgod.site \
  -v "$SITE_DIR:/app" \
  -v "$DEPLOY_ROOT/npm-cache:/root/.npm" \
  -w /app \
  node:22-alpine \
  sh -lc 'npm ci && npm run build'

echo "[3/6] Assembling release $RELEASE_ID"
test -f .next/standalone/server.js
mkdir -p "$RELEASE_DIR/.next"
cp -a .next/standalone/. "$RELEASE_DIR/"
cp -a .next/static "$RELEASE_DIR/.next/static"
cp -a public "$RELEASE_DIR/public"

echo "[4/6] Activating release"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

if ! "${COMPOSE[@]}" up -d --force-recreate blog artalk; then
  rollback
  exit 1
fi

echo "[5/6] Checking the application from the reverse proxy"
healthy=0
for _ in $(seq 1 30); do
  if docker exec ropgod-api-caddy wget -q -T 5 -O /dev/null http://blog:3000/; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "$healthy" -ne 1 ]]; then
  echo "Health check failed; rolling back." >&2
  rollback
  exit 1
fi

echo "[6/6] Deployment complete"
echo "Commit: $(git rev-parse --short HEAD)"
echo "Release: $RELEASE_DIR"

