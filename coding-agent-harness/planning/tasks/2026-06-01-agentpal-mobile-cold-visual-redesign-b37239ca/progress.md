# AgentPal mobile cold visual redesign - 进度

## 状态：进行中

## 进度记录

证据使用 `type:path:summary` 格式。

允许的 `type`：`command`, `diff`, `fixture`, `screenshot`, `review`, `report`。

证据较长或数量较多时，不要粘贴全文；放入 `artifacts/INDEX.md` 并在这里引用 ID。

## 残余

- Slash command / Skills / 工具面板仍是待接入状态，本次只把占位入口显式标注为待接入。
- Expo Go 不能验证原生 Liquid Glass / Live Activity / 灵动岛，只能验证页面 fallback 和设置页诊断。
- 当前 dirty state 阻塞 Harness lifecycle 写入和干净提交，需要后续单独整理提交边界。

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：CLI lifecycle write blocked by dirty-state; manual progress evidence recorded
- 负责人：coordinator

### [2026-06-01 09:21] - task-start

- 做了什么：Replace warm beige mobile UI with cold developer-tool visual system
- 验证结果：已记录
- 下一步：继续执行
- 证据：n/a

### [2026-06-03 23:33] - P0 mobile session UI fixes

- 做了什么：修复用户 iPhone 截图暴露的 P0 问题：会话流隐藏 `state-changed` 状态噪音和 Codex internal tool 事件；首页最近动态过滤 `reasoning`；history 实时合并时清除 loading；历史加载行只在 loading / 可加载 / 错误时显示；设置页连接成功态去掉重复三步配对卡片并增加底部安全区；首页与设置页统一活跃会话统计。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check -- apps/mobile/app/index.tsx apps/mobile/src/hooks/useAgentPalRelay.ts` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；Relay `history-request` 探针返回 `hostId=agentpal-local-host`、`sessionId=agentpal-codex-local`、`eventCount=5`、`hasMore=true`。
- 下一步：用户在 iOS Expo Go / Android 真机刷新页面复测；若仍有视觉问题，基于新截图继续做页面级调整。
- 证据：command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:git-diff-check:targeted diff check exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; command:relay-history-probe:history-page for `agentpal-codex-local`
- CLI lifecycle：`npx --yes coding-agent-harness task-phase 2026-06-01-agentpal-mobile-cold-visual-redesign-b37239ca EXEC-01 --state done --completion 100 --evidence present` 失败，错误为 `git status failed while inspecting transaction write scope`；本次手写任务证据。
- no-commit reason：当前工作树在本次 P0 修复前已经存在同一移动端文件和 Host/Relay/Harness 多处 dirty 改动，不能在未分离归属前提交，以免把历史未审改动混入本切片提交。

### [2026-06-04 00:14] - Screenshot-driven conversation polish

- 做了什么：根据用户 iOS 截图继续修正会话详情页：工具调用 start/finish 合并为单条可见事件；`commandExecution` 显示为「命令执行」而不是原始 tool name；长 PowerShell 命令从 `-Command '...'` 中提取核心命令并限制为两行；底部 `$ Skills`、`/ 命令`、`工具` 入口改为三等分，不再横向截断；会话内容底部留白增加，避免被输入区压住。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check -- apps/mobile/app/index.tsx` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；本机 Expo `8081`、Relay `8790`、Host 进程仍在线。
- 下一步：用户在 iOS Expo Go 刷新后复测会话页；如果工具事件仍显得过重，下一轮改成更轻的 inline timeline。
- 证据：command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:git-diff-check:index.tsx diff check exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; report:local-services:Expo 8081 / Relay 8790 / Host online

### [2026-06-04 00:30] - Tool detail bottom sheet

