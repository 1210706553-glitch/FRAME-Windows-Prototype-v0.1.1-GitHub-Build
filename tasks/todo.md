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
- [x] GitHub Actions Windows installer

## v0.4.1 Running application picker

### Task 8.6: Native visible-application query

**Acceptance criteria:**
- [x] 只返回拥有可见窗口且进程名通过安全规范化的应用
- [x] 返回进程名和窗口标题，并去重排序

**Verification:** Rust parser tests and GitHub Actions Windows test.

### Task 8.7: Application selection dialog

**Acceptance criteria:**
- [x] 设置页提供“从正在运行的软件添加”按钮
- [x] 弹窗支持刷新、多选、已添加标记和批量添加
- [x] 原有手动输入仍可作为兜底

**Verification:** TypeScript build and manual Windows selection flow.

### Task 8.8: Release checkpoint

- [x] `vitest run`
- [x] `oxlint`
- [x] `tsc -b`
- [x] `vite build`
- [x] 生成可由 GitHub Desktop 应用的 v0.4.1 更新包

## v0.4.2 Calendar date picker

- [x] 首次设置增加独立日历按钮和内置月历
- [x] 设置页复用相同日期选择组件
- [x] 保留键盘输入、最早日期限制和无障碍标签
- [ ] Windows 真机确认月历弹出、换月、选择和关闭交互

## v0.5.0 DeepSeek subtitle planning

### Task 12.1: State contract and migration

**Acceptance criteria:**
- [x] schema v4 可保存字幕草稿、来源文件名和三份可编辑结果
- [x] v2/v3 项目加载后不丢失任务、进度、设置或记录

**Verification:** TypeScript migration tests and production build.

### Task 12.2: Subtitle ingestion

**Acceptance criteria:**
- [x] 仅接受 `.srt` 和 `.txt`，支持 UTF-8 BOM 并保留有用时间码
- [x] 超过 3 MB 或 300,000 字符时在发送前明确阻止
- [x] 导入后必须先显示可编辑预览，不自动调用 API

**Verification:** Parser unit tests plus manual file selection.

### Task 12.3: Secure DeepSeek adapter

**Acceptance criteria:**
- [x] API Key 由 Windows 凭据存储保存、读取和删除
- [x] 原生端调用 `deepseek-v4-flash` JSON Output，一次返回三个部分
- [x] 错误可恢复且不会泄露 API Key 或完整字幕

**Verification:** Rust tests, GitHub Actions Windows build and masked-key UI check.

### Checkpoint: Foundation

- [ ] 前端与 Rust 测试通过
- [x] 旧数据迁移通过
- [x] 本地存储与日志中找不到 API Key

### Task 12.4: Import and preview UI

**Acceptance criteria:**
- [x] 项目计划页提供一个清晰的“AI梳理前三阶段”入口
- [x] 弹窗支持选择文件、预览、编辑、重新选择和字符数显示
- [x] 未配置 API Key 时引导到同一弹窗内完成配置

**Verification:** Desktop-width and narrow-width manual interaction.

### Task 12.5: Editable analysis results

**Acceptance criteria:**
- [x] 一次请求得到素材梳理、粗剪规划和视频大纲三份结果
- [x] 三份结果均可修改，失败时保留字幕草稿并可重试
- [x] 分析按钮在请求期间禁用并显示明确进度

**Verification:** Mock response tests and manual error recovery.

### Task 12.6: Task generation and scheduling

**Acceptance criteria:**
- [x] 确认后只替换尚未完成的第1～3阶段任务
- [x] 第4～7阶段、完成记录和专注状态保持不变
- [x] 新任务按每日容量和休息日重新排期并立即反映进度

**Verification:** Planner tests covering fresh and partially completed projects.

### Checkpoint: End-to-end

- [ ] SRT/TXT → 预览 → 一次分析 → 修改 → 每日任务完整走通
- [x] AI 不参与第4～7阶段

### Task 12.7: Release package

- [x] 版本更新到 v0.5.0
- [x] README、架构、交接文档和更新说明同步
- [x] lint、Vitest、TypeScript、Vite build 通过
- [x] 生成 GitHub Desktop 更新包

### Task 12.8: Windows validation

- [ ] GitHub Actions NSIS 构建通过
- [ ] 真机凭据保存、删除和一次真实 DeepSeek 调用通过

## v0.6.0 Signed automatic updates

### Task 13.1: Signing and native updater

- [x] 更新签名公钥写入 Tauri 配置
- [x] 私钥和密码只存在单独交付文件与 GitHub Secrets
- [x] updater/process 插件、权限和 NSIS 更新产物配置完成

### Task 13.2: Update UX

- [x] 启动延迟检查且无更新时不打扰
- [x] 新版提示先询问，确认后才下载
- [x] 下载显示真实进度，成功后安装并重启
- [x] 专注中延迟提示，自动检查失败保持安静
- [x] 设置页支持手动检查和明确状态

### Task 13.3: GitHub release workflow

- [x] 普通 push 只测试与构建，不创建 Release
- [x] 手动工作流读取应用版本并发布 NSIS、签名和 latest.json
- [x] 缺少签名 Secrets 时在构建前明确失败

### Task 13.4: Release checkpoint

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml`
- [ ] GitHub Actions 普通构建与手动发布均通过
- [ ] Windows 从旧版自动更新到 v0.6.0 且数据保留
