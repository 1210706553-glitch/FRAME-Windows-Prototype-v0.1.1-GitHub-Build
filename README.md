# FRAME / 文场

面向游戏实况与长视频创作者的 Windows 本地桌面工作台。第一阶段目标是把“导入素材 → 播放定位 → 标记节点 → 导出剪辑标记”做成一个可靠的单机工作流。

## 当前已完成

- Tauri 2 + React 19 的 Windows 桌面工程
- 本机项目创建与项目间素材隔离
- MP4、MOV、MKV、AVI、WebM、M4V 导入
- FFprobe 媒体信息读取接口
- 内置播放器、时间轴拖动、前后 5 秒跳转
- 笑点、信息、情绪、过场、删除候选五类时间码节点
- 点击节点跳到对应画面，节点文字可人工修改
- OpenAI / OpenAI 兼容接口设置
- API Key 通过系统凭据管理器保存，不写入数据库或前端存储
- SQLite 本地数据库与项目表结构
- FFmpeg、本地转写运行器和模型目录的能力检测
- 基础 Premiere Pro XML 标记导出
- 浏览器预览降级：不保存真实 API Key，仅用于检查界面和本地视频播放

## 尚未接通

- Whisper 模型下载与版本管理
- 实际语音转写任务、进度、暂停与恢复
- AI 自动识别事件、高能点和因果链
- 素材、转写结果和节点的完整 SQLite 持久化
- 大纲、脚本与审阅工作区
- 正式签名的 Windows 安装包

界面中这些入口会明确提示“下一阶段接通”，不会伪装成已完成。

## Windows 开发环境

建议使用 Windows 10/11，并安装：

1. Node.js 22 或更高版本
2. Rust stable 与 Cargo
3. Visual Studio Build Tools，勾选“使用 C++ 的桌面开发”
4. Microsoft Edge WebView2 Runtime
5. FFmpeg 与 FFprobe，并确保可在 PowerShell 中直接运行

## 本地运行

```powershell
npm install
npm run desktop:dev
```

只检查前端界面：

```powershell
npm run dev
```

## 构建 Windows 安装包

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-windows.ps1
```

成功后，NSIS 安装包会出现在 `src-tauri\target\release\bundle\nsis` 下。

也可以把整个项目上传至 GitHub 私有仓库。仓库内置的 `Build Windows Installer` 工作流会在首次上传后自动运行，也可以在仓库的 **Actions** 页面手动选择 **Run workflow**。完成后从该次任务的 **Artifacts** 下载 `FRAME-Windows-EXE`。

## 验证

```powershell
npm run test
npm run lint
npm run build
```

## 本地数据与隐私

- SQLite 数据库保存在系统分配给应用的本地数据目录中。
- 视频保留原始本机路径，默认不复制、不上传。
- API Key 使用 Windows 凭据管理器。
- 后续本地转写模型保存在应用数据目录的 `models` 子目录。

更详细的模块边界见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。
