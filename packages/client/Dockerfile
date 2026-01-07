# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY packages/client ./packages/client

WORKDIR /app/packages/client
RUN pnpm run build

# --- Production Stage (Nginx) ---
FROM nginx:alpine

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html/local-party

# 复制自定义 Nginx 配置 (用于 Docker 内部)
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]