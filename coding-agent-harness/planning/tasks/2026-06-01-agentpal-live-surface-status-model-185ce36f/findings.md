# AgentPal live surface status model - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Live Surface 不是页面组件

- 背景：用户要求 iOS 灵动岛和 Android 类灵动岛适配，同时之前移动端页面曾出现页面级假 Dynamic Island。
- 发现：iOS 方向应通过 Live Activities / Dynamic Island；Expo 当前提供 iOS widgets / Live Activities 支持。Android 方向应通过官方 Live Updates / notification surface，不应依赖厂商私有悬浮 hack。
- 影响：AgentPal 需要 `LiveSurface` 抽象，普通 React Native 页面不得画假岛。
- 后续：后续实现任务再分别设计 iOS ActivityKit / Expo widgets 和 Android native module。

### 红黄绿只约束系统实时状态

- 背景：用户明确说红绿灯颜色先关注灵动岛即可。
- 发现：红色适合待确认，黄色适合工作中；绿色空闲不值得占用系统实时状态区域。
- 影响：MVP 和 UX 文档必须避免把整套 App UI 变成红黄绿主题。
- 后续：移动端普通 UI redesign 可参考该状态模型，但不得把绿色空闲推到 Live Surface。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| Live Surface publishing rule | red confirmation required > yellow working > clear | 保证系统级实时区域只承载需要用户注意或正在进行的任务。 | 绿色空闲常驻岛；全 App 使用红黄绿主题。 | accepted |
| Android compatibility | official Live Updates / progress notification first | 具备系统和商店审核边界，能被厂商 UI 自然接管。 | 厂商私有接口、悬浮窗、无障碍模拟岛。 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| iOS 具体实现用 Expo widgets 还是自定义 Expo module | 当前倾向先评估 `expo-widgets`，实现前再确认 SDK 限制。 | coordinator | iOS Live Surface 实现任务开始前 |
| Android 具体最低版本和 fallback 行为 | 当前按 Android Live Updates 可用时使用，否则普通通知 fallback。 | coordinator | Android Live Surface 实现任务开始前 |
