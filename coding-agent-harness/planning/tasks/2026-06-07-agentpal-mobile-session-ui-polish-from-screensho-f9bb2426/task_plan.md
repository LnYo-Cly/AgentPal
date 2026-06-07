# AgentPal mobile session UI polish from screenshots

Task Contract: harness-task/v1
Task Package Index: required

## 目标

修复用户截图中暴露的移动端会话列表、待处理页和底部导航 UI/UX 问题。

## 范围

- 做什么：调整 `apps/mobile/app/index.tsx` 中的状态胶囊、空状态、项目/会话行、workspace 分组和底部 Tab 选中态。
- 不做什么：不改 Relay/Host 数据协议，不改会话详情业务流，不引入新 UI 库。
- 主要风险：当前 Windows 环境无法自动截取 iPhone Expo Go 真机渲染图，需要用户最终视觉确认。

## 预算选择

选择预算：standard

选择理由：这是局部前端 polish，但涉及 Harness task、实现提交、验证和 review 材料，使用 standard 任务包更稳妥。

## 上下文包（Context Packet）

| ID | 类型 | 路径 | 为什么需要 | 使用者 |
| --- | --- | --- | --- | --- |
| C-001 | code | TARGET:apps/mobile/app/index.tsx | 会话页、待处理页和底部导航集中在该文件。 | coordinator |
| C-002 | public-doc | TARGET:coding-agent-harness/context/product/ux-principles.md | 约束移动端信息清晰和状态表达。 | coordinator |
| C-003 | screenshot | EXTERNAL:user-provided-screenshots | 用户指出的实际 Expo Go 屏幕问题来源。 | coordinator |

## 步骤

1. 定位截图对应的 Home/Sessions/BottomNav 组件。
2. 修复状态语义、行内信息层级、workspace 分组和导航选中态。
3. 运行 TypeScript、Expo export 和 diff check。
4. 记录 Harness 证据并提交 agent review。

## 验收标准

- [x] 待处理页无事项时显示中性“无待办”，不再显示“绿点清空”。
- [x] 普通 idle session/project 不再使用绿色状态点。
- [x] 会话副标题避免长句截断，当前和新建入口有明确视觉区分。
- [x] `.` 当前工作目录在只有一个真实 workspace 时并入该项目。
- [x] 底部 Tab 选中背景保留在导航胶囊内部。
- [x] typecheck、Expo iOS export、diff check 通过。

## 工作树（Worktree）

- 路径：same checkout
- 分支：master
- Worker owner：不适用
- Worker handoff commit required：不适用
- Coordinator integration branch：master
- 未使用 worktree 的原因：单文件同屏 UI 调整，拆 worktree 会增加冲突成本。

## 长程任务判定

- 是否属于长程任务：否
- 若是，合同文件：不适用
- 连续执行权限：不适用
- Stop Condition 摘要：如需改数据契约或后端行为则停止并另开任务。

## 审查判定

- 是否需要对抗性审查：否
- 若是，报告文件：不适用
- Reviewer：self
- No-finding 要求：无 blocking finding；真机视觉由用户最终确认。

## 关联

- 相关 Regression Gate：无
- 审查报告：`review.md`
- Generated Ledger：由 lifecycle CLI / `harness governance rebuild` 重建
- 前置任务：无

## 模块关联（启用模块并行时填写）

- Module：不适用
- Step：不适用
- Module Plan：不适用

## 协调者交接（Coordinator，启用模块并行时填写）

- Global sync owner：coordinator
- Global sync status：n/a
- Registry update needed：不适用
- Harness Ledger update needed：由 Harness CLI 同步
- Closeout / Regression update needed：等待人工确认后按需 closeout
