# Railway Relay deploy config repair

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复 Railway 将 OpenAgentPal Relay 误识别为 Railpack/Rust 自动构建并报
`No start command detected` 的部署失败，使 Railway 能按 Relay Dockerfile 构建并启动服务。

## 范围

- 做什么：新增 Railway config-as-code；让 Relay Docker entrypoint 自动读取 Railway `PORT`；补充 Railway Redis 和 healthcheck 部署说明。
- 不做什么：不真实操作 Railway 控制台、不部署 VPS、不提交任何真实密钥或 Redis URL。
- 主要风险：Railway 实际运行环境需要用户在控制台绑定 Redis 变量并重新部署；本地环境可能无法运行 Docker 做完整容器验证。

## 预算选择

选择预算：simple

选择理由：这是针对 Railway 部署失败的窄幅配置修复，代码面和验证面都较小。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:deploy/relay/relay.Dockerfile; TARGET:deploy/relay/README.md | Relay 当前 Docker 部署入口和说明。 | coordinator |
| C-002 | external | URL:https://docs.railway.com/config-as-code/reference | Railway config-as-code 支持 builder、Dockerfile path、healthcheck、restart policy。 | coordinator |
| C-003 | external | URL:https://docs.railway.com/deployments/start-command | Dockerfile/Image 默认使用 Dockerfile `ENTRYPOINT`/`CMD`，自定义 start command 会覆盖 entrypoint。 | coordinator |

## 步骤

1. 增加 `railway.toml`，显式选择 Dockerfile builder、Dockerfile path 和 `/healthz`，不覆盖 Dockerfile entrypoint。
2. 增加 Relay Docker entrypoint，默认监听 `0.0.0.0:${PORT:-8790}`。
3. 更新 Railway 部署说明，写清 Redis 变量、fallback `RAILWAY_DOCKERFILE_PATH` 和验证命令。
4. 运行格式、测试和 Harness 检查，提交并推送到 GitHub。

## 验收标准

- [x] 仓库侧 Railway 配置显式选择 Dockerfile builder，避免默认 Railpack/Rust 自动检测。
- [x] Relay Docker entrypoint 可通过 `PORT` 启动，并暴露 `/healthz`。
- [x] 文档说明 Redis 变量、重部署和 `wss://<domain>/ws` 验证方式。

## 工作树（Worktree）

- 路径：主工作区
- 分支：`master`
- Worker owner：coordinator
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：窄幅配置和文档修复，未发现无关 dirty 改动且无需并行隔离。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：需要真实 Railway 控制台权限、Redis URL 或部署结果时停止并交给用户操作。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：不适用；以配置审查和命令验证为准。

## Subagent Delegation Decision

- Worker subagent：不使用。理由：本切片只改 Railway/Docker 配置、部署文档和当前任务材料，写入范围小且互相耦合，拆分会增加集成成本。
- Reviewer subagent：不使用。理由：Railway 配置风险已通过官方文档、diff 审查和本地命令验证覆盖；不涉及复杂业务逻辑或安全敏感实现。
- Worktree：不新建。理由：主工作区仅含本任务生成/修改文件，当前没有并行写入需求。

## 关联

- 相关 Regression Gate：RG-001 Cloud Relay Beta
- 审查报告：不适用
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：`TASKS/2026-06-08-openagentpal-production-cloud-relay-beta-0b7c75f0`

## 模块关联

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接

- Global sync owner：不适用
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 Harness CLI / governance rebuild 维护
- Closeout / Regression update needed：仅更新当前任务 `walkthrough.md` 和 `progress.md`
