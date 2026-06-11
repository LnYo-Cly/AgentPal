# AgentPal daemon 常驻 CLI

## Task ID

`2026-06-11-agentpal-daemon-cli-17c94a23`

## 创建日期

2026-06-11

## 一句话结果

`agentpal` 支持 workspace 级后台常驻命令 `daemon start|stop|status|logs`，并让 `pair` 与 daemon 共享稳定 host 身份。

## 完成后能得到什么

用户可以先用 `agentpal pair` 完成手机端首次配对，再用 `agentpal daemon start` 把 Host 留在后台常驻；终端关闭后，host 仍继续保持连接。下一轮 agent 可以直接用 `status` 判断 daemon 是否活着、用 `logs` 看后台输出、用 `stop` 收口。这个结果会把“前台临时连线”与“后台长期运行”拆开，减少用户每次都得盯着终端的问题。

## 交付物

- 可见产物：`agentpal daemon start|stop|status|logs`，以及更新后的 `agentpal pair` 行为说明。
- 修改位置：`bin/agentpal.mjs`、`README.md`、task package、`docs/plans/2026-06-11-agentpal-daemon-cli-design.md`。
- 验证证据：命令帮助、foreground pair 冒烟、daemon 后台启动/停止/日志检查。

## 第一眼应该看什么

先读 `docs/plans/2026-06-11-agentpal-daemon-cli-design.md`、`task_plan.md`、`execution_strategy.md`，再看 `bin/agentpal.mjs` 和 `crates/host/src/codex.rs` 的连接流程。

## 边界

- 范围内：CLI daemon 子命令、workspace profile/state、帮助文案、README、验证和 Harness 任务文件。
- 范围外：开机自启、桌面安装包、mobile 协议改动、全局单实例守护、仓库重命名。
- 停止条件：如果后台进程无法稳定 detach、或 stop/status 无法可靠判定，先停下来修正实现，不强行收口。

## 完成判断

1. `agentpal daemon --help` 可见 start/stop/status/logs。
2. `agentpal pair` 仍能完成前台配对并输出终端二维码。
3. `agentpal daemon start` 能在后台留下可查询的 pid 与日志。
4. `agentpal daemon stop` 能正常结束后台进程。
5. 相关验证证据写回 `progress.md`，并完成 closeout 文件。

## 执行合同

- Owner：coordinator
- 生命周期状态：进行中
- 必需文件：`INDEX.md`、`task_plan.md`、`execution_strategy.md`、`visual_map.md`、
  `progress.md`、`findings.md`、`review.md`
- 完成条件：验证证据必须记录到 `progress.md`

## 当前下一步

实现 `agentpal daemon` 的状态文件和后台启动流程，然后补 help / README。
