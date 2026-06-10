# AgentPal public command naming

## Task ID

`2026-06-10-agentpal-public-command-naming-41fcec16`

## 创建日期

2026-06-10

## 一句话结果

AgentPal 的当前公开命令、配对 scheme、帮助文案和移动端设备名统一为 `agentpal` / `AgentPal`，不再把 `oap` 或 `OpenAgentPal` 作为用户入口。

## 完成后能得到什么

完成后，下一轮 npm 发布准备可以围绕一个一致的产品名推进：包名 `agentpal`、公开命令 `agentpal`、配对地址 `agentpal://pair`、产品文案 `AgentPal`。当前代码不会再引导用户使用 `oap` 或 `openagentpal`。Railway 平台域名和历史 Harness 审计记录保持不动，避免破坏现网连接和任务追溯。

## 交付物

- 可见产物：`agentpal pair --workspace .` 成为 CLI help 和源码态脚本主路径。
- 修改位置：`package.json`、`bin/agentpal.mjs`、`apps/mobile/src/hooks/useAgentPalRelay.ts`、`apps/mobile/src/lib/pairing.ts`、当前开发上下文文档、设计文档。
- 验证证据：CLI help、本地 agentpal 脚本、mobile typecheck、git diff check、Harness check。

## 第一眼应该看什么

先看 `docs/plans/2026-06-10-agentpal-public-command-naming-design.md`，再看 `package.json` 和 `bin/oap.mjs` 的入口变化，最后看 `progress.md` 的验证记录。

## 边界

- 范围内：当前公开 CLI 名称、pairing scheme、help 文案、移动端 deviceName、开发上下文里仍指向 `oap` 的活跃说明。
- 范围外：npm 真实发布、GitHub 仓库重命名、Railway 域名变更、历史任务 ID / 历史审计记录批量改写、预编译二进制分发。
- 停止条件：改动需要触发真实外部发布，或需要替换现网 Relay 域名。

## 完成判断

- `package.json` 公开 bin / script 使用 `agentpal`，不再暴露 `oap` 或 `openagentpal`。
- CLI help 显示 `AgentPal CLI` 和 `agentpal pair` 用法。
- 手机端只接受当前公开配对 scheme `agentpal://pair`。
- 手机端默认 deviceName 使用 `AgentPal Mobile`。
- `openagentpal-production.up.railway.app` 仍保留为当前 Relay URL。
- 相关检查通过并记录到 `progress.md`。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

更新任务计划与设计文档，然后修改公开命令入口和验证。
