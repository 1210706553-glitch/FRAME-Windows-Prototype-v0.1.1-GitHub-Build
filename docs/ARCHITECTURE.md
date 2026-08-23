# FRAME 桌面版架构

## 技术底座

- 界面：React + TypeScript + Vite
- 桌面壳：Tauri 2
- 本地能力：Rust commands
- 数据：SQLite（rusqlite，内置 SQLite）
- 媒体：系统 FFmpeg / FFprobe
- 密钥：系统凭据管理器（keyring）

## 数据流

```text
本机视频
  → 文件选择器
  → FFprobe 读取时长、分辨率、帧率
  → 内置播放器预览
  → 人工或 AI 生成时间码节点
  → SQLite 保存项目状态
  → Premiere Pro XML / 后续脚本工作区
```

视频本体默认不进入数据库；数据库只保存路径与结构化分析结果。

## Rust 模块

- `storage.rs`：创建数据库并读写项目
- `media.rs`：调用 FFprobe 读取媒体信息
- `secrets.rs`：读写系统凭据管理器
- `transcription.rs`：检查 FFmpeg、转写运行器和本地模型
- `premiere.rs`：输出基础 FCP7 xmeml 标记文件

## 阶段规划

### v0.1：素材工作台底座

当前版本。验证桌面形态、项目模型、视频定位和人工标记是否顺手。

### v0.2：本地转写

- 接入独立 `frame-transcriber.exe`
- GPU 自动检测，CUDA 可用时优先；否则 CPU 回退
- 下载 Small / Medium / Large v3 Turbo 模型
- 任务进度、取消、失败重试
- 分段转写写入 SQLite

### v0.3：内容理解

- 每位用户填写自己的 OpenAI 或兼容接口
- 从转写与画面节点提取事件、目标、阻碍、结果和 callback
- 人工确认后生成主线、大纲和脚本

### v0.4：剪辑交换

- 完整 Premiere Pro XML 时间线
- 可选字幕与标记轨道
- 输出素材使用清单和剪辑说明

## 当前限制

此仓库已通过前端编译、单元测试和静态检查；当前交付环境没有 Rust 与 Windows 工具链，因此未在这里生成或实测 `.exe` / `.msi`。桌面安装包需要在 Windows 开发机上构建。
