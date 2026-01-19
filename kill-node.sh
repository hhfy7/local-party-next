#!/bin/bash

PORT=4000

# 查找特定端口的 node 进程
PIDS=$(lsof -ti:$PORT -c node)

if [ -z "$PIDS" ]; then
    echo "没有找到监听端口 $PORT 的 node 进程"
    exit 0
fi

for PID in $PIDS; do
    echo "正在杀死 node 进程: $PID"
    kill -9 $PID
    echo "进程 $PID 已终止"
done
