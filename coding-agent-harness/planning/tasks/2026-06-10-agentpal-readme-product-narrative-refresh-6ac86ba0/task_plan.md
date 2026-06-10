# AgentPal README product narrative refresh

Task Contract: harness-task/v1
Task Package Index: required

## 目标

将根目录 README 改成更适合 GitHub / npm 首页的产品叙事试稿，同时保留真实安装命令和当前 early release 限制。

## 范围

- 做什么：重写 README 的开头叙事、Quick Start、产品场景、当前能力、工作方式、限制和开发说明。
- 不做什么：不改 CLI 代码、不发新版 npm、不承诺未实现移动端能力、不添加图片或官网。
- 主要风险：文案过度营销、把早期能力说成成熟产品、或者又退回工程说明书口吻。

## 预算选择

选择预算：simple

选择理由：只改公开 README 和任务记录，范围小但需要保持产品定位准确。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | public-doc | TARGET:README.md | 当前 GitHub / npm 首页文案。 | coordinator |
| C-002 | private-plan | TARGET:coding-agent-harness/context/product/product-brief.md | 产品定位和非目标。 | coordinator |
| C-003 | private-plan | TARGET:coding-agent-harness/context/product/mvp-scope.md | 当前 MVP 能力与延期项边界。 | coordinator |
| C-004 | code | TARGET:package.json; TARGET:bin/agentpal.mjs | 已发布 npm 包名、命令和默认行为。 | coordinator |

## 步骤

1. 读取现有 README 和产品上下文，确认叙事方向。
2. 重写 README，优先表达“手机控制本地 coding agent”的产品味道。
3. 校验 README 包含真实命令、限制和安全边界。
4. 运行 Harness check，提交并推送。

## 验收标准

- [ ] README 第一屏包含清晰产品定位和 `npx agentpal@latest pair`。
- [ ] README 不把 mobile app / adapters / prebuilt binaries 说成已经完整可用。
- [ ] README 包含当前 requirements、npm usage、development commands 和 security notes。
- [ ] `harness check --profile target-project .` 通过或仅有已解释 warning。

## 工作树（Worktree）

- 路径：主 checkout
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：单文件文档试稿，不需要并行 worktree。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要改变产品定位或承诺未实现能力时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：文案不误导当前能力。

## 关联

- 相关 Regression Gate：n/a，文档改动。
- 审查报告：不适用
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：TASKS/2026-06-10-agentpal-npm-public-release-f0c0ca12

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：lifecycle CLI
- Closeout / Regression update needed：`walkthrough.md`
