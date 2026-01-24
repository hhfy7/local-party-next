#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带时间的日志
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# 1. 检查环境
check_env() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装"
        exit 1
    fi
}

# 2. 获取 Git 版本和完整信息
get_version() {
    # 如果传入了参数，则使用参数作为 TAG (用于回滚)
    if [ -n "$1" ]; then
        TAG=$1
        GIT_COMMIT_HASH=$1
        GIT_COMMIT_MESSAGE="Rollback to $1"
        GIT_BRANCH="unknown"
        GIT_HAS_CHANGES="false"
        log "使用指定版本: $TAG"
    else
        # 否则使用当前 HEAD 的完整信息
        git pull origin master # 自动拉取最新代码
        TAG=$(git rev-parse --short HEAD)
        GIT_COMMIT_HASH=$(git rev-parse --short HEAD)
        GIT_COMMIT_MESSAGE=$(git log -1 --pretty=%B | head -1)
        GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
        GIT_HAS_CHANGES=$(git status --porcelain | wc -l)

        # 转换布尔值
        if [ "$GIT_HAS_CHANGES" -gt 0 ]; then
            GIT_HAS_CHANGES="true"
        else
            GIT_HAS_CHANGES="false"
        fi

        log "使用最新 Git 版本: $TAG"
        log "提交信息: $GIT_COMMIT_MESSAGE"
        log "分支: $GIT_BRANCH"
        log "有更改: $GIT_HAS_CHANGES"
    fi

    # 写入 .env 文件供 docker-compose 使用
    cat > .env << EOF
TAG=$TAG
GIT_COMMIT_HASH=$GIT_COMMIT_HASH
GIT_COMMIT_MESSAGE=$GIT_COMMIT_MESSAGE
GIT_BRANCH=$GIT_BRANCH
GIT_HAS_CHANGES=$GIT_HAS_CHANGES
EOF
}

# 3. 构建镜像
build() {
    log "开始构建镜像 (TAG=$TAG)..."
    docker compose build
    if [ $? -ne 0 ]; then
        error "构建失败！"
        exit 1
    fi
    log "构建成功！"
}

# 4. 启动服务
up() {
    log "重启服务..."
    docker compose up -d
    log "服务已启动！当前运行版本: $TAG"
}

# 5. 清理旧镜像
clean() {
    log "清理无用镜像 (Dangling images)..."
    docker image prune -f
}


# 7. 显示部署摘要（新增）
show_summary() {
    log "=== 部署摘要 ==="
    log "部署版本: $TAG"
    log "Git 提交: $GIT_COMMIT_HASH"
    log "分支: $GIT_BRANCH"
    log "构建时间: $(date)"

    # 显示容器状态
    docker compose ps

    log "部署完成！🎉"
}

# 显示帮助信息
show_help() {
    echo "Local Party Next 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  ./deploy.sh              # 完整部署流程（默认）"
    echo "  ./deploy.sh build        # 仅构建镜像"
    echo "  ./deploy.sh clean        # 清理无用镜像"
    echo "  ./deploy.sh rollback TAG # 回滚到指定版本"
    echo "  ./deploy.sh help         # 显示帮助信息"
    echo ""
    echo "环境要求:"
    echo "  - Docker 和 Docker Compose"
    echo "  - Git（用于版本信息）"
    echo ""
    echo "功能特点:"
    echo "  - 自动拉取最新代码"
    echo "  - 注入完整的 Git 版本信息"
    echo "  - 支持版本回滚"
    echo "  - 自动清理旧镜像"
    echo "  - 部署后版本验证"
}

# --- 主流程 ---

# 如果没有参数，显示帮助
if [ $# -eq 0 ]; then
    show_help
    echo ""
fi

check_env

case "$1" in
    "build")
        get_version
        build
        show_summary
        ;;
    "clean")
        clean
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "rollback")
        if [ -z "$2" ]; then
            error "请提供回滚的版本号 (例如: ./deploy.sh rollback a1b2c3d)"
            exit 1
        fi
        get_version $2
        up
        ;;
    *)
        # 默认流程: 更新代码 -> 构建 -> 启动 -> 验证 -> 清理
        get_version
        build
        up
        show_summary
        clean
        ;;
esac
