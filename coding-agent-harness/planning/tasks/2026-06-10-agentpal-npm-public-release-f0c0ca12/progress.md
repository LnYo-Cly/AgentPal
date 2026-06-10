# AgentPal npm public release - 进度

## 状态：审查中

`## 状态` 是受控机器字段，只能使用以下值之一：

- `未开始`
- `计划中`
- `进行中`
- `审查中`
- `已阻塞`
- `已完成`

不要把 `计划审阅中`、`等待 coordinator pass`、`本地审查就绪` 等细粒度协作状态写入本字段。
这些状态应记录到进度记录、残余或协调者交接中。

## 进度记录

证据使用 `type:path:summary` 格式。

允许的 `type`：`command`, `diff`, `fixture`, `screenshot`, `review`, `report`。

证据较长或数量较多时，不要粘贴全文；放入 `artifacts/INDEX.md` 并在这里引用 ID。

## 残余

- npm 包已发布为 `agentpal@0.1.0`。剩余产品风险：当前 npm 包是源码型 CLI，用户本机需要 Rust toolchain；预编译二进制分发后续单独立项。

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：lifecycle CLI / governance rebuild
- 负责人：coordinator

### [2026-06-10 18:52] - release planning

- 做了什么：确认 npm 登录账号为 `lnyocly`，`npm view agentpal version` 返回 404，说明包尚未发布；补齐任务 brief、task plan 和 execution strategy，决定不使用 worker subagent。
- 验证结果：任务范围收敛到 npm 包公开发布；发布前必须完成 tarball 内容审查、临时安装验证、cargo 检查和发布后 registry / npx 验证。
- 下一步：修复 CLI wrapper 和发布包边界，然后执行验证。
- 证据：command:TARGET:.:npm whoami returned lnyocly; command:TARGET:.:npm view agentpal version returned E404 unpublished; diff:TARGET:coding-agent-harness/planning/tasks/2026-06-10-agentpal-npm-public-release-f0c0ca12:task package projectized for npm release

### [2026-06-10 19:05] - release preparation validated

- 做了什么：完善 npm 包元数据、README、MIT license、`files` 白名单和 `.tgz` ignore；修复全局 / npx 安装后的 CLI wrapper，使 cargo 从 npm 包根运行，同时把 `pair` / `host codex probe|connect` 的 workspace 参数解析为用户调用目录，默认 `agentpal pair` 使用当前目录。
- 验证结果：`package.json` 解析通过；`agentpal --help`、`agentpal pair --help`、`agentpal host codex connect --help` 通过；`cargo fmt --check`、`cargo check --workspace`、`cargo test -p agentpal-relay` 通过；`npm pack --dry-run --json` 只包含 13 个预期文件，denied file count 为 0；真实 `npm pack` tarball 约 47.7 kB；临时 npm prefix 全局安装后 `agentpal --help` 和 `agentpal host codex connect --help` 通过，运行行显示 workspace 为用户当前目录绝对路径。
- 下一步：等待 npm 2FA OTP 或 publish token 后重试发布。
- 证据：command:TARGET:.:node package metadata parse passed; command:TARGET:.:npm run agentpal -- --help passed; command:TARGET:.:npm run agentpal -- pair --help passed and appended absolute workspace; command:TARGET:.:npm run agentpal -- host codex connect --help passed; command:TARGET:.:cargo fmt --check passed; command:TARGET:.:cargo check --workspace passed; command:TARGET:.:cargo test -p agentpal-relay passed 9 tests; command:TARGET:.:npm pack --dry-run --json denied count 0, entryCount 13; command:TARGET:.:tar -tf agentpal-0.1.0.tgz listed only package files; command:TEMP:agentpal-prefix:temporary global install passed for help and host help

### [2026-06-10 19:05] - npm publish blocked

- 做了什么：执行 `npm publish .\agentpal-0.1.0.tgz --access public`。
- 验证结果：npm registry 接收发布请求并展示 tarball 内容，但返回 `E403 Forbidden`，原因是账号策略要求 two-factor authentication 或启用 bypass 2FA 的 granular access token。发布未成功；`agentpal` 仍不能声称已上传。
- 下一步：用户提供当前 npm OTP 后，用同一包内容重试 `npm publish`，再做 registry / npx 验证。
- 证据：command:TARGET:.:npm publish .\agentpal-0.1.0.tgz --access public failed with E403 two-factor authentication required

### [2026-06-10 20:01] - npm token publish attempt

- 做了什么：使用用户临时提供的 npm token 作为进程环境变量重试认证和发布；token 未写入 `.npmrc`，未提交，未记录明文。
- 验证结果：`npm whoami` 可识别账号 `lnyocly`，但 `npm publish .\agentpal-0.1.0.tgz --access public` 返回 `EOTP`，说明该 token 不是启用 bypass 2FA 的 publish token；npm 要求打开浏览器认证链接或提供一次性验证码。发布仍未成功。
- 下一步：用户用浏览器完成 npm CLI auth/passkey flow，或创建启用 `Bypass two-factor authentication` 且有 publish 权限的 granular access token；之后重试 publish。
- 证据：command:TARGET:.:NODE_AUTH_TOKEN npm whoami returned lnyocly; command:TARGET:.:npm publish with token failed with EOTP one-time password / browser auth required

### [2026-06-10 20:30] - npm publish verified

- 做了什么：用户完成 npm browser/passkey auth 后，确认 npm registry 已发布 `agentpal@0.1.0`；执行发布后 registry 和公开 npx/npm exec 验证。
- 验证结果：`npm view agentpal version` 返回 `0.1.0`；`npm view agentpal name version dist-tags.latest dist.tarball` 返回 `latest=0.1.0` 和 registry tarball URL；`npm exec --yes agentpal@latest -- --help` 通过；`npx --yes agentpal@latest --help` 通过。
- 下一步：提交 Agent Review Submission 材料；不执行 human `review-confirm`。
- 证据：command:TARGET:.:npm view agentpal version returned 0.1.0; command:TARGET:.:npm view agentpal name version dist-tags.latest dist.tarball returned latest 0.1.0 and registry tarball; command:TARGET:.:npm exec --yes agentpal@latest -- --help passed; command:TARGET:.:npx --yes agentpal@latest --help passed
