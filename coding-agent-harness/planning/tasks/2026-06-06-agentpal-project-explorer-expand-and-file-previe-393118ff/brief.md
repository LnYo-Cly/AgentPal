# AgentPal project explorer expand and file preview

## Task ID

`2026-06-06-agentpal-project-explorer-expand-and-file-previe-393118ff`

## 创建日期

2026-06-06

## 一句话结果

会话页的“项目”面板可以展开文件夹，并且点击文件后通过 Host 读取只读文件预览。

## 完成后能得到什么

用户在手机端进入当前 Codex 会话后，不再只能看到一层静态目录列表。项目面板支持逐级展开文件夹，文件行可以打开预览弹层，直接查看文本文件内容、语言类型、大小、截断状态，并可复制内容。文件读取由电脑端 Host 完成，Relay 只负责转发请求和响应；Host 会校验路径必须位于当前 workspace 内，拒绝目录、二进制文件和越界路径，避免手机端直接访问任意本地路径。

## 交付物

- 可见产物：移动端项目目录可展开，文件可点开只读预览，文件预览弹层支持复制、加载、错误和截断状态。
- 修改位置：`apps/mobile/app/index.tsx`、`apps/mobile/src/hooks/useAgentPalRelay.ts`、`apps/mobile/src/lib/relay.ts`、`crates/protocol/src/lib.rs`、`crates/relay/src/main.rs`、`crates/host/src/codex.rs`。
- 验证证据：TypeScript typecheck、Rust workspace check、Rust format、diff check、Expo iOS export、真实 WebSocket file-preview probe。

## 第一眼应该看什么

1. 先看代码提交 `1888a74 feat(agentpal): add project file preview`。
2. 再看 `progress.md` 的验证记录和 `review.md` 的 agent review submission。
3. 如需确认行为，从手机端进入会话页，切到“项目”，展开文件夹并点击文本文件。

## 边界

- 范围内：项目面板展开/收起、文件预览请求协议、Relay 转发、Host 只读文件读取、移动端预览弹层和相关验证。
- 范围外：完整文件管理器、文件编辑、上传下载、图片/二进制预览、搜索、Diff 逐行查看、真实语音输入和 session 切换重构。
- 停止条件：文件预览需要写文件、越过 workspace、安全边界不清楚或需要引入新的 native Expo 模块时必须停止并回到用户确认。

## 完成判断

- “项目”面板中的文件夹点击后能展开和收起，子项按目录层级缩进显示。
- 文件行点击后会打开只读预览弹层，展示加载、成功、错误、截断和复制状态。
- Host 对文件路径进行 workspace 边界校验，并拒绝二进制、目录和越界文件。
- Relay 和移动端协议类型覆盖 `file-preview-request` 与 `file-preview`。
- `npm --prefix apps/mobile run typecheck`、`cargo check --workspace`、Expo iOS export 和真实 WebSocket 预览探针均通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：实现提交、验证证据、agent review 和人工确认 gate 都有明确状态。

## 当前下一步

等待人工在 Workbench 或手机端实际查看项目展开和文件预览交互；agent 不代办 `review-confirm`。
