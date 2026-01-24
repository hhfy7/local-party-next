#!/bin/bash
# Docker 构建脚本 - 支持版本信息注入

# 获取 Git 信息
GIT_COMMIT_HASH=$(git rev-parse --short HEAD)
GIT_COMMIT_MESSAGE=$(git log -1 --pretty=%B | head -1)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_HAS_CHANGES=$(git status --porcelain | wc -l)

# 转换为布尔值
if [ "$GIT_HAS_CHANGES" -gt 0 ]; then
    GIT_HAS_CHANGES="true"
else
    GIT_HAS_CHANGES="false"
fi

echo "=== Docker 构建信息 ==="
echo "提交哈希: $GIT_COMMIT_HASH"
echo "提交信息: $GIT_COMMIT_MESSAGE"
echo "分支: $GIT_BRANCH"
echo "有更改: $GIT_HAS_CHANGES"
echo "======================"

# 构建 Docker 镜像
docker build \
  --build-arg GIT_COMMIT_HASH="$GIT_COMMIT_HASH" \
  --build-arg GIT_COMMIT_MESSAGE="$GIT_COMMIT_MESSAGE" \
  --build-arg GIT_BRANCH="$GIT_BRANCH" \
  --build-arg GIT_HAS_CHANGES="$GIT_HAS_CHANGES" \
  -t local-party-next:latest \
  .