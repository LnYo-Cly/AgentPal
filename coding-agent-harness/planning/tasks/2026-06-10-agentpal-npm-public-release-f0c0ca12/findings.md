# AgentPal npm public release - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### npm 包名与账号状态

- 背景：发布前需要确认 npm 包名是否可用，以及当前会话是否具备 npm 登录态。
- 发现：`npm whoami` 返回 `lnyocly`；`npm view agentpal version` 返回 E404，说明 `agentpal` 尚未发布或当前账号不可见该包。
- 影响：可以继续准备首次公开发布，但必须在 publish 前完成包内容审查。
- 后续：发布被 2FA 阻塞，需要 OTP 或合适的 publish token。

### npm 发布包边界

- 背景：首次 `npm pack --dry-run` 曾暴露包过大风险，可能包含 mobile app、Harness 文档和 Android debug keystore。
- 发现：`package.json` 的 `files` 白名单收敛后，`npm pack --dry-run --json` 只包含 13 个文件：CLI wrapper、Rust workspace、README、LICENSE、Cargo 文件和 package metadata；denied file count 为 0。
- 影响：当前 tarball 可用于公开 npm 发布，不会把 mobile/Harness/keystore 一起发出。
- 后续：后续新增发布产物时继续用 deny-list 脚本审查。

### npm 2FA 发布阻塞

- 背景：执行 `npm publish .\agentpal-0.1.0.tgz --access public`。
- 发现：npm 返回 E403，要求 two-factor authentication 或允许 bypass 2FA 的 granular access token。
- 影响：代码和 tarball 已准备好，但 npm registry 尚未发布成功。
- 后续：用户提供当前 OTP 或配置 publish token 后重试。
## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 首次 npm 交付形态 | 源码型 CLI 包 | 当前 Rust host/relay 已可通过 `cargo run` 工作，先公开可用路径；预编译二进制需要额外 build matrix 和校验设计。 | 等预编译二进制完成后再发布 | accepted |
| 发布文件控制 | `files` 白名单 | npm 包只应包含 CLI 必需源码和文档，避免将 mobile app、Harness、keystore 或本地产物发布。 | 依赖 `.npmignore` 黑名单 | accepted |
| workspace 解析 | Node wrapper 按调用方 cwd 归一化 | 全局 / npx 安装时 cargo 必须在包根运行，但用户 workspace 应保持用户执行目录语义。 | 让用户传绝对路径 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| npm publish 2FA | 需要当前 OTP 或 publish token，当前会话无法绕过 npm 安全策略。 | LnYo-Cly / npm account owner | 发布成功前 |
