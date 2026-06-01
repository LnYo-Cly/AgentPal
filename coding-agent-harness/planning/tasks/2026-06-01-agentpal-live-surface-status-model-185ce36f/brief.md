# AgentPal live surface status model

## Task ID

`2026-06-01-agentpal-live-surface-status-model-185ce36f`

## 创建日期

2026-06-01

## 一句话结果

沉淀 AgentPal 的系统级 Live Surface 状态模型，明确 iOS 灵动岛 / Live Activities 与 Android Live Updates 只承载红色待确认和黄色工作中，绿色空闲不上岛。

## 完成后能得到什么

完成后，下一轮移动端 UI 或原生能力实现不需要重新讨论“灵动岛应该显示什么”。项目会有一份可引用的 `live-surface-status-model.md`，把 Live Surface 定义为系统级能力，而不是页面内假组件；同时记录红/黄/绿的发布边界、平台映射、事件合同和 UX 约束。MVP、UX、技术栈和架构事实源会同步指向这份规范，避免后续把空闲绿色状态做成常驻岛、把 Android 厂商私有悬浮能力当成主路线，或把普通 App 页面 UI 误改成红黄绿主题。

## 交付物

- 可见产物：Live Surface 状态模型文档和 SSoT 更新。
- 修改位置：`context/architecture/live-surface-status-model.md`、`context/product/mvp-scope.md`、`context/product/ux-principles.md`、`context/architecture/technical-stack-decision.md`、`context/architecture/Architecture-SSoT.md`、本任务包。
- 验证证据：`rg` 关键字检查、`harness status --json .`、`git diff --check`。

## 第一眼应该看什么

先读 `coding-agent-harness/context/architecture/live-surface-status-model.md`，再读 `Architecture-SSoT.md` 的 `ARCH-009`。若要实现平台能力，再读 `technical-stack-decision.md` 的 Live Surface 行。

## 边界

- 范围内：产品/架构 SSoT 和任务包文档；记录 iOS/Android Live Surface 状态模型和红黄绿发布规则。
- 范围外：不实现 iOS ActivityKit、Expo widgets、Android native module、推送服务、通知权限 UI，也不重做普通 App 页面。
- 停止条件：如果需要决定具体原生实现细节、App Store / Play Store 审核策略或厂商私有 API，必须开后续实现任务。

## 完成判断

- `live-surface-status-model.md` 明确 Live Surface 是系统级能力，不是页面内 Dynamic Island。
- 状态优先级写清：红色待确认 > 黄色工作中 > 不显示；绿色空闲不上岛。
- iOS、Android 平台映射和 fallback 边界写入架构文档。
- MVP、UX、技术栈和 Architecture SSoT 都引用或反映该决策。
- 验证命令通过，任务包有进度、审查和收口记录。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

完成 SSoT 文档更新后运行静态检查与 harness 状态检查。
