# AgentPal project explorer expand and file preview

Task Contract: harness-task/v1
Task Package Index: required

## 目标

让 AgentPal 会话页的“项目”面板从静态目录列表升级为可展开目录树，并支持点击文件通过 Host 获取只读预览。

## 范围

- 做什么：新增 file preview 协议、Relay 转发、Host 只读读取、移动端文件夹展开/收起和文件预览弹层。
- 不做什么：不实现文件编辑、二进制预览、图片预览、完整 Git diff 视图、项目搜索、权限审批策略变更。
- 主要风险：移动端快照路径与 Host canonical workspace 必须一致；文件预览不能越过 workspace；预览文件过大时需要截断；Expo Go 不应引入新的 native 依赖。

## 预算选择

选择预算：standard

选择理由：该任务跨移动端、协议、Relay 和 Host，但行为边界明确，不需要新增外部服务或复杂数据库迁移。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 会话页、项目面板、代码块预览和弹层 UI 都在此文件内 | coordinator |
| C-002 | code | TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts | 维护 Relay 连接状态、缓存和请求方法 | coordinator |
| C-003 | code | TARGET:apps/mobile/src/lib/relay.ts | 移动端 Relay 消息类型与请求构造函数 | coordinator |
| C-004 | code | TARGET:crates/protocol/src/lib.rs | Host、Relay、Mobile 共享协议 SSoT | coordinator |
| C-005 | code | TARGET:crates/relay/src/main.rs | Relay 消息广播与转发入口 | coordinator |
| C-006 | code | TARGET:crates/host/src/codex.rs | Workspace 快照和 Host 侧文件读取实现 | coordinator |

## 步骤

1. 扩展协议：新增 `FilePreviewRequest`、`FilePreview`、`file-preview-request`、`file-preview`。
2. 扩展 Relay：移动端请求转发给 Host，Host 响应转发给移动端，不在 Relay 缓存文件正文。
3. 扩展 Host：校验 workspace 边界，读取文本文件，检测二进制，限制最大字节并返回截断状态。
4. 扩展移动端 hook：缓存 file preview 状态，提供请求方法和超时错误。
5. 扩展会话页 UI：目录树支持展开/收起，文件点击打开只读预览弹层，预览支持复制和错误态。
6. 验证：运行移动端类型检查、Rust workspace check、格式化、Expo iOS export 和真实 WebSocket 预览探针。

## 验收标准

- [x] 点击文件夹能展开和收起子目录。
- [x] 点击文本文件能打开预览弹层。
- [x] 文件预览请求经过 Mobile -> Relay -> Host -> Relay -> Mobile 的真实链路。
- [x] Host 拒绝 workspace 外路径、目录和二进制内容。
- [x] 类型检查、Rust 检查、Expo export 和真实 probe 通过。

## 工作树（Worktree）

- 路径：`G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：改动集中在共享移动端入口和共享协议/Host/Relay链路，单 coordinator 顺序修改比并行切片更安全。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：若需要文件写入、越界访问或引入新 native 依赖则停止。

## 审查判定

- 是否需要对抗性审查：否，本轮是小范围功能切片，采用 self-review 加自动检查和真实链路探针。
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：无 P0/P1/P2 重要发现。

## 关联

- 相关 Regression Gate：移动端 Expo export、Rust workspace check、真实 file-preview WebSocket probe。
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI 同步
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：synced
- Registry update needed：不适用
- Harness Ledger update needed：已由 Harness CLI 同步
- Closeout / Regression update needed：`walkthrough.md` 已记录本轮收口证据