- 做了什么：继续压缩命令执行/工具调用事件：默认列表改成 48px 级一行工具事件，显示状态点、状态、标题、摘要和详情箭头；点击工具事件打开底部详情面板，展示摘要、核心命令、原始工具名和原始输出；`CommandBlock` 与 `ToolBlock` 统一进入同一套详情交互。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check -- apps/mobile/app/index.tsx` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；本机 Expo `8081`、Relay `8790`、Host 进程仍在线。
- 下一步：用户在 iOS Expo Go 刷新后点击命令执行行，确认底部详情面板的高度、内容和关闭交互是否合适。
- 证据：command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:git-diff-check:index.tsx diff check exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; report:local-services:Expo 8081 / Relay 8790 / Host online

### [2026-06-04 00:38] - Tool sheet density follow-up

- 做了什么：根据用户截图继续优化工具详情与底部入口：详情面板隐藏与命令重复的摘要；`原始工具` 改为 `工具类型`，`原始输出` 改为 `完整输出`；命令/完整输出代码块字号降低并使用紧凑 padding；完整输出限制高度并支持局部滚动；底部 `$ Skills`、`/ 命令`、`工具` 从双行大按钮压缩为 34px 单行胶囊，减少对会话区域的占用。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check -- apps/mobile/app/index.tsx` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；本机 Expo `8081`、Relay `8790`、Host 进程仍在线。
- 下一步：用户在 iOS Expo Go 刷新后复测详情面板是否仍重复、底部入口是否占屏过多。
- 证据：command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:git-diff-check:index.tsx diff check exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; report:local-services:Expo 8081 / Relay 8790 / Host online

### [2026-06-04 00:54] - Screenshot batch state and composer fixes

- 做了什么：根据用户 00:42 真机截图修复页面状态和交互冲突：设置页无本地 pairing 但已发现 Host 时显示 `Host 已发现 / 可配对`，不再和首页在线态矛盾；首页焦点会话改为审批、运行、失败、完成、新近优先，不再固定选 `agentpal-codex-local` 导致 `刚刚完成` 误占主视觉；首页最近动态增加当前会话状态兜底；会话页初始 history loading 与空状态互斥；发送成功不再弹 toast 覆盖消息；底部 `$` / `/` 命令入口改为输入对应前缀时才出现；设置页底部 padding 增加，避免浮动导航遮挡后续区块。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check -- apps/mobile/app/index.tsx` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；本机端口检查显示 Expo `8081` listening、Relay `8790` listening，Host / Relay / Expo 进程在线。
- 下一步：用户在 iOS Expo Go 刷新后复测首页、设置页和会话键盘场景；若仍出现底部遮挡，再按真机截图微调 composer lift 和 scroll padding。
- 证据：command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:git-diff-check:index.tsx diff check exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; report:local-services:Expo 8081 / Relay 8790 / Host online
- no-commit reason：当前工作树仍包含移动端、Host/Relay 和 Harness 多处既有 dirty 改动，本轮只追加证据，不把未分离归属的改动混入提交。

### [2026-06-04 01:26] - Markdown, follow-scroll, and command picker shell

- 做了什么：按用户要求使用现成 Markdown 库渲染 Agent Markdown，不自研解析器；Agent 回复支持段落、列表、粗体、inline code、代码块、链接和引用基础样式。会话页增加底部跟随逻辑：接近底部时新内容自动滚到底部，用户向上翻阅时不强制拉回，并显示 `新消息` 按钮；发送用户消息强制跟随到底部。初始 history loading 超过短时间无消息后切换为 `暂无最近消息`，不再长期停留在 loading。输入框上方增加 `技能`、`命令` 小标签，点击打开 bottom sheet；当前 Host 协议尚未提供真实列表时，面板明确显示 `Host 暂未提供列表` 并提供插入 `$` / `/`。设置页语义改为 `Host 在线 / 未固定`，按钮文案改为 `固定配对`，连接行显示 `未固定 · 已发现 <host>`；首页和设置页 `活跃` 改为 `工作中`，只统计 running / thinking / waiting-approval。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check -- apps/mobile/app/index.tsx apps/mobile/package.json apps/mobile/package-lock.json` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；端口检查显示 Expo `8081` listening、Relay `8790` listening，手机与本机 `8081/8790` 存在连接。
- 下一步：用户在 iOS Expo Go 刷新后复测 Markdown 样式、自动跟随、新消息按钮、技能/命令 bottom sheet 和设置页固定配对文案。
- 证据：command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:git-diff-check:targeted diff check exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; report:local-services:Expo 8081 / Relay 8790 online with phone connections
- no-commit reason：当前工作树仍包含移动端、Host/Relay 和 Harness 多处既有 dirty 改动，本轮继续只追加证据，不把未分离归属的改动混入提交。

### [2026-06-04 01:36] - Red screen markdown dependency replacement

