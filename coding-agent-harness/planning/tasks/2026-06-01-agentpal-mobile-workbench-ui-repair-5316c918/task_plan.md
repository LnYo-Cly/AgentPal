# AgentPal mobile workbench UI repair

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复 AgentPal 手机首页的移动端体验和真机开发连接，让用户重新扫码后看到真实工作台而不是原型图拼接页或 mock 会话。

## 范围

- 做什么：替换首页 UI 结构、增加真实空状态和点击反馈、让指令发送到选中 session、修正真机 Relay URL 推断和本地开发脚本。
- 不做什么：不实现完整审批协议、Diff 详情、命令/skill picker、语音输入、生产云 Relay。
- 主要风险：当前环境不能直接看用户手机屏幕；Expo/Relay 端口可能受防火墙或同网段限制影响。

## 预算选择

选择预算：standard

选择理由：涉及移动端 UI、真实连接配置和本地验证，超过简单修补但不需要复杂架构重设。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 手机首页实现和用户反馈的主要修复面。 | coordinator |
| C-002 | code | TARGET:apps/mobile/src/lib/relay.ts | 真机和模拟器的 Relay 默认地址选择。 | coordinator |
| C-003 | code | TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts | 输入指令提交到选中 session 的数据流。 | coordinator |
| C-004 | code | TARGET:package.json | 本地开发脚本需要匹配真机访问方式。 | coordinator |

## 步骤

1. 移除首页原型图拼接、页面级 Dynamic Island 和 mock 会话 fallback。
2. 重建移动端工作台结构：Host 概览、当前会话、审批、会话列表、最近动态、输入栏和底部导航。
3. 补齐点击反馈、toast、空输入提示、选中 session 提交。
4. 修正真机 Relay URL 推断和开发脚本监听地址。
5. 运行类型检查、diff 检查，启动 Relay/Expo 验证监听状态。

## 验收标准

- [x] 首页不再引用 `uiAssets`、`ImageBackground` 或页面级 Dynamic Island。
- [x] 无真实会话时显示真实空状态，不展示 mock 会话。
- [x] 主要控件点击有反馈，输入提交会根据状态给出 toast。
- [x] `relay.submit` 支持传入选中 session id。
- [x] 真机默认 Relay URL 优先使用 Expo host IP，Relay 开发脚本监听 `0.0.0.0`。
- [x] `npm --prefix apps/mobile run typecheck` 和 `git diff --check` 通过。
- [x] 会话页底部输入区按实际高度预留滚动空间，不再遮挡最新消息。
- [x] 首次进入会话页会主动拉取最近历史；若最新页只有隐藏状态事件，会继续拉取更早消息。
- [x] Agent Markdown 回复使用现有 `markdown-it` + `react-native-render-html` 渲染，列表缩进和气泡宽度适配手机阅读。
- [x] 技能/命令面板优先展示 Host 同步的真实 `PickerRegistry`，空列表时才降级插入 `$` 或 `/` 前缀。
- [x] 设置页区分 Host 已发现、未保存和已连接状态，底部内容为浮动导航预留更大安全区。

## 工作树（Worktree）

- 路径：当前 checkout
- 分支：当前分支
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：不适用
- 未使用 worktree 的原因：小范围同模块修复，且没有并行 worker。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要手机屏幕人工确认或网络/防火墙介入时停止。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：无 P0/P1/P2 阻塞发现。

## 关联

- 相关 Regression Gate：移动端 TypeScript 检查和本地真机连接监听检查。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`2026-05-31-agentpal-local-end-to-end-mobile-host-relay-loop-c90f483a`

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
