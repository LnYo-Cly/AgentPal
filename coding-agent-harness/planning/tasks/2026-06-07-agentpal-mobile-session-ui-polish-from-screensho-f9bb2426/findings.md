# AgentPal mobile session UI polish from screenshots - 发现

## 关键发现

### F-001 截图问题集中在单一移动端入口文件

- 背景：用户要求依次修复截图中的界面、元素、交互和视觉问题。
- 发现：`HomePage`、`SessionsPage`、`ProjectSessionRow`、`BottomNav` 和状态 helper 均位于 `apps/mobile/app/index.tsx`。
- 影响：可保持单文件小范围变更，无需 worker subagent 或跨模块改动。
- 后续：无。

## 决策记录

| 决策 | 选择 | 理由 | 未采用方案 | 状态 |
| --- | --- | --- | --- | --- |
| D-001 | 使用中性状态表达 idle/project ready | 解决绿色过度使用和“空闲/可继续/可恢复”混乱。 | 继续保留绿色状态点 | accepted |
| D-002 | 合并占位 workspace 到唯一真实 workspace | 解决 `当前项目` 与 `pocket_agent` 疑似重复。 | 保留两个项目卡片 | accepted |
| D-003 | 使用 typecheck + Expo export 作为主要自动验证 | 当前环境无法控制 iPhone 真机截图。 | 跳过构建验证 | accepted |

## 待确认问题

| 问题 | 当前可用判断 | 负责人 | 什么时候必须确认 |
| --- | --- | --- | --- |
| 真机视觉是否完全符合预期 | 自动检查已通过，仍需 Expo Go 视觉确认 | human | 用户查看热更新屏幕后 |
