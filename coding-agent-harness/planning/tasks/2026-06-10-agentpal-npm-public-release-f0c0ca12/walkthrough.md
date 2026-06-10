# 收口记录：AgentPal npm public release

## 摘要

`agentpal@0.1.0` 已发布到 npm。公开路径 `npm exec --yes agentpal@latest -- --help` 和 `npx --yes agentpal@latest --help` 均已验证通过。当前发布包是源码型 CLI 包，运行 host/relay 时仍需要用户本机具备 Rust toolchain。

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
| npm registry | `npm view agentpal version` | pass; `0.1.0` | `progress.md` |
| npm latest metadata | `npm view agentpal name version dist-tags.latest dist.tarball` | pass; latest `0.1.0` | `progress.md` |
| Public npm exec | `npm exec --yes agentpal@latest -- --help` | pass | `progress.md` |
| Public npx | `npx --yes agentpal@latest --help` | pass | `progress.md` |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| release self-review | F-001 npm 2FA/browser auth required | closed after successful publish and registry/npx verification | `review.md` |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| 曾在对话中暴露的 npm token 应撤销 | LnYo-Cly / npm account owner | no | 在 npm settings 中 revoke，并为后续自动化创建 scoped publish token |
| Source-based npm package requires Rust toolchain | release owner | yes | README documents this; prebuilt binaries should be a future task |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | yes, checked-none |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| npm package | `https://www.npmjs.com/package/agentpal` |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |
