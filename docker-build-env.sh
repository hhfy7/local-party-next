# Docker 构建时的环境变量支持
# 在 Dockerfile 中使用这些变量来传递 Git 信息

# Git 提交信息
GIT_COMMIT_HASH=${GIT_COMMIT_HASH:-unknown}
GIT_COMMIT_MESSAGE=${GIT_COMMIT_MESSAGE:-unknown}
GIT_BRANCH=${GIT_BRANCH:-unknown}
GIT_HAS_CHANGES=${GIT_HAS_CHANGES:-false}

# 构建信息
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%NZ")

# 版本信息
VERSION="${GIT_BRANCH}-${GIT_COMMIT_HASH}${GIT_HAS_CHANGES}"

echo "Docker Build Environment:"
echo "  Version: $VERSION"
echo "  Commit Hash: $GIT_COMMIT_HASH"
echo "  Commit Message: $GIT_COMMIT_MESSAGE"
echo "  Branch: $GIT_BRANCH"
echo "  Build Time: $BUILD_TIME"
echo "  Has Changes: $GIT_HAS_CHANGES"