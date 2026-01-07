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

### 1.2 为什么不需要版本号？

我们在 `docker-compose.yml` 中使用了 `build: context: .`。
这意味着：**Docker 会直接读取你服务器上的源代码，现场构建镜像**，而不是去远程仓库（如 Docker Hub）拉取。
每次你更新代码并重新构建，Docker 就会在本地生成一个新的镜像。

---

## 2. 初次部署流程 (Step-by-Step)

### Step 1: 环境准备

登录你的服务器，确保安装了以下软件：

- **Git**: `yum install git` 或 `apt install git`
- **Docker**: `yum install docker`
- **Docker Compose**: 现在通常集成在 Docker 插件中 (`docker compose`)。

### Step 2: 获取代码

```bash
# 1. 拉取代码到服务器目录
cd /opt/  # 或者其他你喜欢的目录
git clone https://github.com/your-repo/local-party-next.git
cd local-party-next
```

### Step 3: 构建镜像 (Build)

这一步会读取 `Dockerfile`，下载 Node.js 环境，编译前端代码，生成 Docker 镜像。

```bash
# 构建镜像 (不启动)
docker-compose build

# 查看生成的镜像 (你应该能看到 local-party-next-frontend 和 backend)
docker images
```

### Step 4: 启动服务 (Up)

```bash
# -d 表示后台运行 (Detached mode)
docker-compose up -d

# 检查容器状态 (Status 应该是 Up)
docker-compose ps
```

---

## 3. 日常运维操作 (Cheat Sheet)

### 场景 A: 修改了代码，需要更新发布

如果你在本地修改了代码并推送到 Git，服务器上需要执行：

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像 (这一步很关键，否则还是跑的旧代码)
docker-compose build

# 3. 重启容器 (Docker 会自动检测到镜像变了，替换旧容器)
docker-compose up -d

# 4. 清理旧的无用镜像 (可选，清理 <none> 镜像)
docker image prune -f
```

### 场景 B: 停止与重启

```bash
# 停止并删除容器 (保留数据卷)
docker-compose down

# 仅停止容器 (不删除)
docker-compose stop

# 重启容器
docker-compose restart
```

### 场景 C: 查看日志 (排错神器)

```bash
# 查看所有服务的实时日志
docker-compose logs -f

# 只看后端的日志
docker-compose logs -f local-party-backend
```

---

## 4. 宿主机 Nginx 配置指南

这是**宿主机 (Host)** 上的 Nginx，它是流量的入口。

**文件位置**: 通常在 `/etc/nginx/nginx.conf` 或 `/etc/nginx/conf.d/your-site.conf`。

### 配置文件内容

请将以下 `location` 块添加到你的 HTTPS `server` 块中：

```nginx
server {
    listen 443 ssl;
    server_name 121.43.243.165; # 你的 IP 或域名

    # ... SSL 证书配置 ...

    # ----------------------------------------
    # 1. 前端转发 (访问页面)
    # ----------------------------------------
    location /local-party/ {
        # 对应 docker-compose.yml 中的 frontend 端口 3000
        proxy_pass http://127.0.0.1:3000/local-party/;

        # 传递真实 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # ----------------------------------------
    # 2. 后端 Socket.io 转发 (核心通信)
    # ----------------------------------------
    location /socket.io/ {
        # 对应 docker-compose.yml 中的 backend 端口 4000
        proxy_pass http://127.0.0.1:4000/socket.io/;

        # 【必须】WebSocket 协议升级头
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**修改后记得重载 Nginx**:

```bash
nginx -t      # 检查配置有没有写错
nginx -s reload # 平滑重启，不中断服务
```

---

## 5. 常见故障排查

- **问题**: 访问 `/local-party/` 404 或白屏。
  - **检查**: 前端容器是否启动？(`docker-compose ps`)
  - **检查**: `vite.config.ts` 的 `base` 是否是 `/local-party/`？如果不一致，资源路径会错。

- **问题**: 页面一直在 "正在连接服务器..."。
  - **检查**: F12 -> Network -> WS。看 `/socket.io/` 请求是否变红。
  - **检查**: 宿主机 Nginx 是否配置了 `Upgrade` 和 `Connection` 头？这是 WebSocket 必须的。
  - **检查**: 后端容器日志 (`docker-compose logs backend`) 有没有报错。
