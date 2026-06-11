# AgentPal daemon 常驻 CLI 设计

## 目标

把当前只负责前台连线的 `pair` 流程，拆成两层：

1. `agentpal pair` 继续负责首次配对和终端二维码输出。
2. `agentpal daemon start|stop|status|logs` 负责 workspace 级后台常驻。

本轮不做开机自启，不做桌面安装包。

## 方案

我会采用 workspace 级 profile + 独立 daemon 状态文件的方案。

- `pair` 和 `daemon` 共享同一个 workspace profile。
- profile 里固定 `hostId`、`hostName`、`relayUrl`。
- daemon 只在当前 workspace 范围内运行，不做全局单实例。
- daemon 启动后把 host 进程 detach 到后台，并把 stdout/stderr 写到日志文件。

## 取舍

备选方案有三个：

1. 顶层只保留 `pair`，后台交给系统服务。代价是部署和心智负担都太高。
2. `daemon` 直接复用 `cargo run`。代价是长期后台依赖构建链，退出和日志都不好控。
3. `daemon` 先构建 host binary，再以独立进程启动。这个方案最稳，最适合 stop/status/logs。

## 进程与状态模型

### Profile

按 workspace 存放：

- `workspacePath`
- `workspaceKey`
- `hostId`
- `hostName`
- `relayUrl`
- `sessionId`
- `codexBin`
- `codexPort`

### Daemon state

按 workspace 存放：

- `mode`
- `pid`
- `logPath`
- `startedAt`
- `commandLine`
- `lastSeenAt`

### 行为

- `pair`：读取或创建 profile，使用稳定 `hostId` 打印配对信息，并在 workspace runtime state 中标记前台会话。
- `daemon start`：读取 profile，构建 host binary，启动后台进程，写入 daemon state；若 runtime state 显示已有活跃 host，会拒绝启动。
- `daemon status`：按 pid 判断是否存活，提示 running/stale。
- `daemon stop`：停止进程树并清理状态。
- `daemon logs`：输出日志文件内容。

## 错误处理

- profile 缺失：自动创建默认 profile。
- pid 失效：标记 stale state，并提示重新 start。
- workspace 不存在：直接报错，不启动。
- codex 不可用：在 start 前失败，不写半残状态。
- 日志文件缺失：status 可用，logs 只提示不存在。

## 验证

会做三层验证：

- 命令行 help 和参数解析。
- `pair` 的前台配对冒烟。
- `daemon start|status|logs|stop` 的后台常驻冒烟，包括 parent 退出后进程仍在。

## 不做

- 不做开机自启。
- 不做桌面安装包。
- 不改 mobile 配对协议。
- 不扩展到全局单实例 host。
