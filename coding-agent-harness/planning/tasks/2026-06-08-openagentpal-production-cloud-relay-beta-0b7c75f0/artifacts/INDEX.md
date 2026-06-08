# 任务产物索引

仅在任务产生较多证据或大体量产物时使用，例如命令输出、截图、fixture、生成报告、review transcript、导出的数据文件等。核心任务文件只引用这里的 ID，不粘贴长输出。

| ID | Type | Path | Summary | Produced By |
| --- | --- | --- | --- | --- |
| ART-001 | command | TARGET:. | `cargo fmt --check` passed after formatting Relay changes. | coordinator |
| ART-002 | command | TARGET:. | `cargo test -p agentpal-relay` passed 9 tests covering Redis store, pair claim, duplicate host rejection, host-origin rejection, scoped snapshot, unpaired history rejection, device-token reconnect, and command routing. | coordinator |
| ART-003 | command | TARGET:. | `cargo check --workspace` passed for protocol, host, and relay. | coordinator |
| ART-004 | command | TARGET:. | `OAP_REDIS_TEST_URL=redis://127.0.0.1:6379 cargo test -p agentpal-relay redis_pairing_store_claim_consumes_and_persists_device_binding -- --nocapture` passed against local Redis. | coordinator |
| ART-005 | command | TARGET:. | Real local WebSocket smoke passed with Redis strict mode: empty unpaired snapshots, unpaired history/command rejected, pair claim issued device token, scoped snapshot after verified reconnect, command routed to host. | coordinator |
| ART-006 | command | TARGET:. | `npm exec -- oap --help` passed and shows default `wss://relay.openagentpal.com/ws` plus local override. | coordinator |
| ART-007 | command | TARGET:. | `git diff --check` passed; CRLF warnings are Git working-copy line-ending notices only. | coordinator |
| ART-008 | command | TARGET:. | `docker --version` failed because Docker is not installed; compose runtime verification remains residual. | coordinator |
| ART-009 | review | TARGET:. | Read-only reviewer subagent found P0 fixed-host-id hijack and P0/P1 global read/write leaks; coordinator mitigated via dynamic host IDs, duplicate host rejection, scoped snapshots/routing, history authorization, and host-origin checks. | Sartre reviewer + coordinator |
| ART-010 | command | TARGET:. | `harness check --profile target-project .` passed; only dirty-state warning remained before committing this evidence batch. | coordinator |

## 使用规则

- 路径必须可复查；临时终端输出应先保存为稳定文件再登记。短命令证据可由 `progress.md` 引用本轮命令记录。
- 产物如果包含敏感信息，先脱敏或改为记录复查方式，不要提交原始敏感内容；Redis smoke 仅记录 key prefix，不提交 device token。
- 与 `review.md`、`progress.md`、walkthrough 互相引用时，使用 `ART-xxx` ID。
