# AgentPal GitHub public repository rename

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把当前 private GitHub 仓库 `LnYo-Cly/OpenAgentPal` 重命名并公开为 `LnYo-Cly/AgentPal`，同时更新本地 remote 和当前仓库 metadata 链接。

## 范围

- 做什么：公开前密钥/凭据扫描；GitHub repo rename；visibility 设为 public；本地 `origin` 更新；当前 metadata / docs 中的 GitHub repo 链接更新；Harness 证据收口。
- 不做什么：npm publish、预编译二进制发布、Railway endpoint 改名、默认分支迁移、历史任务文本批量改写。
- 主要风险：公开前泄漏凭据；仓库重命名后 remote / metadata 不一致；GitHub visibility change 是对外发布动作，必须有扫描证据。

## 预算选择

选择预算：standard

选择理由：改动本身不复杂，但包含公开仓库的安全边界、外部 GitHub 状态变更和 Harness 审计，需要完整证据链。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | external | URL:https://github.com/LnYo-Cly/OpenAgentPal | 当前 private 仓库状态，需要重命名和公开。 | coordinator |
| C-002 | code | TARGET:package.json | npm metadata 可能包含 repository / bugs / homepage 链接。 | coordinator |
| C-003 | code | TARGET:.git/config | 本地 remote 需要更新为新仓库 URL。 | coordinator |
| C-004 | code | TARGET:. | 公开前扫描 tracked files 和 git history。 | coordinator |

## 步骤

1. 记录当前 GitHub 仓库状态和本地 remote。
2. 执行公开前扫描：tracked files、常见 dotenv 文件、token/secret 模式、历史 patch 关键词。
3. 如果扫描无阻塞项，使用 GitHub CLI 将仓库重命名为 `AgentPal` 并设为 public。
4. 更新本地 `origin` 和当前仓库 metadata 中的 GitHub 链接。
5. 运行验证、提交文档与 metadata、推进 Harness review。

## 验收标准

- [ ] `gh repo view LnYo-Cly/AgentPal --json nameWithOwner,visibility,isPrivate,url` 显示 `PUBLIC` / `false`。
- [ ] `git remote -v` 指向 `https://github.com/LnYo-Cly/AgentPal.git`。
- [ ] 公开前扫描没有阻塞发现。
- [ ] `git diff --check`、`harness check --profile target-project .` 通过。
- [ ] 当前任务进入 Agent Review Submission；不执行 human `review-confirm`。

## 工作树（Worktree）

- 路径：不适用
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：仓库治理和远端状态变更必须串行执行，拆分会增加远端状态不一致风险。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：扫描发现真实凭据或 GitHub API 拒绝重命名/公开时停止并记录 blocker。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：公开前扫描和 repo 状态验证无阻塞发现。

## 关联

- 相关 Regression Gate：无；本任务不改运行时协议。
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-06-10-agentpal-github-public-repository-rename-c0a78ac1/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：TASKS/2026-06-10-agentpal-public-command-naming-41fcec16；TASKS/2026-06-10-agentpal-cli-update-notice-403bf715

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：lifecycle CLI 同步
- Closeout / Regression update needed：walkthrough / review
