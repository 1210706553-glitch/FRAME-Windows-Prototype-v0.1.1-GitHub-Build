# Implementation Plan: 张诗语の米奇妙妙工具 v0.2.0

## Overview

把旧的视频工作台重构为一个单项目、离线优先的视频创作执行工具。第一里程碑只交付每天真正会使用的闭环：创建计划、查看今日任务、看到剩余进度、开始专注、完成或说明未完成、重新排期。视频播放器、素材节点时间线、Premiere XML 和空壳脚本入口退出主界面。

## Architecture Decisions

- React 负责每日看板与本地状态；第一里程碑使用版本化 localStorage，保证当前前端可独立运行和验证。
- 一次只允许一个进行中的项目；完成后进入只读历史的能力放在后续切片。
- 今日任务限制为 2～5 项，按预计分钟数与依赖顺序自动排期。
- AI 不进入每日执行环节；DeepSeek 只在“素材梳理、粗剪、大纲”三个阶段生成观察和任务。
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
- [x] Task 10: DeepSeek 接入第1～3阶段梳理
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

## v0.6.0 Signed Automatic Updates

### Overview

为 Windows 安装版增加可信的应用内更新闭环。软件启动后在后台检查 GitHub 最新 Release；有新版本时先询问用户，得到确认后才下载、验证签名、安装并重启。普通推送继续只做构建与测试，只有手动运行发布工作流时才创建公开 Release 和 `latest.json`。

### Architecture decisions

- 更新源固定为公开 GitHub 仓库 `1210706553-glitch/FRAME-Windows-Prototype-v0.1.1-GitHub-Build` 的最新 Release。
- 使用 Tauri updater 官方签名验证；公钥写入应用配置，私钥和密码只保存在 GitHub Actions Secrets，绝不进入仓库或升级包。
- 启动后延迟检查一次。有新版本才弹窗；自动检查失败静默处理，手动检查失败才显示可恢复错误。
- 不新增导航页。在“计划与软件设置”中增加一行版本与手动检查入口；下载确认和进度使用现有弹窗语言。
- 专注进行中不主动弹出更新窗口；记录可用版本，结束专注后再提示，避免打断当天任务。
- Windows 使用 NSIS `passive` 安装模式；保持 `com.sunday.frame`、产品名和本地数据目录不变。
- `windows-build.yml` 仍在普通 push 上运行测试和安装包构建，不创建 Release；`windows-release.yml` 仅允许手动触发并发布当前版本。

### Dependency graph

签名密钥与 Tauri 配置 → 更新适配器 → 启动检查与弹窗 → 手动发布工作流 → 文档与升级包

### Task list

#### Phase 1: Trusted updater foundation

- [x] Task 13.1: 生成独立更新签名密钥，提交公钥并单独交付 GitHub Secrets 配置
- [x] Task 13.2: 接入 updater/process 插件、权限、GitHub endpoint 和 NSIS 更新产物
- [x] Task 13.3: 建立可测试的更新适配器与浏览器安全降级

#### Phase 2: User flow

- [x] Task 13.4: 启动后自动检查，有新版时询问后再下载
- [x] Task 13.5: 显示下载进度、失败重试、安装完成重启状态
- [x] Task 13.6: 设置页增加当前版本、检查状态和手动检查按钮

#### Phase 3: Release pipeline

- [x] Task 13.7: 保留普通 push 构建工作流且不创建 Release
- [x] Task 13.8: 增加手动发布工作流，创建 GitHub Release、NSIS EXE、签名和 `latest.json`
- [x] Task 13.9: 更新版本、README、架构、交接文档和操作说明并生成 v0.6.0 更新包

### Acceptance criteria

- [x] 无新版本时启动不弹窗、不打扰专注流程
- [x] 有新版本时明确显示版本和说明，只有用户确认才下载
- [x] 下载过程显示真实进度，失败后可重试或稍后再说
- [x] 签名校验通过后安装并重启；错误签名不能安装
- [x] 设置页可手动检查，并区分最新、发现新版、网络失败和非桌面环境
- [ ] 普通 push 不发布；手动工作流成功生成公开 Release 和 `latest.json`
- [ ] 从旧安装版覆盖升级后本地项目、计划、设置与进度不丢失

### Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| 私钥泄露后可伪造更新 | Critical | 私钥仅单独交付并存入 GitHub Secrets；仓库只提交公钥 |
| 仓库私有导致客户端无法读取 Release | High | 首次发布前将仓库改为 Public，并在真机浏览器验证 `latest.json` 可匿名访问 |
| 平时构建缺少签名密钥而失败 | High | 两个工作流都显式读取同一组 Secrets；缺失时给出前置检查错误 |
| 更新提示打断专注 | Medium | 专注中延后弹窗，结束后再提示 |
| 修改产品名导致 Windows 更新成第二份应用 | High | 固定产品名、identifier 和安装目标，不在更新版本重命名 |

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

