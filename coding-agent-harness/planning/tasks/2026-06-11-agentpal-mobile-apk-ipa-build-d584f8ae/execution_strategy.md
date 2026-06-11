# 执行策略

## Subagent Authorization

| Role | Status | Permission | Authorized By | Authorized At | Scope | Worktree / Branch | Reuse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| reviewer subagent | allowed by default | read-only | harness task policy | task creation | current task review | n/a | allowed within this task |
| worker subagent | not authorized | write only after user approval | pending | pending | pending | pending | allowed only within approved task/scope |

## Subagent Delegation Decision

| Question | Decision | Reason | Next Action |
| --- | --- | --- | --- |
| Should a reviewer subagent be used? | no | 构建失败点、产物验证和 iOS 阻塞都可由 coordinator 在本机直接复现；self adversarial review 足够覆盖本轮 preview 打包风险。 | 在 `review.md` 写入自审和残余风险。 |
| Would a worker subagent materially help? | no | 修改面集中在 `apps/mobile` Android/EAS 配置；并行 worker 会增加构建缓存、签名和 dirty 状态协调成本。 | 不申请 worker 授权。 |

## User Authorization Decision

| Gate | State | Decided By | Decided At | Scope | Worktree / Branch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| worker subagent | not-needed | coordinator | 2026-06-11 | mobile build packaging | same checkout | 单人串行执行更低风险。 |

## 决策表

| 决策 | 选择 | 说明 |
| --- | --- | --- |
| 主执行者 | coordinator | coordinator 负责构建修复、产物验证和任务收口。 |
| Subagent 模式 | none | 本轮不使用 worker；不需要只读 reviewer subagent。 |
| 审查模型 | self-check + release artifact checks | 通过真实 Gradle build、APK 工具链验证和 Harness check 支撑。 |
| Worktree 策略 | same checkout | 没有并行写入需求；构建产物被忽略。 |
| 冲突控制 | coordinator owns mobile build files | 只修改 `apps/mobile` 和当前任务包。 |
| 证据深度 | L2 | Android release build 和 APK 产物检查属于集成级证据；真机安装因无设备降级为残余。 |

## 子代理 / Worker 合同

| 角色 | 输入包 | 写入范围 | 交接要求 | 负责人 |
| --- | --- | --- | --- | --- |
| n/a | C-001..C-004 | n/a | n/a | coordinator |

## 证据计划

| 证据层级 | 计划命令或检查 | 记录位置 | 完成条件 |
| --- | --- | --- | --- |
| L0 | `git diff --check`; `harness check --profile target-project .` | `progress.md` | 无 whitespace error；Harness check 通过。 |
| L1 | `npm --prefix apps/mobile run typecheck` | `progress.md` | TypeScript 无错误。 |
| L2 | `gradlew assembleRelease`; `apksigner verify`; `zipalign`; `aapt2 dump badging` | `progress.md`、`review.md` | APK 生成、签名/对齐/包信息通过。 |
| L3 | iOS EAS build / Android 真机安装 | `review.md` 残余 | 需要用户登录 EAS/Apple 或连接设备，本轮不满足。 |

## 暂停 / 升级条件

- 需要 Expo/EAS 登录、Apple Developer 账号或 2FA。
- 需要正式 Android release keystore。
- 需要连接 Android/iOS 真机进行安装启动。
- reviewer/self-check 发现会影响安装包有效性的 P0/P1/P2 问题。
