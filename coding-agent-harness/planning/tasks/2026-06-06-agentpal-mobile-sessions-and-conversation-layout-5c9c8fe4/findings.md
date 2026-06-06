# AgentPal mobile sessions and conversation layout correction - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。阻塞性问题写入 `review.md`。

## 研究发现

### 会话详情的面板切换位置不应属于消息流

- 背景：用户截图中“聊天 / 项目 / 变更”分段栏位于标题下方内容区，并随不同面板重复出现，视觉上像一条额外卡片。
- 发现：原实现把 `ConversationPanelTabs` 放在聊天 `FlatList` 的 `ListHeaderComponent`，并在 `WorkspacePanel` 内重复渲染。这个结构会让模式切换跟随内容滚动，也会占用项目 / 变更面板首屏。
- 影响：将面板切换收进固定 `ConversationHeader`，项目 / 变更面板只保留业务内容。
- 后续：真机确认 header 高度、安全区和内容顶部 inset 是否舒适。

### 项目 / 变更面板应优先展示可操作内容

- 背景：用户希望看到项目目录和 worktree diff，之前首屏先出现大型工作区摘要卡。
- 发现：`WorkspaceSummaryCard` 在项目和变更面板都占据较大首屏空间，但信息和 header / section 重复。
- 影响：替换为 `WorkspaceCompactHeader`，保留路径、更新时间和数量摘要，把目录和变更列表上移。
- 后续：完整 diff viewer 仍属于后续功能，不在本轮实现。

### 会话索引应按项目组织，但项目层不应显示动作状态

- 背景：用户参考 Codex 桌面端项目侧栏，希望移动端展示项目及其 session，但当前移动端看起来像首页卡片堆叠。
- 发现：项目组之前显示“可继续”等 ToneCapsule，容易被理解为可点击动作；真正可打开的是 session row。
- 影响：项目层只展示项目名、路径、session 数、最近时间和聚合风险；session 行展示具体状态和打开入口。
- 后续：如要支持“新建会话”，应在项目组内加入明确的新会话操作，而不是复用状态标签。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 面板切换位置 | 固定在会话 header 内 | 避免跟随消息流滚动和重复渲染 | 保留在内容区顶部 | accepted |
| 项目 / 变更上下文 | 使用紧凑 header | 保留必要上下文并让业务内容上移 | 大型摘要卡 | accepted |
| 会话页组织 | 项目摘要 + session rows | 符合远程 Codex 多 session 管理模型 | 首页式统计卡 / 全部 session 平铺 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 真机视觉是否满足用户预期 | 静态检查通过，但需要 iOS / Android 截图确认 | human | Expo Go 复测后 |