## v0.4.2 Calendar Date Picker

### Architecture decisions

- 保留原生日期输入供键盘操作，同时增加不依赖 WebView 原生弹窗的内置月历。
- 首次设置与设置页复用同一个日期选择组件，不增加第三方依赖。
- 首次设置继续禁止选择今天以前的发布日期。

### Acceptance criteria

- [x] 点击独立日历按钮可打开月历
- [x] 支持上月、下月、选择日期和快速选择今天
- [x] 点击外部或按 Escape 可关闭月历
- [x] 键盘输入日期继续可用
- [ ] Windows 真机确认弹层未被裁切且选日可写回

## v0.5.0 DeepSeek Subtitle Planning

### Overview

在现有“项目计划”页增加一个精简的 AI 梳理入口。用户导入 `.srt` 或 `.txt` 字幕后，先在本地预览和删改，再由 DeepSeek 一次生成“素材梳理、粗剪规划、视频大纲”三份可编辑结果。用户确认后，软件只把前三阶段替换为与当前素材相关的每日任务；第4～7阶段继续使用本地固定模板，之后不再调用 AI。

### Architecture decisions

- 不新增主导航页；入口放在“项目计划”顶部，通过一个分步弹窗完成导入、分析和确认。
- 前端只负责本地文件读取、预览编辑和结果编辑；不恢复视频导入、播放、转写或关键帧功能。
- DeepSeek 请求由 Rust 原生端发送，API Key 不写入 localStorage，也不返回给前端；Windows 使用系统凭据存储。
- 默认固定使用成本较低的 `deepseek-v4-flash`。旧模型名 `deepseek-chat` 已于 2026-07-24 停用，不再写入实现。
- 使用 JSON Output，并在前后端同时校验结果结构；空响应、截断、超时和格式错误必须给出可恢复提示。
- 字幕单文件限制 3 MB、有效文本限制 300,000 字符；首版不做自动分块，避免隐藏的多次调用和不可预测费用。
- 保存来源文件名、编辑后的字幕和三份结果到现有版本化本地状态；schemaVersion 升至 4，并兼容 v2/v3 数据。
- 确认结果时，只替换尚未完成的第1～3阶段任务；第4～7阶段模板、已完成记录和专注状态保持不变。

### Dependency graph

字幕解析与 AI 结果类型 → 原生密钥/请求边界 → 导入预览 → 结果编辑 → 任务替换与重新排期 → 发布验证

### Task list

#### Phase 1: Contracts and safe native boundary

- [x] Task 12.1: 增加字幕草稿、三段 AI 结果和 schema v4 迁移
- [x] Task 12.2: 增加 SRT/TXT 读取、大小限制和文本规范化纯函数测试
- [x] Task 12.3: 增加 Windows 凭据存取与 DeepSeek V4 Flash JSON 请求命令

#### Checkpoint: Foundation

- [x] 旧 v2/v3 项目可无损加载
- [x] API Key 不出现在 localStorage、日志或错误文本中
- [x] 解析和结果校验测试通过

#### Phase 2: Complete user flow

- [x] Task 12.4: 在项目计划页增加导入入口和本地字幕预览编辑弹窗
- [x] Task 12.5: 增加分析中、失败重试和三份结果编辑界面
- [x] Task 12.6: 确认后生成前三阶段素材专属任务并重新排期

#### Checkpoint: End-to-end

- [ ] 导入字幕到生成任务的完整流程可运行
- [ ] 只有用户点击“开始分析”时才产生一次 API 请求
- [ ] 修改 AI 结果后生成的任务与修改内容一致

#### Phase 3: Release

- [x] Task 12.7: 更新版本、说明和 v0.5.0 GitHub 更新包
- [ ] Task 12.8: GitHub Actions Windows 构建和真机 API 调用验证

### Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| API Key 泄露到前端状态或日志 | High | 原生端存取和请求；前端只读取“是否已配置”状态 |
| 字幕过长导致费用或响应截断 | High | 明示字符数、3 MB/300k 上限、单次调用、固定输出上限 |
| AI 返回 JSON 外形正确但内容空泛 | Medium | 结构校验、提示词写入因果链和可执行任务约束、结果允许修改 |
| 替换任务破坏既有进度 | High | 只替换未完成的前三阶段任务；完成项与后四阶段不动 |
| Windows 凭据接口在 CI 编译失败 | Medium | 独立窄命令、条件编译、GitHub Actions 先验证后交付 EXE |

### Open questions resolved

- 输入：SRT/TXT 文件，导入后先预览删改。
- 调用方式：一次生成三份结果。
- 结果：允许手动修改后再确认生成任务。
- AI 边界：只影响素材梳理、粗剪和大纲三个阶段。

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
