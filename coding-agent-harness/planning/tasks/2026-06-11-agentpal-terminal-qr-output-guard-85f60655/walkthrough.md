# AgentPal terminal QR output guard - Walkthrough

## 目标

把默认配对流程改回终端二维码，并让公共 relay 的配对串足够短，避免窗口变化破坏二维码。

## 改动概览

| 范围 | 结果 |
| --- | --- |
| `crates/host/src/codex.rs` | 默认终端 QR，取消默认 SVG 路径，使用低纠错等级生成更短二维码 |
| `crates/relay/src/main.rs` | 公共配对默认生成短 `pair_id` / `pair_token` |
| `apps/mobile/src/lib/pairing.ts` | 兼容短参数 `r/h/n/t/p/d/k/x` 和旧参数 |
| `README.md` / `bin/agentpal.mjs` | 对外文案回到“终端 QR 默认” |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Rust 单测 | `cargo test -p agentpal-host pair_url_ -- --nocapture` | 通过 | `progress.md` |
| Relay 单测 | `cargo test -p agentpal-relay` | 通过 | `progress.md` |
| 组合检查 | `cargo check -p agentpal-host -p agentpal-relay` | 通过 | `progress.md` |
| 本地冒烟 | 启动本地 relay 后运行 `npm run agentpal -- pair --workspace . --relay-url ws://127.0.0.1:8899/ws --timeout-seconds 3 --codex-port 38993` | 打印短配对串 `agentpal://pair?r=...&p=...&h=...&t=...` | `progress.md` |

## 审查结论

没有新的重要发现。唯一残余是公共 Railway relay 还需要把 relay-side 的短 token 改动部署到线上，之后再做一次公共环境复测。

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| 公共 relay 部署传播尚未确认 | coordinator | no | 等待部署完成后复测默认公共 pairing |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | 是 |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |
