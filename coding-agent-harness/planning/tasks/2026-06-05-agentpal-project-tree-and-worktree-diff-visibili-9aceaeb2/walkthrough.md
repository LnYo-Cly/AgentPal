# 收口记录：AgentPal project tree and worktree diff visibility

## 摘要

本轮为 AgentPal 会话页增加了真实 workspace 可见性：手机端可在会话内切换 `聊天 / 项目 / 变更`，查看当前 Host 工作区目录摘要和 Git worktree 变更摘要。数据来自电脑端 Host 的只读 filesystem/Git 扫描，经 Relay 转发到移动端。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | protocol、Relay、Host Codex bridge、mobile relay hook、mobile conversation UI |
| 新增文件 | 无 |
| 删除文件 | 无 |
| 不在范围内 | 完整 patch viewer、文件打开/编辑、Git 操作、Claude Code/OpenCode workspace adapter |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| Rust formatting | `cargo fmt --all` | pass | `progress.md` |
| Mobile typecheck | `npm --prefix apps/mobile run typecheck` | pass | `progress.md` |
| Rust workspace check | `$env:CARGO_TARGET_DIR='tmp/target-agentpal-workspace-check'; cargo check --workspace` | pass | `progress.md` |
| Diff whitespace | `git diff --check` | pass | `progress.md` |
| Expo bundle | `npx expo export --platform ios --output-dir ..\..\tmp\expo-export-agentpal-workspace --clear` | pass | `progress.md` |
| Live workspace probe | WebSocket `workspace-request` to `ws://127.0.0.1:8790/ws` | pass | `treeEntries=28`, `hiddenSeen=[]`, one dirty worktree with file stats |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| self-review | 0 | 可进入人工真机确认 | `review.md` |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| 当前实测环境只有一个 Git worktree | coordinator | yes | 后续在真实多 worktree 环境回归 |
| 完整 patch viewer 未实现 | product / coordinator | yes | 后续独立 Diff Detail 任务 |
| 真机 UI 仍需人工查看 | human | yes | 用户在 Expo Go 中打开会话页的 `项目` / `变更` 面板 |
| Harness lifecycle CLI 仍受旧 dirty 风险影响 | coordinator | yes | 代码已单独提交为 `0997857`；任务材料单独提交 |

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
| 发现记录 | `findings.md` |
