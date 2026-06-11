# AgentPal daemon 常驻 CLI - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Workspace 级 profile 是必要的

- 背景：`pair` 与 daemon 必须复用同一个 host 身份，否则手机端会把 daemon 当成新设备。
- 发现：当前 `default_host_id()` 每次运行都会生成新 ID；需要在 workspace 维度持久化 hostId / hostName / relayUrl，并给每个 workspace 一个稳定 sessionId。
- 影响：pair 与 daemon 不能各自随机生成身份，必须从同一 profile 读写，且不同 workspace 不能共用同一个 relay session id。
- 后续：实现 profile 读写与默认创建逻辑。

### 后台启动应直接跑构建好的 host binary

- 背景：daemon 需要在父终端关闭后继续存在。
- 发现：`cargo run` 适合作为前台开发入口，但不适合作为长期后台主体；`connect` 已经支持无限时运行，只差一个稳定的 detach 入口。
- 影响：daemon start 应先 build，再直接 spawn 已构建 binary，并保存 pid / log path。
- 后续：实现 detached 启动、pid 检查和 stop 回收。

### Codex app-server 端口需要 workspace 级稳定分配

- 背景：多个 workspace daemon 可能同时运行。
- 发现：Rust host 默认 `--codex-port 37941`，多实例会抢同一个本地端口。
- 影响：profile 需要保存一个稳定 `codexPort`，并在 `pair` / `daemon start` 时默认传入。
- 后续：按 workspace hash 分配端口，同时允许用户显式 `--codex-port` 覆盖。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| workspace profile | 按 workspace 存 profile/state | 可保证 pair/daemon 共享稳定 host 身份，并保持作用域清晰 | 全局单实例 / 每次随机 ID | accepted |
| detached binary | 先 build 再后台跑 host binary | 便于 stop/status/logs 管理，避免 cargo run 作为长驻主体 | 直接后台 cargo run | accepted |
| codex port | profile 内稳定保存 `codexPort` | 支持多 workspace 并存，避免默认端口冲突 | 所有 daemon 共用 37941 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| daemon start 是否默认重新创建配对 | 当前不默认创建，先复用稳定 profile 和已有 mobile 配对 | coordinator | 实现前 |
