# AgentPal mobile workbench and sessions IA correction

## Task ID

`2026-06-06-agentpal-mobile-workbench-and-sessions-ia-correc-a2978171`

## 创建日期

2026-06-06

## 一句话结果

把移动端 `工作台` 和 `会话` 两个顶层页面的职责重新分清：工作台只处理当前需要关注的 Agent 状态，会话页只按项目/工作区浏览 session。

## 完成后能得到什么

用户打开 AgentPal 时，底部导航将呈现清晰的三层关系：`工作台` 用来判断是否需要处理审批、失败、运行中任务或当前 Host 状态；`会话` 用来按项目/工作区查找和恢复 Codex、Claude Code、OpenCode session；`设置` 继续负责连接、主题和调试。这样不会在多个页面重复展示同一批 session，也不会把项目目录、会话列表、待处理队列混在一个页面里。

## 交付物

- 可见产物：移动端工作台页面精简、会话页面改为紧凑项目分组浏览器。
- 修改位置：`apps/mobile/app/index.tsx`。
- 验证证据：TypeScript check、Expo iOS export、Harness check、git diff check。

## 第一眼应该看什么

先看 `apps/mobile/app/index.tsx` 中的 `HomePage`、`SessionsPage`、`ProjectSessionGroupCard` 和 `BottomNav`，再看 `visual_map.md` 的 IA 对比图。

## 边界

- 范围内：顶层导航文案、工作台/会话页布局、session 分组列表、底部遮挡与安全区、项目名 fallback。
- 范围外：Host/Relay 协议、新会话真实创建、Claude Code/OpenCode 后端接入、会话详情里的 Markdown/代码渲染。
- 停止条件：需要新增协议字段或修改 Host/Relay 数据模型时停止并单独开任务。

## 完成判断

- `工作台` 不再显示完整 session 列表，只显示需要用户关注的事项和当前焦点。
- `会话` 页能按项目/工作区显示 session，且不再重复 HostStrip 和指标卡造成顶部堆叠。
- workspace 名为 `.` 或空值时不再显示点号，而是使用路径末段或“当前项目”。
- 页面底部内容不会被浮动导航遮挡。
- 相关静态检查和 Expo export 通过。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

重构 `apps/mobile/app/index.tsx` 中工作台和会话页的布局职责，并记录验证证据。
