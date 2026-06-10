# AgentPal GitHub public repository rename

## Task ID

`2026-06-10-agentpal-github-public-repository-rename-c0a78ac1`

## 创建日期

2026-06-10

## 一句话结果

当前 private 仓库 `LnYo-Cly/OpenAgentPal` 被重命名并公开为 `LnYo-Cly/AgentPal`，本地 remote 和当前仓库 metadata 链接同步到新地址。

## 完成后能得到什么

完成后，AgentPal 会拥有一个与产品名、npm 包名和 CLI 命令一致的公开 GitHub 仓库地址。后续 README、npm package metadata、安装说明和对外发布都可以统一指向 `https://github.com/LnYo-Cly/AgentPal`。公开前会保留密钥/凭据扫描证据，避免把 token、Redis URL、Railway 凭据或 `.env` 内容带入 public 仓库。

## 交付物

- 可见产物：GitHub public 仓库 `LnYo-Cly/AgentPal`
- 修改位置：GitHub repo settings、本地 `origin`、`package.json` metadata、相关当前文档链接、当前任务材料
- 验证证据：secret scan、`gh repo view`、`git remote -v`、`git ls-remote`、`git diff --check`、`harness check`

## 第一眼应该看什么

先看 `progress.md` 的公开前扫描证据，再看 `review.md` 的残余风险和 `walkthrough.md` 的最终 repo 状态。

## 边界

- 范围内：公开前扫描、GitHub 仓库重命名、visibility 改为 public、本地 remote 更新、当前 metadata / docs 的 GitHub 链接更新、Harness 证据收口。
- 范围外：npm publish、预编译二进制发布、Railway endpoint 改名、默认分支迁移、历史任务 ID 或历史审计文本批量改写。
- 停止条件：扫描发现真实凭据或 GitHub API 拒绝重命名/公开。

## 完成判断

- 公开前扫描没有发现真实密钥、token、私有 Redis URL、Railway token、npm token 或 `.env` 凭据进入 tracked source / git history。
- `gh repo view LnYo-Cly/AgentPal` 显示 `visibility=PUBLIC`、`isPrivate=false`。
- `git remote -v` 指向 `https://github.com/LnYo-Cly/AgentPal.git`。
- 当前 metadata / docs 中的 GitHub repo 链接已改为 `LnYo-Cly/AgentPal`。
- Harness 任务进入 Agent Review Submission；不执行 human `review-confirm`。

## 执行合同

- Owner：coordinator
- 生命周期状态：未开始
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

项目化任务计划并启动任务，然后执行公开前扫描。
