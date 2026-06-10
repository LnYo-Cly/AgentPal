# Default public relay endpoint - 进度

## 状态：进行中

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

- 品牌域名 `relay.openagentpal.com`、VPS 部署和 npm 生产分发仍未完成；owner=deployment/release owner；下一步=后续发布任务。
- 真实手机扫码未在本地会话执行；owner=product/testing owner；下一步=用户用 Expo Go/手机扫描 `oap pair` 输出二维码。

## 协调者交接

- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 Harness CLI 维护
- 负责人：coordinator

### [2026-06-10 06:26] - task-start

- 做了什么：Start default public relay endpoint update
- 验证结果：已记录
- 下一步：继续执行
- 证据：n/a

### [2026-06-10 14:36] - implementation

- 做了什么：将 CLI wrapper、Rust Host CLI 和手机端默认 Relay 切换为 Railway 公网端点，保留高级 override；新增设计说明并更新部署文档/Regression SSoT。
- 验证结果：待运行 Rust、mobile、CLI、live healthcheck 和 Harness 检查。
- 下一步：运行验证并记录证据。
- 证据：diff:TARGET:.:default public relay endpoint changed to Railway domain

### [2026-06-10 14:45] - verification

- 做了什么：验证默认公网 Relay 在 CLI、Rust Host、手机端和 live Relay 里的可用性，并确认 Regression SSoT 更新。
- 验证结果：`npm run oap -- --help` 展示默认 `wss://openagentpal-production.up.railway.app/ws`；`cargo run -p agentpal-host -- codex connect --help` 因默认 target 中 `agentpal-host.exe` 被占用失败，随后用 `CARGO_TARGET_DIR=target/default-public-relay-check` 通过并显示同一默认值；`cargo fmt --check`、`cargo check --workspace`、`cargo test -p agentpal-relay`、`npm --prefix apps/mobile run typecheck`、`git diff --check`、`harness check --profile target-project .` 均通过；live `/healthz` 返回 200 和 `{"ok":true,"service":"agentpal-relay","version":"0.1.0"}`。
- 下一步：提交实现切片，执行 `visual_map.md` 中的 agent gate 并推送。
- 证据：command:TARGET:.:npm run oap -- --help passed with Railway default; command:TARGET:.:CARGO_TARGET_DIR=target/default-public-relay-check cargo run -p agentpal-host -- codex connect --help passed with Railway default; command:TARGET:.:cargo fmt --check passed; command:TARGET:.:CARGO_TARGET_DIR=target/default-public-relay-check cargo check --workspace passed; command:TARGET:.:CARGO_TARGET_DIR=target/default-public-relay-check cargo test -p agentpal-relay passed 9 tests; command:TARGET:apps/mobile:npm --prefix apps/mobile run typecheck passed; command:TARGET:.:git diff --check passed; command:URL:https://openagentpal-production.up.railway.app/healthz:200 health response; command:TARGET:.:harness check passed with dirty-state warning before commit
