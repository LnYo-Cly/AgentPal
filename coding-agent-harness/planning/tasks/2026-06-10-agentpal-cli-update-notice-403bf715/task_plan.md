# AgentPal CLI update notice

Task Contract: harness-task/v1
Task Package Index: required

## 目标

为 AgentPal CLI 增加轻量更新提示，让全局安装用户知道有新版，但不阻塞核心命令。

## 范围

- 做什么：在 `agentpal` CLI 真实命令运行前检查 npm latest；发现新版本时输出一行更新命令；提供关闭开关；网络失败、包未发布、超时都静默跳过。
- 不做什么：不做自动更新、不写本地配置、不执行 npm publish、不引入第三方依赖、不改变 Relay/Host 协议。
- 主要风险：更新检查拖慢 `agentpal pair`；npm 未发布导致 404 噪音；提示污染 `--help` 输出。

## 预算选择

选择预算：standard

选择理由：功能小但触及 CLI 启动路径，需要设计边界、超时/失败验证和 Harness 证据。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:bin/agentpal.mjs | CLI 入口和真实命令启动路径。 | coordinator |
| C-002 | code | TARGET:package.json | 当前包名、版本和 bin 配置。 | coordinator |
| C-003 | external | URL:https://registry.npmjs.org/agentpal | npm latest 查询目标；当前未发布时会返回 404，必须静默。 | coordinator |

## 步骤

1. 设计更新提示触发条件和失败策略。
2. 在 `bin/agentpal.mjs` 增加版本读取、semver 比较、短超时 latest 查询和提示输出。
3. 增加测试用环境变量以便本地 mock registry 验证，不暴露给普通用户文案。
4. 运行 CLI、mock registry、typecheck、diff 和 Harness 检查。

## 验收标准

- [ ] `npm run agentpal -- --help` 仍只显示 help，不做更新提示。
- [ ] mock latest 高于本地版本时，`agentpal` 真实命令输出更新提示。
- [ ] registry 404 / 网络失败不输出错误且命令继续执行。
- [ ] `AGENTPAL_NO_UPDATE_CHECK=1` 关闭提示。
- [ ] `npm --prefix apps/mobile run typecheck`、`git diff --check`、`harness check --profile target-project .` 通过。

## 工作树（Worktree）

- 路径：不适用
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：单文件 CLI 改动，当前 checkout 干净且不需要 worker subagent。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要真实 npm 发布、自动更新器或持久用户配置时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：确认更新检查不会阻塞 help / pair，失败静默，提示只在新版存在时出现。

## 关联

- 相关 Regression Gate：RG-001 间接受影响；CLI 启动路径不能阻塞配对。
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-06-10-agentpal-cli-update-notice-403bf715/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：TASKS/2026-06-10-agentpal-public-command-naming-41fcec16

## 模块关联（启用模块并行时填写）

- Module：[module key，例如 reader / graph / 不适用]
- Step：[step ID，例如 RDR-02 / 不适用]
- Module Plan：[link to module_plan.md / 不适用]

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator / 不适用
- Global sync status：pending-coordinator-pass / synced / n/a
- Registry update needed：[module key, step, status, branch, updated / 不适用]
- Harness Ledger update needed：[task plan path, review path, closeout status / 不适用]
- Closeout / Regression update needed：[路径或 n/a]
