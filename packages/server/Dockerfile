FROM node:20-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 workspace 配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# 构建 Shared (如果是 TS) 和 Server
WORKDIR /app/packages/shared
# 如果 shared 需要构建，加这一步，目前 shared 好像只是 types，可以直接用源码或 tsc
# 假设 shared 是纯类型，server 的 ts-node/tsc 会引用它

WORKDIR /app/packages/server
RUN pnpm run build

# 暴露端口
EXPOSE 4000

# 启动
CMD ["node", "dist/app.js"]