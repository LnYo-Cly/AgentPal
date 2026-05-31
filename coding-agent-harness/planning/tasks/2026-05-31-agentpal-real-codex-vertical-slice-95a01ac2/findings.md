# AgentPal real Codex vertical slice - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Codex CLI has structured app-server surfaces

- 背景：用户要求真实接入 Codex，而不是 mock 或纯终端镜像。
- 发现：`codex-cli 0.134.0` 存在 `app-server`、`remote-control`、`--remote`、`--no-alt-screen`；`remote_control` feature effective state 为 true。
- 影响：AgentPal Host 第一优先应接 Codex app-server/remote-control，而不是从 TUI/PTY 文本解析开始。
- 后续：实现任务中验证 `codex app-server --listen ws://127.0.0.1:<port>` 的启动、握手和 thread/turn 调用。

### Codex app-server generates protocol schema and TypeScript files

- 背景：Host/Mobile 需要稳定协议事实，不应猜 Codex 消息结构。
- 发现：`codex app-server generate-json-schema --out tmp/codex-app-server-schema --experimental` 和 `codex app-server generate-ts --out tmp/codex-app-server-ts --experimental` 成功。输出是多文件结构，不是单一 `schema.json` 或 `protocol.ts`。
- 影响：后续实现应把生成物作为 build/generated input 或开发期 fixture，不要手写 Codex protocol 类型。
- 后续：实现任务中决定生成物落点；`tmp/` 仍然 ignored，不作为提交源。

### Windows cannot rely on app-server daemon lifecycle

- 背景：需要知道 Host 在 Windows 上如何管理真实 Codex。
- 发现：`codex app-server daemon version` 返回错误：`codex app-server daemon lifecycle is only supported on Unix platforms`。
- 影响：Windows MVP 不能依赖 `codex app-server daemon start/stop/bootstrap`。Host 应直接管理 `codex app-server --listen ...` 子进程或走非 daemon 连接路径。
- 后续：实现任务中优先验证 direct `--listen ws://127.0.0.1:<port>` child process path。

### Generated protocol includes needed MVP objects

- 背景：需要判断 app-server 是否覆盖 start/resume/input/diff/approval/skills。
- 发现：生成的 TS 类型包含 `ThreadStartParams`、`TurnStartParams`、`TurnSteerParams`、`TurnDiffUpdatedNotification`、`CommandExecutionRequestApprovalParams`、`FileChangeRequestApprovalParams`、`SkillsListResponse` 等。
- 影响：真实 Codex 垂直切片可以从结构化 events/requests 开始，ApprovalCard/DiffCard 不必等待 TUI parsing。
- 后续：实现任务中建立 Codex event -> AgentPal event mapping。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| Codex adapter primary path | app-server / remote-control structured protocol | 本机 Codex 0.134.0 提供 app-server、schema、TS 类型和相关 thread/turn/approval/diff/skills 对象。 | 直接 PTY/TUI parsing | accepted |
| Windows Host process model | Host owns direct `codex app-server --listen ...` child process | Windows daemon lifecycle 不可用。 | `codex app-server daemon start` | accepted |
| Generated protocol handling | Generate Codex schema/types during build or development setup, not by hand | app-server 已能生成多文件 schema/TS。 | 手写 Codex protocol types | accepted |
| First implementation scope | One Codex workspace/session real loop | 降低 adapter 差异风险，先证明真实闭环。 | 同时接 Claude/OpenCode | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| `codex app-server --listen ws://127.0.0.1:<port>` runtime handshake | 当前只验证 help/schema generation，尚未启动长期服务。 | host owner | Host implementation start |
| generated TS/schema 提交位置 | 倾向 build/generated 或 protocol fixtures，不能继续用 ignored `tmp/`。 | protocol owner | protocol crate/package scaffold |
| App-server protocol stability | 当前为 experimental，需版本钉住和兼容检测。 | host owner | Codex adapter implementation |
