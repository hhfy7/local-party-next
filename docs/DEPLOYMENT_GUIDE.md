# Local Party Next 全流程部署与运维手册

本文档是项目的**终极运维指南**。它将指导你从零开始在服务器上部署应用，并涵盖日常的停止、重启、更新和故障排查。

---

## 1. 核心原理 (必读)

### 1.1 架构图解
```
[用户浏览器]
    | (https)
    v
[宿主机 Nginx (网关)] --(端口转发)--> [Docker 容器群]
    |                                     |
    +--- /local-party/ ---> [前端容器 (lp-frontend:80)] (Nginx 托管静态文件)
    |
    +--- /socket.io/   ---> [后端容器 (lp-backend:4000)] (Node.js 服务)
```

### 1.2 镜像版本控制 (Versioning)
我们在 `docker-compose.yml` 中使用了 `${TAG:-latest}` 变量。
你可以用 Git Commit Hash 来标记镜像，方便回滚。

---

## 2. 初次部署流程 (Step-by-Step)

### Step 1: 环境准备
登录你的服务器，确保安装了 Git, Docker, Docker Compose。

### Step 2: 获取代码
```bash
git clone https://github.com/your-repo/local-party-next.git
cd local-party-next
```

### Step 3: 构建镜像 (Build)

**推荐方式：使用 Git Hash 作为版本号**
```bash
# 生成 .env 文件，Docker Compose 会自动读取
echo "TAG=$(git rev-parse --short HEAD)" > .env

# 构建
docker-compose build

# 查看生成的镜像 (例如 local-party-backend:a1b2c3d)
docker images
```

### Step 4: 启动服务 (Up)
```bash
# 启动 (会自动读取 .env 中的 TAG)
docker-compose up -d

# 检查容器状态
docker-compose ps
```

---

## 3. 日常运维操作 (Cheat Sheet)

### 场景 A: 更新发布
```bash
# 1. 拉取最新代码
git pull

# 2. 更新版本号
echo "TAG=$(git rev-parse --short HEAD)" > .env

# 3. 重新构建
docker-compose build

# 4. 重启 (自动使用新镜像)
docker-compose up -d

# 5. 清理旧镜像
docker image prune -f
```

### 场景 B: 停止与重启
```bash
docker-compose down
docker-compose restart
```

### 场景 C: 查看日志
```bash
docker-compose logs -f
```

---

## 4. 宿主机 Nginx 配置指南

*请参考之前的配置，此处省略重复内容*

## 5. 常见故障排查

*   **问题**: `pull access denied`。
    *   **解决**: 配置 Docker 镜像加速器 (参考 `daemon.json` 配置)。

*   **问题**: 启动报错 `image not found`。
    *   **检查**: 你的 `.env` 文件里的 `TAG` 和你 `build` 时的 `TAG` 是否一致？如果不一致，重新 build 一次。