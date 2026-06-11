# AgentPal mobile APK IPA build

## Task ID

`2026-06-11-agentpal-mobile-apk-ipa-build-d584f8ae`

## 创建日期

2026-06-11

## 一句话结果

产出一个可安装的 Android preview APK，并把 iOS IPA 的云构建入口和当前阻塞条件记录清楚。

## 完成后能得到什么

本任务完成后，项目可直接拿到一个用于 Android 真机侧载测试的 AgentPal APK，同时移动端原生 Android 工程能稳定通过 release 构建。iOS IPA 在 Windows 本机无法直接产出，本任务会补齐 EAS preview profile；后续只要完成 EAS 登录和 Apple Developer / iOS 签名凭据，就可以用同一移动端项目发起 iOS 云构建。

## 交付物

- 可见产物：`apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk`（本地生成物，已被 `.gitignore` 忽略）
- 修改位置：`apps/mobile/app.json`、`apps/mobile/eas.json`、`apps/mobile/android/**`
- 验证证据：`progress.md` 中的 typecheck、Gradle release build、APK signature、zipalign、aapt2 badging、EAS login 状态记录

## 第一眼应该看什么

先看 `progress.md` 的 APK artifact 和验证命令，再看 `review.md` 的残余风险：Android 产物为 debug keystore 签名的 preview APK；iOS IPA 因 EAS 未登录和 Apple 签名条件缺失未能在本轮自动产出。

## 边界

- 范围内：修复移动端 Android release 构建、产出 Android APK、补齐 EAS preview profile、记录 IPA 构建阻塞和后续命令。
- 范围外：创建正式 Android release keystore、上架 Play Store / App Store、代登录 EAS、代配置 Apple Developer 账号和证书。
- 停止条件：需要 Expo/EAS 账号、Apple Developer 凭据、2FA 或真机授权时，必须由用户完成登录或提供设备。

## 完成判断

- Android release 构建成功并生成 APK。
- APK 通过签名验证、zipalign 检查和包信息检查。
- TypeScript 检查通过。
- iOS IPA 的可行路径和阻塞条件记录在任务包中。
- Harness check 通过，任务证据已记录。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、`progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

提交 Android 构建修复切片；用户完成 EAS 登录后再发起 iOS `eas build --platform ios --profile preview`。