- 做了什么：用户反馈 Expo Go 红屏后，检查 Markdown 依赖发现 `react-native-markdown-display` 依赖旧 `react-native-fit-image`；为降低 RN 0.81 / React 19 运行时兼容风险，卸载 `react-native-markdown-display`，改用 RN >= 0.76 的 `react-native-marked@8.1.0`。Agent bubble 改为 `useMarkdown` hook 渲染，避免把 Markdown 组件内部 FlatList 嵌套进会话 ScrollView；样式 key 同步改为 `react-native-marked` 的 `MarkedStyles`。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；旧 Expo Metro 进程已停止并用 `npx expo start --lan --clear` 后台重启，`8081` 处于 listening。
- 下一步：用户在 Expo Go reload，确认红屏消失；如果仍红屏，需要用户提供红屏错误文本或截图以定位具体 runtime stack。
- 证据：command:apps/mobile:npm uninstall `react-native-markdown-display`; command:apps/mobile:npm install `react-native-marked`; command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:tmp/expo-export-check:iOS bundle exported; report:metro-restart:Expo PID 77328, port 8081 listening

### [2026-06-04 09:56] - Markdown library final switch after Metro resolution failure

- 做了什么：用户提供红屏截图，确认 `react-native-marked` 包入口让 Metro 解析到 `src/index.ts` 后无法 resolve `./hooks/useMarkdown`。卸载 `react-native-marked`，改用更稳的组合：`marked@18.0.4` 负责 Markdown 解析，`react-native-render-html@6.3.4` 负责 React Native 渲染；这仍然使用现成库，不手写 Markdown parser。Agent bubble 改为 `marked.parse(..., { gfm: true, breaks: true })` + `RenderHTML`，并限制 content width，避免气泡内部撑屏。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`npm --prefix apps/mobile ls react-native-markdown-display react-native-marked react-native-render-html marked --depth=0` 显示仅保留 `marked` 与 `react-native-render-html`；`git diff --check -- apps/mobile/app/index.tsx apps/mobile/package.json apps/mobile/package-lock.json` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；Expo Metro 已清缓存重启，PID `77460`，`8081` listening。
- 下一步：用户在 Expo Go reload，确认红屏消失并检查 Markdown 样式。
- 证据：command:apps/mobile:npm uninstall `react-native-marked`; command:apps/mobile:npm install `react-native-render-html marked`; command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:apps/mobile:dependency tree only `marked` and `react-native-render-html`; command:tmp/expo-export-check:iOS bundle exported; report:metro-restart:Expo PID 77460, port 8081 listening

### [2026-06-04 10:06] - Replace ESM marked parser with markdown-it

- 做了什么：用户提供新红屏截图，确认 Metro 无法 resolve `marked`。卸载 `marked`，安装 `markdown-it@14.2.0` 和 `@types/markdown-it`；Markdown pipeline 改为 `markdown-it` 解析、`react-native-render-html` 渲染。`markdown-it` 是成熟 CommonJS 解析器，避免 `marked` 在 Metro 下的包解析问题。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`npm --prefix apps/mobile ls marked markdown-it react-native-render-html react-native-marked react-native-markdown-display --depth=0` 显示仅保留 `markdown-it` 与 `react-native-render-html`；`git diff --check -- apps/mobile/app/index.tsx apps/mobile/package.json apps/mobile/package-lock.json` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；Expo Metro 已清缓存重启，PID `73516`，`8081` listening。
- 下一步：用户在 Expo Go reload，确认红屏消失并检查 Markdown 样式。
- 证据：command:apps/mobile:npm uninstall `marked`; command:apps/mobile:npm install `markdown-it`; command:apps/mobile:npm install -D `@types/markdown-it`; command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:apps/mobile:dependency tree only `markdown-it` and `react-native-render-html`; command:tmp/expo-export-check:iOS bundle exported; report:metro-restart:Expo PID 73516, port 8081 listening

### [2026-06-04 10:31] - Expo Go SDK compatibility correction

