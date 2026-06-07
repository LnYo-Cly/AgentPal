# 任务参考资料索引

仅在任务需要外部资料、跨仓上下文、reviewer 输入包或生成参考材料时使用。不要把无关背景资料堆进来。

| ID | Type | Path | Summary | Used By |
| --- | --- | --- | --- | --- |
| REF-001 | code | TARGET:crates/protocol/src/lib.rs | Shared Relay/Host/Mobile message contract for pair create/claim and device credentials. | coordinator / worker / reviewer |
| REF-002 | code | TARGET:crates/relay/src/main.rs | Relay route authorization and in-memory pair/device registry behavior. | coordinator / reviewer |
| REF-003 | code | TARGET:crates/host/src/codex.rs | Host CLI connect loop and pairing URL/QR output. | coordinator / reviewer |
| REF-004 | code | TARGET:apps/mobile/src/lib/pairing.ts;TARGET:apps/mobile/src/lib/relay.ts;TARGET:apps/mobile/src/hooks/useAgentPalRelay.ts | Mobile pairing parser, register payload, pair claim, and device token persistence. | worker / coordinator / reviewer |

## 使用规则

- 每条参考资料都要说明用途，否则不要登记。
- 外部链接需要写清访问日期或版本线索，避免后续复查时语境漂移。
- reviewer 或 worker 只应读取与其 scope 相关的条目。
