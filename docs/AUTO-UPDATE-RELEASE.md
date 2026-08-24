# 自动更新与发布操作

## 一次性设置

### 1. 将仓库改为 Public

进入 GitHub 仓库：

`1210706553-glitch/FRAME-Windows-Prototype-v0.1.1-GitHub-Build`

依次点击 **Settings → General → Danger Zone → Change repository visibility → Make public**。公开的是程序源码和 Release，不包括 GitHub Secrets。

### 2. 添加更新签名 Secrets

更新密钥由 Tauri CLI 生成。源码只包含公钥；私钥和密码在单独交付的 `MickeyToolkit-v0.6.0-PRIVATE-UPDATE-KEY` 文件夹中。

进入 **Settings → Secrets and variables → Actions**，分别新建：

- `TAURI_SIGNING_PRIVATE_KEY`：复制 `mickey-toolkit.key` 的完整内容。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：复制 `signing-password.txt` 的完整内容。

不要把这两个文件拖进 GitHub Desktop，不要发给其他人。请把整个私钥文件夹额外备份到可靠的离线位置；丢失私钥或密码后，已安装版本将无法验证你以后发布的更新。

## 发布 v0.6.0

1. 用更新包覆盖 GitHub Desktop 所在的本地仓库。
2. 提交并 Push 到 `main`。
3. 等待 **Build Windows Installer** 变绿。
4. 打开 **Actions → Publish Windows Release**。
5. 点击 **Run workflow**，可填写会显示在软件更新弹窗中的更新说明。
6. 等待工作流变绿；它会自动创建 `v0.6.0` Release，并上传 NSIS EXE、签名与 `latest.json`。
7. 从 Release 下载 v0.6.0 EXE，手动覆盖安装一次。

v0.5.0 没有更新器，所以这一次仍需手动安装。保持 `com.sunday.frame` 不变即可继续读取原来的本地项目数据。

## 以后发布新版

1. 同步修改 `package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中的版本号。
2. 普通提交并 Push，等构建工作流变绿。
3. 手动运行 **Publish Windows Release**。
4. 已安装旧版会在下次启动时发现新版本；专注期间会延后提示。

## 两条工作流的区别

- **Build Windows Installer**：普通 push 自动运行，执行测试并上传内部审片安装包，不创建公开 Release。
- **Publish Windows Release**：只接受手动运行，执行完整检查后创建正式 Release 和自动更新清单。

## 安全边界

- 更新签名验证不能关闭。
- 自动检查失败不会弹窗轰炸；手动检查才显示网络错误。
- 下载和安装必须由用户确认。
- Windows 使用 NSIS passive 模式，安装期间可能短暂显示系统安装进度。
- 不修改产品名、`com.sunday.frame` 标识或数据目录，避免被 Windows 当作另一款软件安装。
