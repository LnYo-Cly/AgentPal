# Harness v1 legacy migration - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### [发现主题 1]

- 背景：[为什么需要调查这个问题]
- 发现：[查到了什么事实，证据来自哪里]
- 影响：[这会如何改变计划、范围、实现或验证]
- 后续：[需要继续跟进的动作；如无写“无”]

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| [决策 1] | [选了什么] | [为什么这样选] | [未采用的方案] | proposed / accepted / superseded |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| [问题] | [当前可用判断] | [负责人] | [什么时候必须确认] |

## Legacy Migration Action Buckets

| Bucket | Count | Owner | Status | Next Action |
| --- | ---: | --- | --- | --- |
| warnings | 1 | coordinator | open | Triage before increasing target level |
| taskActions | 0 | coordinator | open | Upgrade only current/reopened/current-evidence tasks |
| legacyResiduals | 0 | coordinator | open | Assign real owner before full cutover |

## Residual Policy

Residuals require reason, owner, trigger, next action, and reviewer. Placeholder owner `migration-owner` is not a real owner.

## Status Conflict Table

| Item | Competing Evidence | Chosen Classification | Confidence | Human Needed |
| --- | --- | --- | --- | --- |
| pending | session / SSoT / progress / git | pending | medium | yes |
