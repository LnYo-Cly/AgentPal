# Default public relay endpoint

Task Contract: harness-task/v1
Task Package Index: required

## 目标

把 OpenAgentPal 默认公网 Relay 切换到已验证的 Railway 域名，使大众用户运行 `oap pair` 后可直接扫码连接，不再需要手动设置环境变量。

## 范围

- 做什么：更新 CLI wrapper、Rust Host CLI、手机端默认 Relay fallback、相关部署/设计文档和 Regression SSoT。
- 不做什么：不做 VPS、品牌域名、npm 分发、移动端 UI 重构或真实手机扫码人工验证。
- 主要风险：Railway 域名是平台域名，后续换品牌域名/VPS 时仍需集中更新默认值或引入远程配置。

## 预算选择

选择预算：simple

选择理由：这是窄幅默认配置和文档/SSoT 修复，不涉及协议或 UI 结构改造。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:bin/oap.mjs; TARGET:crates/host/src/codex.rs | 电脑端默认 Relay URL 的两个入口。 | coordinator |
| C-002 | code | TARGET:apps/mobile/src/lib/relay.ts | 手机端默认 Relay fallback。 | coordinator |
| C-003 | external | URL:https://openagentpal-production.up.railway.app/healthz | 已验证 live Relay healthcheck。 | coordinator |

## 步骤

1. 写入设计说明，确认默认公网路径和高级覆盖路径。
2. 将 CLI/Rust/mobile 默认 Relay 切到 `wss://openagentpal-production.up.railway.app/ws`。
3. 更新文档和 Regression SSoT，保留品牌域名/VPS 后续残余。
4. 运行 Rust、mobile、CLI、live healthcheck 和 Harness 检查，提交并推送。

## 验收标准

- [x] `npm run oap -- --help` 展示 Railway 默认 Relay。
- [x] `cargo check --workspace` 和 mobile typecheck 通过。
- [x] `https://openagentpal-production.up.railway.app/healthz` 返回 200。
- [ ] Harness 任务证据完整并完成 agent gate。

## 工作树（Worktree）

- 路径：主工作区
- 分支：`master`
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：当前工作区干净，改动范围小且无需并行隔离。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要真实手机、发布账号、Railway 控制台或 VPS 权限时停止并记录残余。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：不适用；通过默认值一致性检查、命令验证和 live healthcheck 覆盖。

## Subagent Delegation Decision

- Worker subagent：不使用。理由：改动集中在默认 URL 常量和任务/文档记录，拆分会增加同步成本。
- Reviewer subagent：不使用。理由：风险点明确，验证可由命令和 grep 覆盖。
- Worktree：不新建。理由：主工作区干净，无并行写入需求。

## 关联

- 相关 Regression Gate：RG-001 Cloud Relay Beta
- 审查报告：不适用
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`TASKS/2026-06-09-railway-relay-deploy-config-repair-1dfc4dbe`

## 模块关联

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接

- Global sync owner：不适用
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 Harness CLI 维护
- Closeout / Regression update needed：`coding-agent-harness/governance/regression/Regression-SSoT.md`
