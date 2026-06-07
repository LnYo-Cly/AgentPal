# 任务产物索引

仅在任务产生较多证据或大体量产物时使用，例如命令输出、截图、fixture、生成报告、review transcript、导出的数据文件等。核心任务文件只引用这里的 ID，不粘贴长输出。

| ID | Type | Path | Summary | Produced By |
| --- | --- | --- | --- | --- |
| ART-001 | command | TARGET:. | `cargo fmt --check` passed after formatting Rust changes. | coordinator |
| ART-002 | command | TARGET:. | `cargo check --workspace` passed for protocol, relay, and host. | coordinator |
| ART-003 | command | TARGET:. | `cargo test -p agentpal-relay` passed 2 relay pairing/security tests. | coordinator |
| ART-004 | command | TARGET:apps/mobile | `npm --prefix apps/mobile run typecheck` passed. | worker + coordinator |
| ART-005 | command | TARGET:. | Real local WebSocket smoke passed: Host pair-create, Mobile pair-claim, intruder reject, deviceToken reconnect, command routed to Host. | coordinator |
| ART-006 | command | TARGET:. | `npm exec -- oap --help` passed, proving source checkout exposes `oap` bin wrapper. | coordinator |
| ART-007 | commit | TARGET:. | Worker handoff commit `4fc7e91 feat(mobile): support cloud relay pairing payloads`; coordinator integrated persistence and security follow-up. | worker + coordinator |

## 使用规则

- 路径必须可复查；临时终端输出应先保存为稳定文件再登记。短命令证据也可由 `progress.md` 引用当轮命令记录。
- 产物如果包含敏感信息，先脱敏或改为记录复查方式，不要提交原始敏感内容。
- 与 `review.md`、`progress.md`、walkthrough 互相引用时，使用 `ART-xxx` ID。
