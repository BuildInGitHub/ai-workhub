# AI WorkHub · 智汇工作台

> **不只是聊天，是真能动手干活的桌面 AI 办公伙伴** —— DeepSeek 驱动 · 本地优先 · 双引擎可选

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)](https://www.electronjs.org/)
[![Pi SDK](https://img.shields.io/badge/Pi%20SDK-0.83.0-orange)](https://github.com/earendil-works)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-chat-blueviolet)](https://platform.deepseek.com/)
[![Release](https://img.shields.io/github/v/release/BuildInGitHub/ai-workhub)](https://github.com/BuildInGitHub/ai-workhub/releases/latest)

---

## 📥 下载 · Download

每个链接指向 `releases/latest/download/{文件名}` —— GitHub 自动跳到最新 published 版本对应的文件，直接开始下载。

| 平台 | 直接下载 |
|------|---------|
| 🪟 **Windows** (10+, x64) | [⬇ AI-WorkHub-Setup-1.0.0.exe](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-Setup-1.0.0.exe) |
| 🍎 **macOS** (12+, x64) | [⬇ AI-WorkHub-1.0.0-x64.dmg](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-1.0.0-x64.dmg) |
| 🍎 **macOS** (12+, arm64) | [⬇ AI-WorkHub-1.0.0-arm64.dmg](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-1.0.0-arm64.dmg) |
| 🐧 **Linux** (Ubuntu 22.04+, x64) | [⬇ AI-WorkHub-1.0.0.AppImage](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-1.0.0.AppImage) |

> ⚠️ **代码签名**：Windows 与 macOS 安装包**当前未签名**。macOS 首次双击 .app 会"没反应"——详见下方"⚠️ macOS 首次启动"。
> 📦 [查看所有历史版本与 SHA256 →](https://github.com/BuildInGitHub/ai-workhub/releases)

### ⚠️ macOS 首次启动（Gatekeeper 拦截）

.app 没签名 + 没 notarize，Gatekeeper 会静默阻止。三种解法，**任选其一**：

```bash
# 方法 1（最简单）：Finder 右键 AI WorkHub.app → "打开" → 确认框点"打开"
# 方法 2（一行命令）：
xattr -cr "/Applications/AI WorkHub.app"
# 方法 3（永久）：系统设置 → 隐私与安全 → 找到 "AI WorkHub" 被阻止的提示 → 点"仍要打开"
```

> 💡 长期方案：购买 Apple Developer Program（$99/年）给 .app 签名 + Apple 公证。详见 [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)。

---

## 中文

### 简介

让 AI **直接操作**本地文件 / 链接 / 任务 / 日历 / 项目，不只是给建议。内置 20+ 工具，图式循环引擎（失败自动重规划），v1 自研 + v2 Pi SDK 双引擎，扩展市场（MCP / Skills / CLI）一键安装。

适合：开发者 / 自媒体 / 项目管理者 / 任何想让 AI 真正"帮着干活"而不是"陪着聊天"的人。

### 特性

| 类别 | 能力 |
|------|------|
| 🤖 AI 助手 | 自然语言规划 + 执行：整理桌面、添加应用、快速启动、子任务、链接收藏 |
| 🔄 图式循环 | 规划 → 执行 → 校验 → 重规划，最多 2 轮，失败自动换策略 |
| 🧠 长期记忆 | "记住这个""别忘了"跨会话保存，下回自动召回 |
| 🔀 双引擎 | v1 自研（稳定）/ v2 Pi SDK（实验），Settings 一键切换无需重启 |
| 🧩 扩展市场 | MCP Servers / Skills / CLI 一键安装；远端 JSON + 本地种子 fallback |
| 📋 两级任务 | 父任务 → 子任务，进度条汇总；每任务独立看板（拖拽）|
| 🛑 AI 可中止 | 长任务一键 Stop / Esc 键；已成功工具结果保留并报告 |
| 🔍 全局搜索 | `Ctrl/Cmd + K` 搜索任务 / 链接 / 日程 / 文件 |
| 💾 数据自托管 | SQLite + 启动/退出自动备份（保留 10 份），支持导出 / 导入 |

### 技术栈

Electron 28 · React 18 · TypeScript · Vite · TailwindCSS · DeepSeek API · Pi SDK 0.83 · SQLite (better-sqlite3) · MCP SDK 1.30

### 快速开始

**前置要求**：Node.js 22.19+、网络（首次启动下载 MCP/Skill 依赖约 30 MB）、DeepSeek API Key

```bash
git clone https://github.com/BuildInGitHub/ai-workhub.git
cd ai-workhub && npm install
npm run dev      # 开发模式（热重载）
npm run build    # 生产构建
```

**5 分钟上手**：
1. 启动应用 → 左侧 AI 伙伴面板自动展开
2. **设置 → API 设置** → 填 DeepSeek API Key
3. **设置 → API 引擎**：默认 v1；想用扩展市场就切到 v2
4. 工作台直接发指令，如"添加记事本到快速启动"
5. 顶部 Tab 切换：任务 / 链接 / 日历 / 项目 / 文件

**引擎选择建议**：
- **日常用 v1**：20+ 工具齐全，图式循环成熟
- **想试扩展切 v2**：记忆 / MCP / Skills / CLI 只在 v2 可用
- 任何时候觉得 v2 异常，切回 v1 立即生效，无需重启

### 数据管理

- **数据库**：`%APPDATA%\ai-workhub\ai-workhub.db`（SQLite，DBeaver 可连接）
- **自动备份**：启动 / 退出备份到 `%APPDATA%\ai-workhub\backups\`，保留最近 10 份
- **导出 / 导入**：设置 → 数据管理，支持 `.db` 与旧版 `.json`
- **Skills 目录**：`%APPDATA%\ai-workhub\skills\<name>\SKILL.md`

### 故障排查 FAQ

| 现象 | 解决 |
|------|------|
| AI 报 `DeepSeek API 错误: ...` | 直接看 message：Key 无效 / 余额不足 / 配额超限 |
| MCP 启动报 `命令 xxx 不存在` | 装依赖（uv → `irm https://astral.sh/uv/install.ps1 \| iex`；docker → Docker Desktop） |
| Skill 装了不生效 | 检查 `SKILL.md` 的 frontmatter `---` 块必须含 `name` + `description` |
| 顶部状态条 `[mcp] 0` 但 server 装过 | server 没真启动（uvx 等依赖缺失）。点抽屉里"重试所有 server"，或装个 npx 零依赖的如 `server-everything` |
| 跑了 10+ 秒想中止 | Stop 按钮 / Esc 键；已成功工具结果保留在对话流 |
| Mac 装完只有 Dock 图标 | 见上方"macOS 首次启动"段 |
| Mac dlopen 报 `incompatible architecture` | 你下载的 DMG 架构不对。Intel Mac 装 `*-x64.dmg`，Apple Silicon 装 `*-arm64.dmg` |
| 主进程启动后窗口不显示 | 多显示器 / 坐标系统异常。打开 Terminal：`/Applications/AI\ WorkHub.app/Contents/MacOS/AI\ WorkHub`，看主进程日志 |
| 快速启动换顺序 | 鼠标按住卡片 `⋮⋮` 拖动手柄，松手自动落库 |
| 任务只读详情 | hover 卡片点蓝色 👁 图标 |
| 桌面整理误删壁纸 | 已硬保护 `.lnk / .url / .theme / .desktop.ini`；损坏可让 AI 调 `restore_wallpaper` |

### 项目结构

```
ai-workhub/
├── electron/                # 主进程：窗口 / IPC / SQLite / MCP / Skill / CLI / 市场种子
├── src/
│   ├── components/         # React 组件（Sidebar / TaskManager / LinkManager ...）
│   ├── services/
│   │   ├── agent.ts        # v1 自研引擎（20+ 工具）
│   │   └── agent-pi/       # v2 Pi SDK 引擎（plan→execute→verify→replan）
│   └── types/              # TypeScript 类型
└── README.md
```

完整结构见 `tree -L 3` 或 IDE 资源管理器。

### 分支策略

- `main` - 主分支（稳定）。GitHub ruleset 强制 PR，但 bot 推送自动绕过
- `dev`  - 开发分支

### 贡献指南

1. Fork → 从 `dev` 拉分支
2. 本地：`npm run dev`（热重载）+ `npm run build` 验证生产构建
3. 跑 `npx tsc --noEmit`（**必须 0 错误**）→ push 到你的 fork
4. 在 `BuildInGitHub/ai-workhub` 开 PR，目标 `dev`

**Commit Message**：英文，`feat/fix/refactor: <简短描述>` 格式。

### 发布流程（开发者）

```bash
git tag -a v26.9.10 -m "feat: ...; fix: ..."
git push origin v26.9.10
# GitHub Actions 自动跑三平台构建 → published release
```

详见 `.github/workflows/release.yml` 和 [`RELEASE_NOTES.md`](./RELEASE_NOTES.md)。

### Roadmap

公开 TODO 已完成的功能见 [TODO.md](./TODO.md)（仓库内，`.gitignore` 排除，不入库）。公开 roadmap：

- 📚 **RAG 知识库**：本地文件内容向量化，语义搜索
- 🗂️ **底部任务栏增强**：窗口管理、快速启动栏
- 🖼️ **文件预览增强**：图片 / PDF 预览
- 🔌 **MCP HTTP / SSE transport**：目前只支持 stdio

### 许可证

[Apache License 2.0](LICENSE)

---

## English

### 📥 Download

Desktop · Apache-2.0 · cross-platform · CalVer (year.month.patch)

Every link points to `releases/latest/download/{filename}` — GitHub auto-picks the latest published version's matching file.

| Platform | Direct download |
|----------|----------------|
| 🪟 **Windows** (10+, x64) | [⬇ AI-WorkHub-Setup-1.0.0.exe](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-Setup-1.0.0.exe) |
| 🍎 **macOS** (12+, x64) | [⬇ AI-WorkHub-1.0.0-x64.dmg](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-1.0.0-x64.dmg) |
| 🍎 **macOS** (12+, arm64) | [⬇ AI-WorkHub-1.0.0-arm64.dmg](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-1.0.0-arm64.dmg) |
| 🐧 **Linux** (Ubuntu 22.04+, x64) | [⬇ AI-WorkHub-1.0.0.AppImage](https://github.com/BuildInGitHub/ai-workhub/releases/latest/download/AI-WorkHub-1.0.0.AppImage) |

> ⚠️ **Code signing**: Windows and macOS installers are currently **unsigned**. macOS first launch may appear to "do nothing" — see "⚠️ macOS first launch" above.
> 📦 [All releases + SHA256 →](https://github.com/BuildInGitHub/ai-workhub/releases)

For Chinese documentation, see the sections above (this README is bilingual but the English sections are intentionally shorter — refer to the Chinese version for full detail).

### Quick Start

Prerequisites: Node.js 22.19+, network, DeepSeek API Key.

```bash
git clone https://github.com/BuildInGitHub/ai-workhub.git
cd ai-workhub && npm install
npm run dev      # development (HMR)
npm run build    # production
```

For full feature documentation, troubleshooting, architecture, and contribution guide, see the Chinese sections above. The English section is intentionally kept short — when in doubt, read the Chinese version (which is the primary documentation).

### License

[Apache License 2.0](LICENSE)

### Contact

- GitHub: <https://github.com/BuildInGitHub/ai-workhub>
- Issues: <https://github.com/BuildInGitHub/ai-workhub/issues>
- Marketplace repo (TBD): <https://github.com/BuildInGitHub/ai-workhub-marketplace>