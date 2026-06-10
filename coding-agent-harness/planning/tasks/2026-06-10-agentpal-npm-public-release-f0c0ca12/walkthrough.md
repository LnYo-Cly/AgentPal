# 收口记录：AgentPal npm public release

## 摘要

本轮已完成 `agentpal` npm 首发前准备：公开 CLI 包装、包元数据、README、MIT license、发布文件白名单、tarball 审查、Rust 检查和临时全局安装验证均已通过。真实 `npm publish` 已尝试，但被 npm 账号 2FA 策略阻塞，尚未发布成功。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | npm package metadata、CLI wrapper、Rust workspace license、release docs、Harness task package |
| 新增文件 | `README.md`、`LICENSE`、`docs/plans/2026-06-10-agentpal-npm-public-release-design.md` |
| 删除文件 | none |
| 不在范围内 | mobile UI、Relay 域名替换、预编译二进制分发、GitHub Release、VPS 部署 |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Package metadata | `node -e ... require('./package.json')` | pass | `progress.md` |
| CLI help | `npm run agentpal -- --help` | pass | `progress.md` |
| Pair wrapper | `npm run agentpal -- pair --help` | pass; workspace appended as caller cwd | `progress.md` |
| Host passthrough | `npm run agentpal -- host codex connect --help` | pass | `progress.md` |
| Rust format | `cargo fmt --check` | pass | `progress.md` |
| Rust build | `cargo check --workspace` | pass | `progress.md` |
| Relay tests | `cargo test -p agentpal-relay` | pass; 9 tests | `progress.md` |
| Tarball dry-run | `npm pack --dry-run --json` plus denied path check | pass; 13 files, denied count 0 | `progress.md` |
| Tarball listing | `tar -tf agentpal-0.1.0.tgz` | pass; expected files only | `progress.md` |
| Temporary install | `npm install --prefix <temp> -g agentpal-0.1.0.tgz` and installed CLI help | pass | `progress.md` |
| npm publish | `npm publish .\agentpal-0.1.0.tgz --access public` | blocked; E403 requires 2FA or bypass token | `review.md` |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| release self-review | F-001 npm 2FA required | open; blocks release | `review.md` |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| npm publish requires OTP / publish token | LnYo-Cly / npm account owner | no | Provide current OTP or configured publish token, then retry publish and verify registry/npx |
| Source-based npm package requires Rust toolchain | release owner | yes | README documents this; prebuilt binaries should be a future task |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | pending until publish succeeds |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |

## 下一步

收到 npm OTP 后执行：

```powershell
npm pack --json
npm publish .\agentpal-0.1.0.tgz --access public --otp <code>
npm view agentpal version
npm exec --yes agentpal@latest -- --help
```
