# AgentPal project tree and worktree diff visibility - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Workspace snapshot 需要从 Host 生成

- 背景：手机端要看到真实项目目录和 worktree diff，不能在 App 侧根据 session 文本猜测。
- 发现：Host 已持有 workspace 路径，并且能直接调用 filesystem 和 Git；Relay 只需要转发和缓存最新 snapshot。
- 影响：新增 `workspace-request` / `workspace-snapshot` 协议，Host 扫描后发布结构化摘要。
- 后续：如要展示完整文件内容或 patch，需要单独设计权限、截断和审批边界。

### 目录树必须过滤 generated/tooling 目录

- 背景：第一次 live probe 返回了 `.agents`、`.coding-agent-harness`、`.harness`、`target`、`tmp` 等不适合作为手机首屏项目树的信息。
- 发现：这些目录会稀释用户真正关心的 app/crates/root 文件结构，并泄露工具内部噪声。
- 影响：Host 目录扫描默认跳过 generated/tooling 目录，包括 `.git`、`node_modules`、`target`、`tmp`、`coding-agent-harness`、`ui` 等。
- 后续：后续可以增加“显示隐藏目录”开关，但默认应保持清爽。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 数据来源 | Host 生成 workspace snapshot | Host 是真实执行环境，拥有 filesystem/Git 上下文 | App 侧解析聊天文本 | accepted |
| Relay 职责 | 只缓存和转发 snapshot | 保持 Relay 不解释用户代码内容 | Relay 主动扫描或解析 Git | accepted |
| Diff 范围 | 文件级统计摘要 | 移动端先看影响范围，避免传输完整 patch | 直接传 full diff | accepted |
| UI 布局 | 会话页三面板 `聊天 / 项目 / 变更` | 聊天、目录、变更是不同任务，不应混进同一消息流 | 把目录和 diff 做成聊天卡片 | accepted |
| 目录过滤 | 默认隐藏 generated/tooling 目录 | 手机端需要先看真实项目骨架 | 展示所有目录 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 多 worktree 真实环境回归 | 代码支持 `git worktree list --porcelain` 遍历；当前实测环境只有一个 worktree | coordinator | 用户有真实多 worktree 或创建测试 worktree 时 |
| 完整 patch viewer | 不属于本切片；后续应作为独立 Diff Detail 任务 | product / coordinator | 用户需要查看完整 diff 时 |
