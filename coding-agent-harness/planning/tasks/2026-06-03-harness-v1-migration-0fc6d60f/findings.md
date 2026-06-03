# Harness v1 legacy migration - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### 当前项目已经具备 v2 manifest 基线

- 背景：用户要求先迁到 v2 manifest 布局再执行迁移轨道。
- 发现：`migrate-structure --plan` 和 `--apply` 均返回 `already-v2`，没有文件移动，`harness.yaml` 已存在。
- 影响：迁移重点不是结构搬迁，而是 safe-adoption capability、session evidence、dirty-state 和 review gate 对齐。
- 后续：不做 full-semantic rewrite，除非用户另行确认。

### Dirty checkout 是唯一机器 warning

- 背景：normal/strict check 均需要判断是否可进入 cutover。
- 发现：failures 为 0，warnings 为 1，warning 是 dirty-state。taskActions、visualMapActions、legacyResiduals 均为 0。
- 影响：full-cutover 验证可通过 session gate，但项目仍需要在后续工作中清理或分离业务 dirty。
- 后续：迁移任务只记录 dirty-state owner，不混提交业务改动。

### 本地 skill 安装产物不应入仓

- 背景：用户要求安装并读取 Coding Agent Harness skill。
- 发现：`npx skills add ...` 在当前 repo 下生成 `.agents/skills/coding-agent-harness` 和 `skills-lock.json`。
- 影响：如果不忽略，会把工具缓存误判为项目 dirty。
- 后续：已把 `.agents/` 和 `skills-lock.json` 加入 `.gitignore`。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| 迁移模式 | status-aware-rewrite baseline | 已有 9/9 brief 和 canonical visual_map，没必要全量重写历史 | baseline-preserve 太浅；full-semantic-rewrite 成本高 | accepted |
| dirty 处理 | 允许 dirty migration session，但不混提交业务 dirty | 用户确认当前 dirty 可作为既有工作切片；CLI 也要求 `--allow-dirty` | 先强制清理工作树 | accepted |
| 本地 skill 缓存 | `.gitignore` 忽略 | 它是 agent 工具安装产物，不是项目交付物 | 删除缓存或提交缓存 | accepted |
| subagent | 不使用 worker | 写入范围集中，dirty checkout 下并行会增加冲突 | worker worktree | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 是否提供外部资料 | 当前未提供；若超过 5 份应走 external-source-packs | user | 深度重写或外部系统实现前 |
| 是否清理既有 mobile/host/relay dirty | 不在本任务范围 | user / coordinator | 下一次提交或继续开发前 |
| 是否执行 human review confirmation | 只能由用户在 workbench 中确认 | user | 本任务 closeout 前 |

## Legacy Migration Action Buckets

| Bucket | Count | Owner | Status | Next Action |
| --- | ---: | --- | --- | --- |
| warnings | 1 | coordinator | accepted-risk | dirty-state 已记录，后续通过分离提交或 clean-tree 处理 |
| taskActions | 0 | coordinator | closed | 无需升级任务正文 |
| legacyResiduals | 0 | coordinator | closed | 无 legacy residual |

## Residual Policy

Residuals require reason, owner, trigger, next action, and reviewer. Placeholder owner `migration-owner` is not a real owner.

## Status Conflict Table

| Item | Competing Evidence | Chosen Classification | Confidence | Human Needed |
| --- | --- | --- | --- | --- |
| dirty-state | status/check/session/git | accepted residual for migration baseline | high | yes, before unrelated commit cleanup |
| human review gate | visual_map/review/workbench | pending human confirmation | high | yes |
