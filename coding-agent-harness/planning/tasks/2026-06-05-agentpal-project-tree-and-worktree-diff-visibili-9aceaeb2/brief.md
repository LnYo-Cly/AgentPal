# AgentPal project tree and worktree diff visibility

## Task ID

`2026-06-05-agentpal-project-tree-and-worktree-diff-visibili-9aceaeb2`

## 创建日期

2026-06-05

## 一句话结果

手机端会话页可以看到当前 Host 工作区的项目目录，以及每个 Git worktree 的变更摘要和文件级 diff 入口。

## 完成后能得到什么

用户在手机上远程控制 Codex / Claude Code / OpenCode 时，不只看到聊天消息，还能直接确认 Agent 正在哪个项目目录里工作、仓库里有哪些关键文件、当前所有 worktree 分别有多少变更、哪些文件被修改、增删行数是多少。这让移动端可以承担“继续指挥”和“审查变更”的基本工作台职责，而不是只能作为聊天窗口。

## 交付物

- 可见产物：会话页新增项目/变更工作面板，显示目录树、worktree 列表、变更统计和文件级摘要。
- 修改位置：`crates/protocol/src/lib.rs`、`crates/relay/src/main.rs`、`crates/host/src/codex.rs`、`apps/mobile/src/lib/relay.ts`、`apps/mobile/src/hooks/useAgentPalRelay.ts`、`apps/mobile/app/index.tsx`。
- 验证证据：TypeScript 检查、Rust workspace 检查、Expo iOS export、Relay/Host workspace snapshot 实测。

## 第一眼应该看什么

先读 `task_plan.md` 的数据流设计，再读 `progress.md` 的验证记录；代码从 `WorkspaceRequest` / `WorkspaceSnapshot` 协议类型开始追踪。

## 边界

- 范围内：Host 扫描当前工作区目录、Git worktree 列表和每个 worktree 的 `git diff --shortstat` / `git diff --numstat` 摘要；Relay 转发 snapshot；移动端展示结构化工作台。
- 范围外：完整文件内容浏览、完整 patch 分屏审查、跨 Host 多项目索引、远程删除/提交/checkout 操作。
- 停止条件：如果 Host 无法安全读取某个 worktree，降级为错误摘要，不阻塞其它 worktree；如果 Expo Go 不支持某 native 依赖，不引入该依赖。

## 完成判断

- App 进入会话页后可主动请求并显示当前 workspace 的目录树。
- App 可看到至少当前主 worktree 的变更统计和文件级摘要。
- 如果存在多个 `git worktree`，每个 worktree 都独立显示路径、分支、dirty 状态和文件变更。
- UI 不把目录和 diff 混进聊天流，而是作为清晰的工作台面板。
- 相关 Rust、TypeScript 和 Expo 导出检查通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：执行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

补齐协议数据类型和 Host 真实扫描能力，然后在移动端会话页新增项目/变更面板。
