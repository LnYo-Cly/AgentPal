# AgentPal terminal QR output guard

Task Contract: harness-task/v1
Task Package Index: required

## 目标

让 `agentpal pair` 默认输出终端二维码，并把公共 relay 的配对串压缩到足够短，避免终端换行或窗口重排导致二维码失真。

## 范围

- 做什么：host 端默认终端 QR、relay 端短 `pair_id/pair_token`、mobile 端短参数解析、CLI help、README、目标测试
- 不做什么：移动端 UI 重做、工作流重构、部署编排改造、用户迁移
- 主要风险：公共 relay 需要部署更新后才能体现 relay 侧的短 token，窄终端仍可能触发明确的跳过提示

## 预算选择

选择预算：standard

选择理由：这是一次多文件但边界明确的产品修复，需要代码、文档和烟测证据一起收口。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:crates/host/src/codex.rs | 默认 QR 输出、终端渲染和配对串生成都在这里 | coordinator |
| C-002 | code | TARGET:crates/relay/src/main.rs | 公共 relay 的 `pair_id/pair_token` 生成逻辑在这里 | coordinator |
| C-003 | code | TARGET:apps/mobile/src/lib/pairing.ts | 需要兼容短参数和旧参数 | coordinator |
| C-004 | public-doc | PUBLIC:README.md | 用户可见的命令和行为描述 | coordinator |
| C-005 | code | TARGET:coding-agent-harness/planning/tasks/2026-06-11-agentpal-terminal-qr-output-guard-85f60655/progress.md | 证据日志和收口依据 | coordinator |

## 步骤

1. 识别默认配对串中哪些字段必须保留，哪些可以压缩或省略。
2. 实现 host / relay / mobile 的一致改动，并同步 CLI 与 README。
3. 用 Rust 单测和真实 local relay 烟测验证输出形状。

## 验收标准

- [x] `agentpal pair` 默认直接输出终端二维码
- [x] 不再默认输出二维码 SVG 文件路径
- [x] 公共 relay 配对串使用短参数和短 token
- [x] 手机端兼容短格式和旧格式配对串
- [x] host 单测和本地 relay 烟测通过

## 工作树（Worktree）

- 路径：same checkout
- 分支：master
- Worker owner：不适用
- Worker handoff commit required：no
- Coordinator integration branch：master
- 未使用 worktree 的原因：范围窄，且没有并行 worker 切片

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：如果公共 relay 必须等外部部署完成，记录残余风险后停在 review

## 审查判定

- 是否需要对抗性审查：是
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：reviewer 无重要发现

## 关联

- 相关 Regression Gate：n/a
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：synced
- Registry update needed：不适用
- Harness Ledger update needed：`task_plan.md`, `review.md`, closeout pending
- Closeout / Regression update needed：`walkthrough.md`