- 做了什么：用户提供 Expo 白页后，曾根据旧 Metro 设备日志把 mobile 临时降到 SDK 53；用户随后的设备错误页明确显示 installed Expo Go 是 SDK 54、项目是 SDK 53，说明降级方向错误。本轮恢复到 SDK 54 兼容依赖：`expo@54.0.35`、`react-native@0.81.5`、`expo-router@6.0.24`、`expo-camera@17.0.10` 等；保留 `markdown-it@14.2.0` + `react-native-render-html@6.3.4`；补齐 Reanimated 4 peer `react-native-worklets@0.5.1`。
- 验证结果：`npx expo install --check` 通过；`npm --prefix apps/mobile run typecheck` 通过；`npm --prefix apps/mobile ls expo react-native-reanimated react-native-worklets react-native markdown-it react-native-render-html --depth=0` 显示 SDK 54 依赖树对齐；`npx expo export --platform ios --output-dir tmp/expo-export-check --clear` 成功导出 iOS bundle `_expo/static/js/ios/entry-f35c85377cf207523b79054e4e3a0425.hbc`；`http://192.168.1.13:8081/manifest?platform=ios` 返回 `runtimeVersion=exposdk:54.0.0`；`http://192.168.1.13:8081/status` 返回 `packager-status:running`；Metro PID `35428` 监听 `8081`。
- 下一步：用户在 iOS Expo Go 完全关闭旧错误页后重新扫码 / reload 复测。
- 证据：screenshot:user-device:Expo Go installed SDK 54 but project SDK 53; command:apps/mobile:SDK 54 dependency install; command:apps/mobile:expo-install-check dependencies up to date; command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:apps/mobile:dependency tree SDK 54 aligned; command:apps/mobile/tmp/expo-export-check:iOS bundle exported; command:metro-manifest:runtimeVersion `exposdk:54.0.0`; command:metro-status:packager running on `192.168.1.13:8081`

### [2026-06-04 12:22] - Raw Markdown newline and real picker registry

- 做了什么：按用户要求先排查原始 Agent 输出，而不是直接归咎 Markdown 渲染库。直连 Codex app-server 测试确认原始 `item/agentMessage/delta` 和 `item/completed.agentMessage.text` 均能保留 Markdown 列表换行；Relay 旧历史中的列表变成一行，根因是 Host 旧代码用 `delta.trim().is_empty()` 过滤，导致纯换行 delta 被丢弃。修复 Host 为只过滤真正空字符串，并在 `item/completed` 时发布 `complete=true` 的完整 `agent-message`，移动端用完整消息替换同一轮流式 delta。新增 `PickerRegistry` 协议，Relay snapshot 存储并下发 picker registry，Host 通过 Codex app-server `skills/list` / `plugin/list` 获取真实 skills/plugins，并补充 Codex slash command registry；移动端 `技能` / `命令` 面板改为展示 Host registry。首屏 history 自动加载改为连接和会话 ready 后补拉，避免必须先发送消息才出现历史。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`cargo check --workspace` 通过；`cargo fmt --all` 已执行；`git diff --check -- apps/mobile/app/index.tsx apps/mobile/src/hooks/useAgentPalRelay.ts apps/mobile/src/lib/relay.ts crates/protocol/src/lib.rs crates/relay/src/main.rs crates/host/src/codex.rs` exit 0，仅 Windows LF/CRLF warning；`npx expo export --platform ios --output-dir ../../tmp/expo-export-check --clear` 成功导出 iOS bundle；新 Relay/Host 已启动，Relay PID `73364`，Host PID `76376`，Codex app-server `37943` listening；picker snapshot 返回 `total=60`、`slash=11`、`dollar=49`、skills 包含 `$academic-paper-writer`、`$agent-browser` 等；真实 newline probe 返回流式拼接 `1. Alpha\n2. Beta\n3. Gamma`，completed text 同样为 `1. Alpha\n2. Beta\n3. Gamma`；history probe 返回 latest complete text 且 `completeHasNewlines=true`；Expo dev server `8081` manifest 返回 200。
- 下一步：用户在 iOS Expo Go reload 后复测：Markdown 列表应正常分行；点击 `技能` / `命令` 应展示真实列表并插入输入框；进入会话页应自动加载最近历史。
- 证据：probe:codex-raw-app-server:delta joined equals completed text with newlines; probe:relay-picker-snapshot:`agentpal-codex-local` registry total 60 slash 11 dollar 49; probe:relay-newline:joined and completed text both preserve `\n`; probe:relay-history:newest complete agent-message preserves `\n`; command:apps/mobile:typecheck `tsc --noEmit` exit 0; command:cargo-check workspace exit 0; command:git-diff-check targeted exit 0 with line-ending warning only; command:tmp/expo-export-check:iOS bundle exported; report:local-services:Relay 8790 / Host / Codex 37943 / Expo 8081 online
- no-commit reason：当前工作树仍包含移动端、Host/Relay、协议、Harness 和 Android/配置等多处既有 dirty 改动，本轮修复涉及共享协议与运行时服务，继续不混合提交，等待用户确认提交边界。
