# AgentPal mobile APK IPA build

Task Contract: harness-task/v1
Task Package Index: required

## 目标

为 AgentPal mobile 产出可安装 Android APK，并准备 iOS IPA 的 EAS 云构建路径。

## 范围

- 做什么：修复 Android release 构建、生成 preview APK、增加 EAS preview profile、记录 iOS 构建阻塞。
- 不做什么：不生成正式发布 keystore，不绕过 Apple 签名，不代用户登录 Expo/EAS 或 Apple Developer。
- 主要风险：Windows 本地不能产出 IPA；React Native 新架构会触发 CMake/Kotlin 构建链；本地 APK 使用 debug keystore 仅适合测试。

## 预算选择

选择预算：standard

选择理由：涉及原生 Android 构建配置、构建产物验证、iOS 云构建路径和 Harness 证据，超出 simple 任务。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/package.json | 确认 Expo SDK、React Native、脚本和依赖版本 | coordinator |
| C-002 | code | TARGET:apps/mobile/app.json | 同步 Expo 新架构和包标识配置 | coordinator |
| C-003 | code | TARGET:apps/mobile/android | 修复 Android Gradle、Hermes、新架构入口和忽略规则 | coordinator |
| C-004 | code | TARGET:apps/mobile/eas.json | 准备 Android APK / iOS internal preview 云构建 profile | coordinator |

## 步骤

1. 检查移动端依赖和当前 Android 构建失败点。
2. 修复 Gradle 仓库、Hermes compiler 路径、新架构配置和 Android `MainApplication.kt` 模板不兼容问题。
3. 在短路径映射下执行 Android release 构建，规避 Windows 260 字符路径限制。
4. 复制 APK 到 `apps/mobile/dist/`，记录 SHA256、签名、zipalign 和 badging 证据。
5. 检查 EAS CLI 登录状态，记录 iOS IPA 阻塞和后续命令。

## 验收标准

- [x] `npm --prefix apps/mobile run typecheck` 通过。
- [x] Android `assembleRelease` 成功并生成 APK。
- [x] APK 通过 `apksigner verify` 和 `zipalign -c -p 4`。
- [x] APK 包名、版本、SDK 和 ABI 已用 `aapt2 dump badging` 核对。
- [x] IPA 未能自动产出时，阻塞原因和用户下一步明确记录。

## 工作树（Worktree）

- 路径：same checkout `G:\My_Project\python\gitlab\pocket_agent`
- 分支：current branch
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：current branch
- 未使用 worktree 的原因：任务集中在单个移动端工程和本机/EAS 构建条件，不需要并行 worker。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：需要 EAS/Apple 登录或真机授权时停止。

## 审查判定

- 是否需要对抗性审查：是
- 若是，报告文件：`review.md`
- Reviewer：self
- No-finding 要求：无开放 P0/P1/P2；残余必须明确 owner 和后续动作。

## 关联

- 相关 Regression Gate：mobile typecheck、Android release build、APK artifact checks
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：不适用
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：task lifecycle CLI / governance rebuild
- Closeout / Regression update needed：`progress.md`、`review.md`、`walkthrough.md`
