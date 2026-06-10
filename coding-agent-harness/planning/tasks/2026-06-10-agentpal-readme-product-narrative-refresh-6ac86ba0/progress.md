# AgentPal README product narrative refresh - 进度

## 状态：已完成

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

## 残余

- 这是第一版产品叙事试稿，后续可继续按用户反馈微调“味道”、截图和移动端完成度说明。

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：lifecycle CLI / governance rebuild
- 负责人：coordinator

### [2026-06-10 20:45] - README narrative refresh

- 做了什么：将根目录 README 从简短 CLI 说明改为产品叙事试稿，突出 “Your coding agents keep working. You keep control.” 和 `npx agentpal@latest pair` 第一入口；补充 Why、Start Here、What Works Today、How It Works、Requirements、Security Model、Development、Roadmap 和 Status。
- 验证结果：README 包含已发布 npm 命令和当前限制；`rg` 确认关键命令、`0.1.0` 限制和 prebuilt follow-up 均存在，没有 `oap` / `openagentpal` 旧入口残留；`git diff --check` 通过；`harness check --profile target-project .` 通过，只有提交前 dirty-state warning。
- 下一步：运行 Harness check，提交推送。
- 证据：diff:TARGET:README.md:README product narrative rewritten; command:TARGET:README.md:rg verified public command, current release limits, and no legacy oap/openagentpal entry; command:TARGET:.:git diff --check passed; command:TARGET:.:harness check --profile target-project . passed with dirty-state warning before commit
