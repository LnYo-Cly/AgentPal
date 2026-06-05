# AgentPal session history and inbox UX redesign

## Task ID

`2026-06-05-agentpal-session-history-and-inbox-ux-redesign-af6730dc`

## 创建日期

2026-06-05

## 一句话结果

让 AgentPal 手机端从“可连通的聊天页”升级为面向远程 Coding Agent 的移动工作台：首屏能加载真实历史，会话页不遮挡内容，首页突出待处理事项，设置页只承担连接与偏好。

## 完成后能得到什么

用户打开手机后能直接看到是否有审批、运行中会话、失败会话或最近完成任务；进入会话后能看到真实 Codex 历史和实时增量，Markdown、代码块、命令执行、工具调用以移动端友好的卡片呈现。设置页保留 Host/Relay、主题、通知、灵动岛诊断等环境能力，不再混入业务状态。本任务也会补齐必要的 Relay/Host 历史同步点，使旧 Codex session 不再因为只有内部 `session-started` / `state-changed` 事件而显示空白。

## 交付物

- 可见产物：iOS/Android Expo Go 可测试的三页结构、会话详情时间线、技能/命令入口、工具/代码详情弹层。
- 修改位置：`apps/mobile/app/index.tsx`、`apps/mobile/src/hooks/useAgentPalRelay.ts`、`apps/mobile/src/lib/relay.ts`、必要的 `crates/{protocol,relay,host}` 历史同步代码。
- 验证证据：TypeScript 检查、Rust 检查、Expo iOS export、真实 Relay history probe、任务进度记录。

## 第一眼应该看什么

1. `findings.md`：当前会话页空白的根因和 UI 设计决策。
2. `task_plan.md`：实现顺序和边界。
3. `progress.md`：命令证据、真机反馈和剩余风险。
4. `apps/mobile/app/index.tsx`：页面结构和时间线组件。

## 边界

- 范围内：移动端首页/会话/设置的结构和视觉；会话首屏历史加载；Host/Relay 为历史 hydration 增加的最小协议；技能/命令 picker 的真实数据展示和空态；代码块/工具详情移动端交互。
- 范围外：原生 Dev Build、iOS Live Activity 真上岛、Android 厂商灵动岛适配、Claude Code/OpenCode 完整 Host 接入、团队协作、云 Relay、推送通知上线。
- 停止条件：Codex app-server 不返回 thread turns、协议变化需要重写 Host 会话模型、Expo Go 不能验证的原生能力成为阻塞、或 dirty worktree 无法形成安全提交边界。

## 完成判断

- 会话页直接进入时会主动请求并展示可见历史；没有历史时显示明确空态，而不是无限“加载历史”或空白。
- 消息列表底部不会被 composer / 技能命令标签挡住；在底部时新消息自动跟随，不在底部时显示“新消息”入口。
- Markdown 列表、段落、行内代码和代码块保持结构；代码块有预览、复制、查看完整详情。
- 首页是待处理收件箱，不再重复堆砌大卡片；设置页只展示连接、偏好、诊断。
- `npm --prefix apps/mobile run typecheck`、Rust check、Expo export 和真实 history probe 通过或记录可解释 residual。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`，提交边界不能混入无关 dirty 改动。

## 当前下一步

补齐任务计划和设计决策后，先修复真实历史 hydration，再按页面职责重构移动端 UI。
