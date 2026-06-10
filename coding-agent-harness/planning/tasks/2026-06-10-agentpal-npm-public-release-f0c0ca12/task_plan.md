# AgentPal npm public release

Task Contract: harness-task/v1
Task Package Index: required

## 目标

公开发布 npm 包 `agentpal`，让用户可以通过 `npx agentpal@latest pair` 或 `npm install -g agentpal && agentpal pair` 启动 AgentPal 手机配对。

## 范围

- 做什么：完善 npm 包元数据、README / LICENSE、发布文件白名单、CLI wrapper 在全局 / npx 安装后的 package root 和 workspace 解析，并执行 npm publish 与发布后验证。
- 不做什么：不实现预编译二进制包，不改 mobile UI，不替换 Railway 域名，不做 GitHub Release，不重构 Rust host / relay 协议。
- 主要风险：发布包过大或包含 mobile/Harness/keystore 等无关文件；全局安装后 CLI 在错误目录运行 cargo 或把用户 workspace 解析到包目录；npm 发布需要 OTP/2FA；源码型 npm 包要求用户本机有 Rust toolchain。

## 预算选择

选择预算：standard

选择理由：发布动作影响外部用户且不可直接回滚，需要任务包、发布前 tarball 审查、临时安装验证和发布后 registry 验证；但改动集中在 CLI/package release 面，不需要 complex 任务。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:package.json | npm 包名、版本、bin、files 白名单和 scripts 的事实源。 | coordinator |
| C-002 | code | TARGET:bin/agentpal.mjs | 公开 CLI wrapper，负责 npx/global 安装后的 cargo cwd、workspace 解析、默认 Relay 和 update notice。 | coordinator |
| C-003 | code | TARGET:Cargo.toml; TARGET:crates/host; TARGET:crates/relay; TARGET:crates/protocol | npm 包运行所需 Rust workspace。 | coordinator |
| C-004 | public-doc | TARGET:README.md; TARGET:LICENSE | npm 页面和开源许可说明。 | coordinator |
| C-005 | private-plan | TARGET:coding-agent-harness/planning/tasks/2026-06-10-agentpal-public-command-naming-41fcec16 | 前置命名决策：产品名 `AgentPal`，包/命令名 `agentpal`。 | coordinator |

## 步骤

1. 补齐任务计划和执行策略，确认不使用 worker subagent。
2. 修复 npm packaging：移除 private、补 license/readme/files 白名单，确保 CLI 从包根运行 cargo，同时把用户 workspace 解析为调用方目录。
3. 执行发布前验证：JSON 解析、CLI help、workspace 包装、cargo fmt/check/test、npm pack dry-run 和 tarball 内容审查。
4. 执行临时安装验证，模拟全局安装 / npx 用户路径。
5. 执行 `npm publish --access public`，再用 registry 和 npx 验证已发布包。
6. 更新 Harness progress/review/walkthrough/lesson，并提交推送。

## 验收标准

- [ ] `package.json` 可发布，包含 `name: agentpal`、非 private、MIT license、`bin.agentpal` 和 `files` 白名单。
- [ ] `npm pack --dry-run --json` 不包含 `apps/`、`coding-agent-harness/`、`.env`、`debug.keystore`、`target/`、`.git/` 或其它无关开发文件。
- [ ] 全局 / 临时安装后的 CLI 能显示 help，且 host/pair workspace 参数从用户当前目录解析。
- [ ] Rust workspace 相关检查通过：`cargo fmt --check`、`cargo check --workspace`、`cargo test -p agentpal-relay`。
- [ ] `agentpal@0.1.0` 发布成功，`npm view agentpal version` 和 `npx agentpal@latest --help` 验证通过。

## 工作树（Worktree）

- 路径：主 checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：`master`
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：`master`
- 未使用 worktree 的原因：本任务涉及 npm 登录态和实际 publish，由 coordinator 单线执行更安全；当前改动集中，没有可并行的独立写入切片。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：`long-running-task-contract.md`
- 连续执行权限：不适用
- Stop Condition 摘要：npm 2FA/OTP、包内容含敏感文件、发布前验证失败或 registry 名称不可用时停止。

## 审查判定

- 是否需要对抗性审查：是，轻量 release/security self-review
- 若是，报告文件：`review.md`
- Reviewer：self；发布后等待 human review confirmation，不由 agent 执行 `review-confirm`
- No-finding 要求：不得存在开放的 P0/P1/P2 发布阻塞发现；必须明确 package tarball 不含敏感/无关文件。

## 关联

- 相关 Regression Gate：RG-001 Cloud Relay Beta pair/create/claim/scoped-route；本任务不改协议，但验证 relay crate tests。
- 审查报告：TARGET:coding-agent-harness/planning/tasks/2026-06-10-agentpal-npm-public-release-f0c0ca12/review.md
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：TASKS/2026-06-10-agentpal-public-command-naming-41fcec16；TASKS/2026-06-10-agentpal-github-public-repository-rename-c0a78ac1

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：lifecycle CLI / governance rebuild
- Closeout / Regression update needed：`walkthrough.md`；Regression SSoT 无新增 gate
