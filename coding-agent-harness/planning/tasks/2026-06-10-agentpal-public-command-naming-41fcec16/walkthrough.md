# 收口记录：AgentPal public command naming

## 摘要

完成当前产品表面命名收敛：公开 CLI 从 `oap` / `openagentpal` 改为 `agentpal`，帮助文案显示 `AgentPal CLI`，移动端设备名改为 `AgentPal Mobile`，移动端配对地址只接受 `agentpal://pair`。现网 Railway 域名保留不动，历史 Harness 审计文本不做机械改写。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | CLI wrapper、mobile pairing、mobile relay device name、local setup context、Relay deploy README、task docs |
| 新增文件 | `bin/agentpal.mjs` |
| 删除文件 | `bin/oap.mjs` |
| 不在范围内 | `npm publish`、预编译二进制分发、GitHub 仓库重命名、Railway 域名替换、历史任务 ID 批量改写 |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| CLI script help | `npm run agentpal -- --help` | pass; shows `AgentPal CLI` and `agentpal pair` | `progress.md` |
| npm bin execution | `npm exec -- agentpal --help` | pass; package bin resolves to `bin/agentpal.mjs` | `progress.md` |
| Mobile typecheck | `npm --prefix apps/mobile run typecheck` | pass | `progress.md` |
| Current surface grep | `rg` for `oap` / `openagentpal://pair` / `OpenAgentPal CLI` in package/bin/mobile | pass; no current user-surface remnants | `progress.md` |
| Diff whitespace | `git diff --check` | pass | `progress.md` |
| Harness check | `harness check --profile target-project .` | pass after implementation commit | `progress.md` |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| self review | 0 blocking findings | accepted; no open material findings | `review.md` |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| npm publish / npx public install not done | release owner | yes | 后续 npm release task |
| GitHub repo name still `OpenAgentPal` remotely | repository owner | yes | 用户在 GitHub 重命名后更新 remote |
| Railway endpoint still contains `openagentpal-production` | deployment owner | yes | 后续品牌域名或 VPS 任务 |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | yes, checked-none |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |
