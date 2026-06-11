# AgentPal mobile APK IPA build - 发现记录

本文件记录任务执行中形成的判断、事实和技术决策。它不是审查报告；阻塞性问题请写入 `review.md`。

## 研究发现

### Android release build blockers

- 背景：用户需要 APK/IPA 打包；初始 Android release build 不能完成。
- 发现：构建依次暴露出 Aliyun Maven DNS/仓库不可用、`hermes-compiler/package.json` 不存在、Android SDK env 未设置、Reanimated 4 要求 New Architecture、Windows 260 字符路径、`MainApplication.kt` 与 Expo SDK 54 template 不兼容等问题。
- 影响：需要同时修复 Gradle repository、Hermes compiler path、New Architecture 配置和 Android app entrypoint，且构建命令需在短路径下执行。
- 后续：保留 README 打包说明，后续如要稳定 CI 打包，应迁移到 EAS Build 或 CI runner 的短路径 workspace。

### iOS IPA build path

- 背景：当前执行环境是 Windows。
- 发现：Windows 本地无法用 Xcode 签名产出 IPA；EAS CLI 可用但 `whoami` 返回 `Not logged in`。
- 影响：本轮只能准备 `eas.json` 和记录命令，不能自动完成 IPA。
- 后续：用户登录 EAS 并完成 Apple Developer / signing credentials 后运行 `npx eas-cli build --platform ios --profile preview`。

## 技术决策

| 决策 | 选择 | 原因 | 替代方案 | 状态 |
| --- | --- | --- | --- | --- |
| Android repository source | 官方 `google()` / `mavenCentral()` / `gradlePluginPortal()` | Aliyun mirror 解析失败且不适合作为默认跨环境源 | 继续使用 Aliyun mirror | accepted |
| Hermes compiler path | React Native bundled `sdks/hermesc/<platform>` | 当前依赖树没有独立 `hermes-compiler/package.json`，RN 0.81 自带 hermesc | 额外安装 hermes-compiler | accepted |
| Reanimated compatibility | 启用 New Architecture | `react-native-reanimated` 4.1.1 构建任务强制要求 | 降级 Reanimated 或关闭相关依赖 | accepted |
| Android entrypoint | Expo SDK 54 template `ReactNativeHostWrapper` | 当前 `ExpoReactHostFactory.getDefaultReactHost` API 不存在，Kotlin 编译失败 | 手写 ReactHost only 入口 | accepted |
| APK ABI | `arm64-v8a` preview APK | 主流手机可用，显著降低 Windows 本地构建耗时和路径风险 | 全 ABI universal APK | accepted for preview |
| iOS IPA | EAS preview profile | Windows 本地不能产出 IPA，云构建是最短路径 | macOS/Xcode 本地签名 | accepted |

## 待确认问题

| 问题 | 当前判断 | Owner | 截止点 |
| --- | --- | --- | --- |
| 是否需要正式 Android release keystore | 本轮 preview APK 不需要；上架或公开分发前必须配置 | user/coordinator | 发布前 |
| 是否需要全 ABI APK | 本轮 arm64 preview 足够；覆盖模拟器/旧机型需后续构建 | user | 大范围测试前 |
| EAS / Apple credentials 是否可用 | 当前未登录 EAS，Apple 签名未知 | user | IPA 构建前 |
