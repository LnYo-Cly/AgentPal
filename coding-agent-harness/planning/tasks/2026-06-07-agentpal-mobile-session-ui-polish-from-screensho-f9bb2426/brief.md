# AgentPal mobile session UI polish from screenshots

## Task ID

`2026-06-07-agentpal-mobile-session-ui-polish-from-screensho-f9bb2426`

## 创建日期

2026-06-07

## 一句话结果

根据用户提供的 Expo Go 截图，修复移动端待处理页和会话页的状态语义、列表层级、路径展示和底部导航选中态。

## 完成后能得到什么

用户在手机端会看到更清晰的会话列表：无待办状态不再显示成“绿点清空”，普通就绪会话不再被绿色强调，当前会话有明确 badge，新建 Codex 会话呈现为新建入口，同一 workspace 的占位路径会并入真实项目，底部 Tab 选中背景被约束在导航胶囊内部。下一轮 agent 可直接从 `apps/mobile/app/index.tsx` 继续扩展 UI，而不需要重新梳理这些状态语义。

## 交付物

- 可见产物：待处理页、会话页和底部导航 UI polish。
- 修改位置：`apps/mobile/app/index.tsx`。
- 验证证据：`progress.md` 中记录 typecheck、Expo iOS export、diff check。

## 第一眼应该看什么

先看 `apps/mobile/app/index.tsx` 的 `HomePage`、`SessionsPage`、`ProjectSessionRow`、`BottomNav` 和 workspace/status helper，再看 `review.md` 的证据表。

## 边界

- 范围内：截图指出的移动端会话/待处理视觉和交互语义问题。
- 范围外：Relay/Host 协议、会话详情页行为、原生发布配置、后端连接逻辑。
- 停止条件：如果需要改变数据契约或后端 session model，必须另开任务。

## 完成判断

- “无待办”使用中性胶囊，不再显示绿色“清空”状态。
- 普通 idle session/project 使用中性“就绪”，绿色只保留给在线/成功语义。
- 会话副标题不再拼接长状态句，避免截图中的无意义截断。
- 当前会话和新建 Codex 会话有清晰区分。
- `npm --prefix apps/mobile run typecheck` 和 Expo iOS export 通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：审查中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据记录到 `progress.md`，agent review 提交后等待人工确认。

## 当前下一步

等待用户在 Expo Go 中确认真机视觉效果；如仍有偏差，用新截图继续修。
