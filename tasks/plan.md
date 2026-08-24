# Implementation Plan: 张诗语の米奇妙妙工具 v0.2.0

## Overview

把旧的视频工作台重构为一个单项目、离线优先的视频创作执行工具。第一里程碑只交付每天真正会使用的闭环：创建计划、查看今日任务、看到剩余进度、开始专注、完成或说明未完成、重新排期。视频播放器、素材节点时间线、Premiere XML 和空壳脚本入口退出主界面。

## Architecture Decisions

- React 负责每日看板与本地状态；第一里程碑使用版本化 localStorage，保证当前前端可独立运行和验证。
- 一次只允许一个进行中的项目；完成后进入只读历史的能力放在后续切片。
- 今日任务限制为 2～5 项，按预计分钟数与依赖顺序自动排期。
- AI 不进入每日执行环节；DeepSeek 只在后续“素材梳理、粗剪、大纲”切片中生成观察和任务。
- 专注计时先建立完整状态机；Windows 进程/网站系统级封锁作为下一垂直切片接入 Rust。
- 保持 `com.sunday.frame` 标识和旧数据目录，避免升级主动清空本机数据。

## Task List

### Phase 1: Daily execution foundation

- [x] Task 1: 建立项目、任务、日程与专注状态模型
- [x] Task 2: 实现自动任务模板、2～5项日排程与进度计算
- [x] Task 3: 重做首次启动与单项目创建流程

### Checkpoint: Foundation

- [x] 纯函数测试通过
- [x] 刷新后项目与任务状态可恢复

### Phase 2: Core daily loop

- [x] Task 4: 实现今日任务看板、手动勾选与快速添加
- [x] Task 5: 实现项目总进度、剩余时间、截止日与阶段视图
- [x] Task 6: 实现专注计时、15分钟临时解锁与结束条件
- [x] Task 7: 实现无法制作、未完成原因、休息日与重新排期

### Checkpoint: Core daily loop

- [x] 创建项目到完成任务的流程可端到端运行
- [x] 每日任务数量与剩余量显示正确
- [x] 刷新时专注计时不丢失

### Phase 3: Native enforcement and AI

- [ ] Task 8: Windows 进程阻止与运行中游戏检测
- [x] Task 9a: Windows 原生通知、开机自启与系统托盘
- [ ] Task 9b: 可选的持续条与全屏提醒
- [ ] Task 10: DeepSeek 接入第1～3阶段梳理
- [ ] Task 11: 本地转写和稀疏关键帧预处理

### Checkpoint: Complete

- [ ] Windows EXE 真实设备测试通过
- [ ] 系统级阻止可恢复且不会遗留 hosts/进程状态
- [ ] DeepSeek 不参与第4～7阶段

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 一次实现全部功能再次臃肿 | High | 按垂直闭环分阶段，每个阶段都可独立使用 |
| 系统级网站阻止需要管理员权限 | High | 单独实现、记录修改、异常退出自动恢复 |
| localStorage 后期迁移 SQLite | Medium | 状态对象带 schemaVersion，后续统一迁移 |
| 自动排期不符合真实工作量 | Medium | 用户可改预计分钟数、日期和每日容量 |

## Open Questions

- Windows 网站阻止采用 hosts 还是本地代理，在 Task 8 前通过真实机器测试再决定。

## v0.4 Application Guard Plan

### Architecture decisions

- 本切片只限制 Windows 程序，不修改 `hosts`、防火墙或浏览器设置。
- Rust 后台监视器只在专注状态为 `active` 时运行；临时解锁、完成、休息和退出立即停止。
- 通过进程映像名调用 Windows `taskkill`，不启动 shell、不请求管理员权限，并拒绝系统关键进程名。
- 拦截状态不写入系统；程序异常退出后不会留下持久修改。前端重启时根据本地专注状态重新同步。

### Task list

- [x] Task 8.1: 建立进程名规范化、关键进程保护和 Rust 后台监视器
- [x] Task 8.2: 暴露启动、停止、状态查询三个窄 Tauri 命令
- [x] Task 8.3: 前端根据专注、临时解锁和结束状态自动同步原生保护
- [x] Task 8.4: 将界面改为真实显示“未接通、待命、进行中”和拦截次数
- [x] Task 8.5: 完成前端测试、构建检查和 GitHub Windows 构建包

### Acceptance criteria

- [ ] 开始专注后，名单中的普通用户程序会被关闭，重新启动后会再次被关闭
- [ ] 临时解锁15分钟期间不拦截，到期自动恢复
- [ ] 正常结束、休息、彻底退出或崩溃后没有持久系统修改
- [ ] 系统关键进程和本软件自身不能加入拦截名单
- [ ] 网站名单明确显示为尚未接通，不伪装成已保护

### Checkpoint

- [x] 前端 lint、TypeScript、Vitest、Vite build 全部通过
- [x] GitHub Actions Windows NSIS 构建通过
- [ ] Windows 真机用一个无风险测试程序验证启动、重开、解锁和结束

## v0.4.1 Running Application Picker

### Architecture decisions

- “添加程序”只列出当前拥有可见窗口的应用，避免向用户暴露大量后台进程。
- 原生端返回窗口标题与规范化后的 `.exe` 进程名；系统关键进程和本软件继续复用既有拒绝名单。
- 选择器支持刷新、多选、去重和已添加标记；保存仍写入既有 `distractionApps`，不改变专注保护协议。

### Task list

- [x] Task 8.6: 增加 Windows 当前可见应用查询命令与解析测试
- [x] Task 8.7: 增加运行中应用选择弹窗并写回程序限制名单
- [x] Task 8.8: 完成测试、生产构建和 GitHub 更新包

### Acceptance criteria

- [ ] 点击“添加程序”可看到当前正在运行且有窗口的软件
- [ ] 可一次勾选多个程序，重复项不会再次加入
- [ ] 本软件、系统关键进程和无效进程名不会出现在候选列表
- [ ] 查询失败时显示明确错误，同时保留原有手动编辑能力
