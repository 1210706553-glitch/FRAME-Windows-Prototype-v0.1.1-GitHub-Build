# v0.2.0 Task Checklist

## Task 1: State model

**Acceptance criteria:**
- [x] 一个状态对象包含项目、任务、设置、专注与周记录
- [x] 状态带版本号并安全持久化

**Verification:** TypeScript build succeeds.

## Task 2: Scheduling engine

**Acceptance criteria:**
- [x] 自动生成七阶段基础任务
- [x] 每个工作日安排2～5项并跳过休息日
- [x] 正确计算今日和项目加权进度

**Verification:** Focused Vitest tests pass.

## Task 3: Onboarding

**Acceptance criteria:**
- [x] 每个人可填写自己的开始时间、每日时长和休息日
- [x] 创建后只保留一个进行中项目

**Verification:** Manual create-project flow.

## Task 4: Today board

**Acceptance criteria:**
- [x] 任务可开始、完成、添加和恢复
- [x] 今日始终突出一个建议下一步

**Verification:** Manual task interaction and reload.

## Task 5: Visual progress

**Acceptance criteria:**
- [x] 显示今日完成率、项目完成率、剩余分钟与截止日
- [x] 显示七阶段完成情况

**Verification:** Unit tests plus manual visual check.

## Task 6: Focus session

**Acceptance criteria:**
- [x] 专注倒计时刷新后继续
- [x] 临时解锁固定15分钟并记录原因
- [x] 正常结束遵守30分钟/完成任务或120分钟条件

**Verification:** Timer state tests and manual clock check.

## Task 7: Replanning

**Acceptance criteria:**
- [x] 无法制作时要求填写原因
- [x] 可用动态休息日优先消耗，否则记录缺勤
- [x] 未完成任务顺延到下一工作日

**Verification:** Replanning unit test.

## Checkpoint

- [x] `vitest run`
- [x] `tsc -b`
- [x] `vite build`
- [x] CSS断点覆盖1440×900和1080×720，无固定内容宽度溢出

## v0.3 Windows reminders

- [x] 到点、15分钟未开始、每30分钟跟进的提醒策略
- [x] 专注、完成、休息和缺勤状态自动静音
- [x] Windows原生通知权限与测试提醒
- [x] 开机自启、隐藏启动和关闭到系统托盘
- [x] 提醒策略单元测试
- [ ] GitHub Actions Windows安装包构建

## v0.4 Windows application guard

### Task 8.1: Native monitor foundation

**Acceptance criteria:**
- [x] 进程名只允许安全的映像文件名格式
- [x] 系统关键进程与本软件自身被拒绝
- [x] 后台监视器停止后不修改任何系统状态

**Verification:** Rust unit tests in GitHub Actions; source review on non-Windows workspace.

### Task 8.2: Tauri command boundary

**Acceptance criteria:**
- [x] 前端只能调用启动、停止和读取状态三个命令
- [x] 重复启动和停止保持幂等
- [x] 启动时立即尝试关闭已运行的名单程序

**Verification:** Windows build and manual invocation.

### Task 8.3: Focus lifecycle integration

**Acceptance criteria:**
- [x] `active` 开启保护
- [x] `temporary-unlock` 与 `idle` 停止保护
- [x] 刷新或重启后按保存的专注状态恢复

**Verification:** Frontend policy unit tests and manual state transitions.

### Task 8.4: Truthful UI

**Acceptance criteria:**
- [x] 界面区分未接通、待命、运行中
- [x] 显示有效程序数和累计拦截次数
- [x] 网站设置明确标为后续功能

**Verification:** Production build and Windows screenshot review.

### Checkpoint

- [x] `vitest run`
- [x] `tsc -b`
- [x] `vite build`
- [ ] GitHub Actions Windows installer
