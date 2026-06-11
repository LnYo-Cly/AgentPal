# AgentPal mobile APK IPA build - 审查

## 审查者身份（Reviewer Identity）

| Reviewer | Type | Scope |
| --- | --- | --- |
| Codex coordinator | self | Android release build fixes, APK artifact checks, iOS IPA feasibility |

## 审查范围

- 审查类型：adversarial / release
- 范围内：`apps/mobile` Android Gradle config、Expo app config、Android `MainApplication.kt`、EAS preview profile、APK artifact verification。
- 范围外：正式 keystore 创建、应用商店发布、用户 EAS/Apple 登录、真机 UI 测试。
- 来源材料：task plan、diff、Gradle build output、APK verification commands、EAS CLI status、Harness check。

## Agent Review Submission（Agent 提交审查）

本节由 agent 或 coordinator 在审查材料包准备好时填写。它只表示“提交待审”，不表示人工批准。

| Field | Value |
| --- | --- |
| Submission ID | pending task-review |
| Submitted At | pending task-review |
| Submitted By | coordinator |
| Task Key | 2026-06-11-agentpal-mobile-apk-ipa-build-d584f8ae |
| Materials Checklist Hash | pending task-review |
| Evidence Summary | Android APK built and verified; iOS blocked by EAS not logged in / Apple signing requirements |
| Open Findings Count | 0 blocking / 4 residual risks |
| Scanner Version | harness CLI |

### Material Checklist（材料清单）

| Material | Required? | Status | Evidence |
| --- | --- | --- | --- |
| Brief | yes | present | `brief.md` |
| Task plan | yes | present | `task_plan.md` |
| Progress and evidence | yes | present | `progress.md` |
| Visual map | yes | present | `visual_map.md` |
| Lesson candidate decision | yes | present | `lesson_candidates.md` records checked-none / no-candidate-accepted |
| Walkthrough or closeout link | yes | present | `walkthrough.md` |

## 信心挑战（Confidence Challenge）

直接回答：你是否对当前计划、实现和策略有 100% 信心？

- Verdict：no
- 如果不是 100%，剩余漏洞或证据缺口：
  - 没有连接 Android 真机，未做安装启动 smoke。
  - APK 使用 debug signing，只能作为 preview/testing 包。
  - IPA 需要 EAS/Apple 登录和签名凭据，本轮无法自动完成。
  - APK 只包含 `arm64-v8a`，不是全 ABI universal package。
- Fix loop count：4
- 当前结论：Android preview APK 的构建和静态产物验证已经足够收口；IPA 和真机安装属于外部账号/设备条件阻塞，不应继续猜测。

## 重要发现（Material Findings，表头供 checker 解析）

| ID | Severity | Finding | Evidence Checked | Required Action | Open | Disposition | Blocks Release | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 非阻塞备注（Non-Material Notes）

- Android release Gradle build prints deprecation warnings about Gradle 10 compatibility; not blocking current Expo SDK 54 preview APK.
- `apksigner` reports v2 signature only and Android Debug certificate; expected for current debug signing config.
- Build from deep Windows path can hit CMake/Ninja 260 character paths; short path mapping or CI/EAS avoids it.

## 已检查证据（Evidence Checked）

| Evidence ID | Type | Path | Summary |
| --- | --- | --- | --- |
| E-001 | command | TARGET:apps/mobile | `npm --prefix apps/mobile run typecheck` passed. |
| E-002 | command | TARGET:apps/mobile/android | `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --stacktrace` passed from short path. |
| E-003 | fixture | TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk | APK exists, 40,001,377 bytes, SHA256 B0E00C5E2A33B23BCDE434CB2352727CB78225D459BF5FE0F66F124A641B369D. |
| E-004 | command | TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk | `apksigner verify --verbose --print-certs` passed with v2 signature. |
| E-005 | command | TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk | `zipalign -c -p 4` passed. |
| E-006 | command | TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk | `aapt2 dump badging` confirmed `dev.agentpal.mobile`, `0.1.0`, minSdk 24, targetSdk 36, `arm64-v8a`. |
| E-007 | command | TARGET:apps/mobile | `npx eas-cli --version` returned `eas-cli/20.1.0`; `npx eas-cli whoami` returned `Not logged in`. |
| E-008 | command | TARGET:. | `git diff --check` passed; `harness check --profile target-project .` passed. |
| E-009 | report | URL:https://github.com/LnYo-Cly/AgentPal/releases/tag/mobile-v0.1.0-preview.1 | GitHub prerelease created with APK asset and matching SHA256 digest. |

## 无重要发现声明

本轮已检查上述证据，未发现阻塞 Android preview APK 交付的重要发现。iOS IPA 和真机安装是外部账号/设备条件，不是当前 diff 内可修复问题。

## 残余风险

| Risk | Owner | Accepted? | Follow-up |
| --- | --- | --- | --- |
| iOS IPA 未产出 | user | no | 登录 EAS 并配置 Apple signing 后运行 `npx eas-cli build --platform ios --profile preview`。 |
| Android 未做真机安装启动 | user/coordinator | yes for artifact delivery | 连接设备后运行 `adb install -r apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk`。 |
| APK 使用 debug keystore | coordinator | yes for preview | 正式发布前创建 release keystore / Play App Signing 配置。 |
| APK 仅 arm64-v8a | coordinator | yes for preview | 如需模拟器/旧机型覆盖，执行全 ABI 或 EAS Android build。 |

## Lifecycle Queue Routing（生命周期队列路由）

| Queue | Applies? | Reason | Exit condition |
| --- | --- | --- | --- |
| Review | yes | 已准备 agent review packet，可等待人工确认。 | 人工确认或退回。 |
| Missing Materials | no | 必需任务材料已补齐。 | n/a |
| Blocked | no | 无 open blocking finding；IPA 是外部凭据条件，不阻塞 Android APK 交付。 | n/a |
| Lessons | no | 构建踩坑已写入任务 findings 和 mobile README，本轮不提升全局 lesson。 | n/a |
| Confirmed / Finalized | no | 尚未人工确认。 | 人工确认后 closeout。 |
| Soft-deleted / Superseded | no | 任务仍 active。 | n/a |

## 后续路由（Follow-Up Routing）

- 任务计划：已更新 `task_plan.md`
- Progress：见 `progress.md`
- 发现记录：已更新 `findings.md`
- Regression SSoT：无
- Lessons：checked-none: 构建经验已保留在任务 findings 和 `apps/mobile/README.md`，不需要 promotion
- 收口记录：见 `walkthrough.md`

## 最终信心依据（Final Confidence Basis）

最终信心来自真实 Android release Gradle build、APK 签名/对齐/包元数据验证、TypeScript 检查和 Harness check。发布级信心仍需要正式签名、真机安装启动和 EAS/Apple iOS 构建证据。

## Agent Review Submission

| Field | Value |
| --- | --- |
| Submission ID | ARS-202606111311 |
| Submitted At | 2026-06-11 13:11 |
| Submitted By | agent |
| Task Key | TASKS/2026-06-11-agentpal-mobile-apk-ipa-build-d584f8ae |
| Materials Checklist Hash | cd91cff70dc8164d |
| Evidence Summary | Android preview APK built and verified; iOS IPA requires EAS login and Apple signing credentials |
| Open Findings Count | 0 |
| Scanner Version | task-scanner/2026-05-25-phase-kind |
| Target | TARGET:coding-agent-harness/planning/tasks/2026-06-11-agentpal-mobile-apk-ipa-build-d584f8ae |
