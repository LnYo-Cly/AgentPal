# 收口记录：AgentPal mobile APK IPA build

## 摘要

Android preview APK 已成功构建并完成静态产物验证；iOS IPA 需要 EAS 登录和 Apple signing credentials，本轮在 Windows 环境下无法自动产出。

## 范围

| 范围 | 详情 |
| --- | --- |
| 变更模块 | `apps/mobile` Android native build, Expo config, EAS config, mobile README |
| 新增文件 | `apps/mobile/eas.json` |
| 删除文件 | 无 |
| 不在范围内 | 正式 Android keystore、App Store/TestFlight 发布、EAS/Apple 登录、真机安装启动 |

## 验证

| 检查 | 命令或过程 | 结果 | 证据 |
| --- | --- | --- | --- |
| TypeScript | `npm --prefix apps/mobile run typecheck` | passed | `progress.md` |
| Android release APK | `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --stacktrace` | passed | `progress.md` |
| APK signature | `apksigner verify --verbose --print-certs` | passed | `progress.md` |
| APK alignment | `zipalign -c -p 4` | passed | `progress.md` |
| APK metadata | `aapt2 dump badging` | passed | `progress.md` |
| EAS status | `npx eas-cli --version`; `npx eas-cli whoami` | CLI available, not logged in | `progress.md` |
| Repo checks | `git diff --check`; `harness check --profile target-project .` | passed | `progress.md` |

## 审查结论

| 来源 | 重要发现 | 处理 | 证据 |
| --- | --- | --- | --- |
| self adversarial review | 无阻塞 Android preview APK 的重要发现 | 残余风险记录为 external/account/device/signing follow-up | `review.md` |

## 残余风险

| 风险 | Owner | 是否接受 | 跟进 |
| --- | --- | --- | --- |
| iOS IPA 未产出 | user | 否 | 登录 EAS，配置 Apple Developer signing，运行 `npx eas-cli build --platform ios --profile preview` |
| Android 未做真机安装启动 | user/coordinator | 是，作为 artifact delivery | 连接设备后 `adb install -r apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk` |
| APK 使用 debug keystore | coordinator | 是，仅 preview | 正式发布前配置 release signing |
| APK 仅 arm64-v8a | coordinator | 是，仅 preview | 如需全覆盖，执行全 ABI 或 EAS Android build |

## 经验沉淀反思

| 问题 | 答案 |
| --- | --- |
| 是否完成经验候选检查？ | 已完成，本轮无需要提升到全局 Harness lesson 的候选 |
| 经验候选详情文件 | `lesson_candidates.md` |

## 收口链接

| 产物 | 链接 |
| --- | --- |
| 任务计划 | `task_plan.md` |
| 审查记录 | `review.md` |
| 进度记录 | `progress.md` |
| Android APK | `apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk` |
