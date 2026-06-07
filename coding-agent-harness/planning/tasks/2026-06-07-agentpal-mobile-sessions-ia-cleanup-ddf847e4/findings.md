# AgentPal mobile sessions IA cleanup - 发现记录

## 研究发现

### 主入口职责重复

- 背景：用户截图显示 `待处理` 和 `会话` 都在展示 Host 卡片、session 列表和普通状态卡，页面之间缺少明确分工。
- 发现：`HomePage` 同时承担 Host 状态、focus 卡、待处理队列、当前会话和最近事件；这让底部首项更像 dashboard，而不是需要处理的 inbox。
- 影响：本轮将 `HomePage` 收敛为 attention inbox；普通 session 浏览只保留在 `SessionsPage`。
- 后续：真机确认视觉层级和点击路径是否符合用户预期。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 待处理页职责 | 只显示 Host 离线、审批、失败、运行/思考 session | 符合“口袋 Agent 远程控制”场景，用户先知道是否需要操作 | 保留工作台 dashboard 指标卡 | accepted |
| 会话页结构 | 项目分组 session browser | 匹配 Codex desktop 的项目/session 心智，并适配手机纵向浏览 | 三指标卡 + 项目卡混合布局 | accepted |
| 数据协议 | 不改 Host/Relay | 本轮目标是 UI/IA，已有 sessions 数据足够支撑分组和待处理 | 新增后端 inbox API | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 真机视觉是否达到用户审美要求 | 命令验证通过，但仍需用户在 iOS/Android 真机确认 | user | 下一轮 UI 反馈 |
