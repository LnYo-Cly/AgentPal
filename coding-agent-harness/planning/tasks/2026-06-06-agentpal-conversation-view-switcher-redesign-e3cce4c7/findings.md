# AgentPal conversation view switcher redesign - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### F-001 分段栏语义应属于会话内容

- 背景：用户指出 `聊天 / 项目 / 变更` 固定在 header 下方，像第二层全局导航，布局不合理。
- 发现：`apps/mobile/app/index.tsx` 中 `ConversationPanelTabs` 原本作为 fixed header-adjacent control 渲染，且包含项目/变更数量 badge，导致顶部信息过载。
- 影响：将切换器移入各 panel 内容区，保留切换入口但降低视觉权重；数量信息不再放在切换器内。
- 后续：用户真机刷新后检查视觉手感。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| D-001 | 内容区轻量分段切换器 | 该控件只切换当前会话内部视图，不应该抢占 header 层级 | 保留固定全宽栏、放入主导航、改成 header 菜单 | accepted |
| D-002 | 移除切换器 badge | 顶部 badge 会把状态统计和视图切换混在一起，导致拥挤 | 保留 `项目 28` / `变更 1` badge | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 真机视觉是否符合用户预期 | 自动检查已通过，但视觉满意度需要用户刷新 Expo Go 后确认 | human | GATE-02 |
