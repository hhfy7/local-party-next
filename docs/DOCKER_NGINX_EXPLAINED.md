# Docker & Nginx 部署配置详解

本文档旨在解释 `Dockerfile`、`docker-compose.yml` 以及宿主机 `Nginx` 配置背后的原理，帮助你理解整个部署流程。

---

## 1. 容器化构建原理 (Dockerfile)

### A. 后端镜像 (`packages/server/Dockerfile`)

```dockerfile
# 1. 选择基础镜像
FROM node:20-alpine

# 2. 创建工作目录
WORKDIR /app

# 3. 全局安装 pnpm (因为基础镜像只有 npm/yarn)
RUN npm install -g pnpm

# 4. 复制依赖文件
# 这里只复制 package.json 等，不复制源码。
# 为什么？利用 Docker 缓存！只要依赖没变，这一步就不会重新跑，由下一次 npm install 复用缓存。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# 5. 安装依赖
RUN pnpm install --frozen-lockfile

# 6. 复制源码
# 这一步变动最频繁，放在最后，避免破坏上面的缓存。
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# 7. 构建 TS 代码
WORKDIR /app/packages/server
RUN pnpm run build

# 8. 暴露端口 & 启动
EXPOSE 4000
CMD ["node", "dist/app.js"]
```

### B. 前端镜像 (`packages/client/Dockerfile`)

这是一个 **多阶段构建 (Multi-stage Build)**，目的是减小体积。

- **第一阶段 (Builder)**: 用 Node.js 环境把 React 代码打包成静态 HTML/CSS/JS。
- **第二阶段 (Runner)**: 用 Nginx 环境来托管这些静态文件。Node.js 环境被丢弃，最终镜像只有几 MB。

```dockerfile
# --- 第一阶段：构建 ---
FROM node:20-alpine AS builder
# ... (同上，安装依赖、复制源码) ...
WORKDIR /app/packages/client
RUN pnpm run build
# 产物在 /app/packages/client/dist

# --- 第二阶段：运行 ---
FROM nginx:alpine
# 把第一阶段构建好的 dist 文件夹，复制到 Nginx 的默认目录
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html/local-party
# 复制我们写好的 nginx.conf 覆盖默认配置
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
```

---

## 2. 容器编排 (docker-compose.yml)

这个文件是把前后端两个容器“串”起来的胶水。

```yaml
services:
  # 后端服务
  local-party-backend:
    container_name: lp-backend
    ports:
      - '4000:4000' # 把容器里的 4000 映射到宿主机的 4000

  # 前端服务
  local-party-frontend:
    container_name: lp-frontend
    ports:
      - '3000:80' # 把容器里的 80 (Nginx) 映射到宿主机的 3000
    depends_on:
      - local-party-backend # 确保后端先启动
```

**启动后：**

- 访问宿主机 `http://localhost:3000` -> 看到前端页面。
- 访问宿主机 `http://localhost:4000` -> 连上后端 API。

---

## 3. 宿主机 Nginx 详解 (关键!)

这是你的公网服务器上原本就在运行的 Nginx，它是流量的**总入口 (Gateway)**。

### 为什么要有两个 Nginx？

1.  **宿主机 Nginx**: 处理 HTTPS 证书、域名解析、路由分发。
2.  **Docker Nginx**: 只是为了简单的 serve 静态文件，不需要处理复杂的 HTTPS。

### 配置文件解析

```nginx
server {
    listen 443 ssl;
    server_name 121.43.243.165; # 你的 IP 或域名

    # --- 1. 前端转发 ---
    # 当用户访问 https://IP/local-party/ 时
    location /local-party/ {
        # 转发给 Docker 前端容器 (端口 3000)
        proxy_pass http://127.0.0.1:3000/local-party/;

        # 这些头是为了让应用知道真实的客户端 IP
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # --- 2. 后端 Socket.io 转发 ---
    # 问：为什么要配 /socket.io/？我没有这个域名啊？
    # 答：这不是域名，是路径。
    # Socket.io 客户端在连接时，默认会访问 https://IP/socket.io/?EIO=4&transport=polling
    # 如果不配这个 location，Nginx 就会以为你在访问前端页面，返回 404。
    location /socket.io/ {
        # 转发给 Docker 后端容器 (端口 4000)
        proxy_pass http://127.0.0.1:4000/socket.io/;

        # 【核心】WebSocket 必须配置这三行，否则无法建立长连接！
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 总结

用户 -> **宿主机 Nginx (443)** -> 根据路径分流:

- `/local-party/` -> **Docker 前端 (3000)** -> 返回 index.html
- `/socket.io/` -> **Docker 后端 (4000)** -> 建立 WebSocket 连接
