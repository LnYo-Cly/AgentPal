# AgentPal mobile APK IPA build - 进度

## 状态：进行中

`## 状态` 是受控机器字段，只能使用以下值之一：

- `未开始`
- `计划中`
- `进行中`
- `审查中`
- `已阻塞`
- `已完成`

不要把 `计划审阅中`、`等待 coordinator pass`、`本地审查就绪` 等细粒度协作状态写入本字段。
这些状态应记录到进度记录、残余或协调者交接中。

## 进度记录

证据使用 `type:path:summary` 格式。

允许的 `type`：`command`, `diff`, `fixture`, `screenshot`, `review`, `report`。

证据较长或数量较多时，不要粘贴全文；放入 `artifacts/INDEX.md` 并在这里引用 ID。

### [2026-06-11 12:03] - task-start

- 做了什么：Start mobile Android APK build and iOS IPA feasibility pass
- 验证结果：已记录
- 下一步：继续执行
- 证据：n/a

### [2026-06-11 21:05] - Android release build fixes

- 做了什么：移除 Android Gradle 中失效的 Aliyun 仓库镜像，改用官方 `google()`、`mavenCentral()` 和 `gradlePluginPortal()`；修复 Hermes compiler 路径，使用 React Native bundled `sdks/hermesc`；启用 Expo/RN New Architecture；按 Expo SDK 54 template 修正 `MainApplication.kt` 的 `ReactNativeHostWrapper` 入口；增加 `.kotlin/` ignore。
- 验证结果：Android release 构建从依赖解析、Reanimated new architecture assertion、Windows 260 字符路径和 Kotlin 入口兼容问题逐步修复到成功。
- 下一步：记录 APK artifact 和 iOS EAS 阻塞。
- 证据：diff:TARGET:apps/mobile/android;apps/mobile/app.json:Android release build configuration and Expo SDK 54 entrypoint fixes

### [2026-06-11 21:05] - Android APK artifact

- 做了什么：使用短盘符 `P:` 映射当前仓库，规避 Windows CMake/Ninja 260 字符路径限制；执行 arm64 preview APK 构建并复制产物。
- 验证结果：`assembleRelease` 成功，产出 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`，复制到 `apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk`。
- 下一步：如需全 ABI APK，可后续移到更短真实路径或云构建；本轮 arm64 APK 用于主流 Android 手机侧载测试。
- 证据：command:TARGET:apps/mobile/android:ANDROID_HOME=D:\Develop\DevelopEnv\Android\Sdk NODE_ENV=production gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon --stacktrace passed
- 证据：fixture:TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk:40,001,377 bytes, SHA256 B0E00C5E2A33B23BCDE434CB2352727CB78225D459BF5FE0F66F124A641B369D

### [2026-06-11 21:05] - APK verification

- 做了什么：验证 APK 签名、zip alignment、manifest package metadata 和连接设备状态。
- 验证结果：`apksigner verify --verbose --print-certs` 通过，v2 signature 为 true，签名证书为 Android Debug；`zipalign -c -p 4` 通过；`aapt2 dump badging` 显示 package `dev.agentpal.mobile`、version `0.1.0`、minSdk 24、targetSdk 36、native-code `arm64-v8a`；`adb devices` 未发现已连接设备。
- 下一步：连接 Android 真机后可执行安装启动验证。
- 证据：command:TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk:apksigner verify passed with APK Signature Scheme v2
- 证据：command:TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk:zipalign -c -p 4 passed
- 证据：command:TARGET:apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk:aapt2 badging confirmed package/version/sdk/arm64 metadata
- 证据：command:LOCAL:adb devices:no connected Android device available for install smoke

### [2026-06-11 21:05] - iOS IPA feasibility

- 做了什么：新增 `apps/mobile/eas.json` preview profile，并检查 EAS CLI 状态。
- 验证结果：`npx eas-cli --version` 返回 `eas-cli/20.1.0`；`npx eas-cli whoami` 返回 `Not logged in`。Windows 本地不能直接产出 IPA，iOS 需要 EAS 云构建或 macOS/Xcode 签名环境。
- 下一步：用户登录 EAS 并准备 Apple Developer / iOS signing credentials 后，运行 `npx eas-cli build --platform ios --profile preview`。
- 证据：command:TARGET:apps/mobile:npx eas-cli --version => eas-cli/20.1.0
- 证据：command:TARGET:apps/mobile:npx eas-cli whoami => Not logged in
- 证据：diff:TARGET:apps/mobile/eas.json:Added preview build profile for Android APK and iOS internal distribution

### [2026-06-11 21:05] - Repository checks

- 做了什么：执行 TypeScript、diff 和 Harness 检查。
- 验证结果：`npm --prefix apps/mobile run typecheck` 通过；`git diff --check` 无 whitespace error；`harness check --profile target-project .` 通过，但提示存在本轮未提交 dirty paths。
- 下一步：提交本轮 Android build fixes 和 Harness 证据。
- 证据：command:TARGET:apps/mobile:npm --prefix apps/mobile run typecheck passed
- 证据：command:TARGET:.:git diff --check passed
- 证据：command:TARGET:.:harness check --profile target-project . passed with dirty-state warning before commit

## 残余

- iOS IPA 未产出：Owner=user；需要 `npx eas-cli login`、Expo project/account setup、Apple Developer 账号和 iOS signing credentials 后才能运行 EAS iOS build。
- Android 真机安装未验证：Owner=user/coordinator；当前 `adb devices` 无设备，连接设备后可安装 `apps/mobile/dist/AgentPal-android-0.1.0-arm64-preview.apk`。
- APK 为 preview/testing 包：Owner=coordinator；release build 当前使用 debug keystore，不能用于商店分发；正式分发需要单独配置 release keystore / Play App Signing。
- APK 仅包含 `arm64-v8a` native code：Owner=coordinator；适合绝大多数现代安卓手机测试，若需要覆盖 x86/x86_64/armeabi-v7a，应后续执行全 ABI 或 EAS Android build。

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：task lifecycle CLI / governance rebuild
- 负责人：coordinator
