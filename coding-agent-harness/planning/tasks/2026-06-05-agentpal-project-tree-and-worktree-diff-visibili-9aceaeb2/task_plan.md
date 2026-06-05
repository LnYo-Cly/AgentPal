# AgentPal project tree and worktree diff visibility

Task Contract: harness-task/v1
Task Package Index: required

## 目标

让手机端可以看到当前 Host 工作区的项目目录和 Git worktree 变更摘要，补齐远程 Agent 工作台的“看项目”和“看改动”能力。

## 范围

- 做什么：新增 workspace snapshot 协议、Host 目录/变更扫描、Relay 转发、移动端项目/变更面板。
- 不做什么：不做完整 Git 客户端、不做提交/切分 patch、不做任意文件打开和编辑。
- 主要风险：目录和 diff 数据可能较大，需要限制深度、数量和文本长度；移动端布局不能挤占聊天主流程。

## 预算选择

选择预算：standard

选择理由：这是跨协议、Host、Relay、移动端 UI 的中等规模切片，但只读能力边界清晰，不涉及审批和写操作。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:crates/protocol/src/lib.rs | 定义 App/Relay/Host 的共享消息契约 | coordinator |
| C-002 | code | TARGET:crates/host/src/codex.rs | Host 持有真实 workspace 和 git 扫描能力 | coordinator |
| C-003 | code | TARGET:apps/mobile/app/index.tsx | 会话页与工作台 UI 入口 | coordinator |
| C-004 | memory | MEMORY.md:68-128 | 复用 AgentPal 真实链路和 UI 历史修复经验 | coordinator |

## 设计

1. 会话页保持聊天为默认工作面板，新增 `聊天 / 项目 / 变更` 三段式切换。
2. `项目` 面板展示当前 workspace 根路径、目录树、文件/目录数量和截断提示。
3. `变更` 面板展示 `git worktree list --porcelain` 结果，每个 worktree 作为独立条目，包含 branch、path、dirty 状态、文件数、增删行和前若干文件摘要。
4. Host 只发布摘要，不发布完整源文件内容，减少隐私和传输风险。
5. Relay 不解释内容，只缓存/转发最新 workspace snapshot。

## 步骤

1. 增加 `WorkspaceRequest` / `WorkspaceSnapshot` / `WorktreeSummary` / `ProjectTreeEntry` 协议类型和 Relay 转发逻辑。
2. Host 处理 workspace request，执行安全扫描：目录深度限制、忽略生成目录、Git diff 统计限制。
3. App hook 保存 workspace snapshot，并暴露请求刷新方法。
4. 会话页新增工作台切换与项目/变更面板，保留输入框和消息体验。
5. 运行 Rust、TypeScript、Expo 导出和 WebSocket 实测。

## 验收标准

- [x] 进入会话页可请求并显示当前项目目录摘要。
- [x] 当前 Git worktree 的变更统计能真实显示。
- [x] 多 worktree 时按 worktree 独立显示，且 dirty/clean 状态清楚。当前实测环境只有一个 worktree，代码路径使用 `git worktree list --porcelain` 遍历所有 worktree。
- [x] UI 不阻塞聊天输入，不遮挡底部 composer。
- [x] 验证命令通过并写入 `progress.md`。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：当前分支
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：当前分支
- 未使用 worktree 的原因：改动集中在同一协议链路，worker/worktree 分拆会提高契约漂移风险；当前工作区已有大量历史 dirty，先保持 coordinator 严格控边界。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：验证失败或发现需要完整文件内容/写操作时停止扩大范围。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：无 P0/P1 风险；残余 UI polish 可进入后续任务。

## 关联

- 相关 Regression Gate：Expo mobile typecheck/export；Rust workspace check；live Relay/Host probe。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-06-05-agentpal-session-history-and-inbox-ux-redesign-af6730dc`

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：不适用
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：任务完成后由 CLI 处理；若 dirty 阻塞则记录 no-commit reason。
- Closeout / Regression update needed：`progress.md`、`walkthrough.md`
