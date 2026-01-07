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

# 2. 获取 Git 版本
get_version() {
    # 如果传入了参数，则使用参数作为 TAG (用于回滚)
    if [ -n "$1" ]; then
        TAG=$1
        log "使用指定版本: $TAG"
    else
        # 否则使用当前 HEAD 的短 Hash
        git pull origin master # 自动拉取最新代码
        TAG=$(git rev-parse --short HEAD)
        log "使用最新 Git 版本: $TAG"
    fi
    
    # 写入 .env 文件供 docker-compose 使用
    echo "TAG=$TAG" > .env
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

# --- 主流程 ---

check_env

case "$1" in
    "build")
        get_version
        build
        ;;
    "clean")
        clean
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
        # 默认流程: 更新代码 -> 构建 -> 启动 -> 清理
        get_version
        build
        up
        clean
        ;;
esac
