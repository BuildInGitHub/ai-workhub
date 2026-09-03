# AI WorkHub · 智汇工作台

> 基于 Pi Agent 架构的桌面 AI 办公伙伴 · DeepSeek 驱动 · 本地优先 · 双引擎可选

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?logo=electron)](https://www.electronjs.org/)
[![Pi SDK](https://img.shields.io/badge/Pi%20SDK-0.83.0-orange)](https://github.com/earendil-works)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-chat-blueviolet)](https://platform.deepseek.com/)

---

## 中文

### 简介

AI WorkHub 不是一个聊天机器人，而是一个**真能动手干活的桌面 AI 办公伙伴**：

- 让 AI **直接操作**本地文件 / 链接 / 任务 / 日历 / 项目，不只是给建议
- 内置 **20+ 工具**（搜索应用、添加快速启动、整理桌面、创建子任务、长期记忆……）
- 自带**图式循环引擎**：AI 失败会自动校验并重规划，最多 2 轮
- 支持 **v1 自研 / v2 基于 Pi SDK（@earendil-works/pi-agent-core）** 双引擎，**Settings 一键切换**
- **扩展市场**：MCP Servers / Skills / CLI 工具 一键安装；远端 JSON + 本地种子 fallback
- **本地优先**：所有数据存 SQLite（`%APPDATA%\ai-workhub\ai-workhub.db`），可用 DBeaver 直接打开
- **桌面环境安全**：整理桌面不会动壁纸、主题、`.lnk`、`.theme`、`.desktop.ini`

适合：开发者 / 自媒体 / 项目管理者 / 任何想让 AI 真正「帮着干活」而不是「陪着聊天」的人。

### 特性

| 类别 | 能力 |
|------|------|
| 🤖 **AI 智能助手** | 自然语言规划 + 执行：整理桌面、添加应用、快速启动、子任务、链接收藏 |
| 💬 **自然聊天** | 问候 / 闲聊 / 状态陈述自动识别，不产生伪工具步骤 |
| 🔄 **图式循环** | 规划 → 执行 → 校验 → 重规划，最多 2 轮，失败会自动换策略 |
| 🧠 **长期记忆** | 「记住这个」「别忘了」跨会话保存，下回自动召回 |
| 🔀 **双引擎** | v1 自研（稳定基线）/ v2 Pi SDK（实验性扩展），Settings 一键切换，无需重启 |
| 🧩 **扩展市场** | MCP Servers / Skills / CLI 工具 一键安装；远端索引 + 本地种子 |
| 📋 **两级任务** | 父任务 → 子任务，进度条汇总；每个任务独立**看板**（待办 / 进行中 / 已完成，拖拽） |
| 🔗 **链接收藏** | 7 个预设分类、可复制账号、**密码提示**（仅存提示不存明文）、自动补 `https://` |
| 💬 **多会话** | 多会话隔离、自动命名、持久化 |
| 🏠 **工作台** | 快速启动（**拖拽重排**）+ 迷你日历 + 智能建议 |
| 🛑 **AI 可中止** | 长任务一键 Stop 按钮 / Esc 键；已成功工具结果保留并报告 |
| 👁 **任务只读详情** | 任务卡片点 👁 图标打开 720px 两列只读详情（标题/状态/描述/子任务/元信息）|
| 🖼️ **桌面整理保护** | 壁纸、主题、`.lnk`、`.desktop.ini` 硬保护；如被破坏可一键恢复 |
| 🔍 **全局搜索** | `Ctrl/Cmd + K` 一键搜索任务 / 链接 / 日程 / 文件 |
| 📝 **意见反馈** | 应用内一键创建 GitHub Issue，含环境信息自动填充 |
| 💾 **数据自托管** | SQLite 数据库 + 启动/退出自动备份（保留 10 份），支持导出 / 导入 |

### 技术栈

| 类别 | 技术 |
|------|------|
| 桌面 | Electron 28 + electron-builder |
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + Lucide Icons |
| AI 引擎 | DeepSeek API（`deepseek-chat`）+ 自研 v1 + **Pi SDK v2**（`@earendil-works/pi-agent-core` `^0.83.0`、`@earendil-works/pi-ai` `^0.83.0`） |
| 扩展 | `@modelcontextprotocol/sdk` `^1.30.0`（MCP stdio 子进程） |
| 存储 | SQLite（`better-sqlite3` `^11.0.0`，DBeaver 可管理）+ `electron-store`（设置 KV） |
| 工具链 | vite + vite-plugin-electron + electron-builder + concurrently + wait-on |

### 快速开始

#### 前置要求

- Windows 10+ / macOS 12+ / Linux（建议 Ubuntu 22.04+）
- **Node.js 22.19+**（better-sqlite3 预编译包需要）
- 网络（首次启动会下载 MCP/Skill 依赖，约 30 MB）
- DeepSeek API Key（[申请](https://platform.deepseek.com/api_keys)）

#### 安装

```bash
# 克隆
git clone https://github.com/BuildInGitHub/ai-workhub.git
cd ai-workhub

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 直接启动（已构建版本）
./start.bat        # Windows
./node_modules/.bin/electron .   # macOS/Linux
```

#### 5 分钟上手

1. 启动应用 → 左侧 AI 伙伴面板自动展开
2. **设置 → API 设置** → 填 DeepSeek API Key → 保存
3. **设置 → API 引擎**：默认 v1 稳定；想用扩展市场就切到 v2
4. 工作台默认打开：可直接发指令"添加记事本到快速启动"
5. 点击顶部 Tab 切换：任务 / 链接 / 日历 / 项目 / 文件

**引擎选择建议**：
- **日常用 v1**：20+ 工具齐全、图式循环成熟、所有现有功能跑通
- **想试扩展切 v2**：记忆 / MCP / Skills / CLI / 扩展市场 只在 v2 可用
- 任何时候觉得 v2 异常，切回 v1 立即生效，无需重启

### 数据管理

| 项目 | 说明 |
|------|------|
| 数据库 | `%APPDATA%\ai-workhub\ai-workhub.db`（SQLite，DBeaver 可直接连接） |
| 自动备份 | 启动 / 退出时自动备份至 `%APPDATA%\ai-workhub\backups\`，保留最近 10 份 |
| 导出 / 导入 | 设置 → 数据管理，支持 `.db` 与旧版 `.json` 备份 |
| Skills 目录 | `%APPDATA%\ai-workhub\skills\<skill-name>\SKILL.md`（手工编写或市场装） |
| MCP / CLI 状态 | `mcp_servers` / `cli_commands` 表，状态、错误日志自动写入 |

### AI 引擎切换

设置 → API 设置 → "AI 引擎" 段可选择：

| 引擎 | 说明 | 适用场景 |
|------|------|----------|
| **v1 自研引擎（默认 / 稳定）** | `src/services/agent.ts` 自研实现，20+ 工具 + 图式循环（规划 → 执行 → 校验 → 重规划） | 日常办公、链接收藏、任务管理、桌面整理 |
| **v2 Pi SDK（实验）** | `src/services/agent-pi/` 基于 `@earendil-works/pi-agent-core` v0.83.0 内核；Provider 适配层做了 payload 裁剪（剥 DeepSeek 不需要的字段）以提升前缀缓存命中率 | 想用扩展市场（记忆 / MCP / Skills / CLI）、尝鲜 Pi Agent 生态 |

v1 与 v2 共用同一份 API Key、会话历史、工具 IPC 注入。切换**立即生效**，不需重启。

### 扩展市场（MCP / Skills / CLI）

v2 引擎独有。设置 → API 设置 → 展开"扩展"分类里的三个抽屉：

| 抽屉 | 作用 | 已预置内容 |
|------|------|------|
| **MCP Servers** | Model Context Protocol server，统一用 stdio 子进程拉工具 | 见下方 MCP 清单 |
| **Skills** | 把 `%APPDATA%/ai-workhub/skills/<name>/SKILL.md` 注入 v2 系统提示词 | 见下方 Skills 清单 |
| **CLI 工具** | 检测 PATH 中的 `node/npm/git` 等，并支持 winget / npm 一键安装 | 见下方 CLI 清单 |

每个抽屉都有"打开市场"按钮。市场 JSON 远端优先（GitHub raw），拉不到时 fallback 内嵌 `electron/marketplace-seed.json`。**已安装**自动检测并标绿。

#### MCP 清单（已精选）

| MCP | 适配器 | 一句话 | 前置依赖 |
|-----|--------|--------|----------|
| `server-filesystem` | 官方 | 沙箱目录文件读写 | `node>=18` |
| `mcp-server-git` | 社区 | git status/log/diff/commit | `uv (https://astral.sh/uv)` |
| `server-puppeteer` | 官方 | 浏览器自动化 + 抓取 | `node>=18` |
| `server-github` | 官方 | issue/PR/repo | `GITHUB_PAT` |
| `notion-mcp-server` | 官方 | Notion 页面 / 数据库 | `NOTION_TOKEN` |
| `server-slack` | 官方 | Slack 发消息 | `SLACK_BOT_TOKEN` |
| `server-gdrive` | 官方 | Google Drive | OAuth 凭据 |
| `server-everything` | 官方 | 演示用 | `node>=18` |

#### Skills 清单（已精选）

| Skill | 触发条件 |
|-------|----------|
| `daily-summary` | "总结今天" / "生成日报" / "回顾今日" |
| `weekly-review` | "周报" / "本周回顾" |
| `morning-standup` | "今天要做什么" / "晨会" |
| `inbox-zero` | "整理我的链接" / "清理收藏" |
| `meeting-prep` | "为会议准备" / "会议简报" |
| `project-kickoff` | "启动新项目" / "项目模板" |

#### CLI 清单（已精选）

| CLI | 用途 | 安装命令 |
|-----|------|----------|
| `opencli`（[OpenCLI](https://github.com/jackwener/opencli)） | 100+ 网站 + 本地 CLI + Electron 应用 统一桥 | `npm install -g @jackwener/opencli` |
| `ripgrep (rg)` | 极快代码 / 文本搜索 | `winget install BurntSushi.ripgrep.MSVC` |
| `fd` | 替代 find | `winget install sharkdp.fd` |
| `fzf` | 命令行模糊选择 | `winget install junegunn.fzf` |

### 故障排查 FAQ

| 现象 | 解决 |
|------|------|
| AI 报 `DeepSeek API 错误: ...` | 直接看 message：Key 无效 / 余额不足 / 配额超限都可能 |
| MCP 启动报 `命令 xxx 不存在` | 按提示装依赖（uv → `irm https://astral.sh/uv/install.ps1 \| iex`；docker → 装 Docker Desktop） |
| Skill 装了不生效 | 检查 `%APPDATA%\ai-workhub\skills\<name>\SKILL.md` 的 frontmatter `---` 块必须含 `name` + `description` |
| Skill 目录名 ≠ frontmatter name | 已宽松处理（以 frontmatter 为准），建议保持一致 |
| 快速启动带回"卸载程序" | 用更精确英文关键词重搜（如 `cloudmusic` 而非 `网易云音乐`） |
| AI 把闲聊当任务执行 | v1 自研引擎有 `needsExecution=false` 判定；偶发抽风可补一句"不用操作" |
| 桌面整理误删壁纸 / 快捷方式 | 已硬保护 `.lnk / .url / .theme / .desktop.ini`；如已损坏可让 AI 调 `restore_wallpaper` |
| AI 报"工具不存在 / 工具列表为空" | 重启应用，等 `[Agent] 工具初始化完成` 日志 |
| 子任务挂错父任务 | 让父任务标题唯一或换更精确关键词 |
| 链接 URL 被强制加 https | 手动编辑去掉，或绕过自动补全 |
| 跑了 10+ 秒想中止 | 点输入框旁 Stop 按钮 / 红色 "stop" 胶囊 / 按 Esc 键；已成功工具结果会保留在对话流 |
| 顶部状态条显示 `[mcp] 0` 但 server 装过 | server 没真启动（uvx 等依赖缺失）。点抽屉里 "重试所有 server" 按钮，或装一个 npx 零依赖的 server（如 `server-everything`） |
| 快速启动想换顺序 | 鼠标按住卡片上的 `⋮⋮` 拖动手柄拖到新位置，松手自动落库 |
| 任务想看完整信息但不想误改 | hover 任务卡片点蓝色 👁 图标——只读详情弹窗，2列布局，720px 宽 |

### 项目结构

```
ai-workhub/
├── electron/                     # Electron 主进程
│   ├── main.ts                   # 主入口 / 窗口 / IPC / 壁纸保护 / 数据备份
│   ├── preload.ts                # 预加载脚本 / API 暴露（v1 + v2 + mcp + skill + cli + market）
│   ├── database.ts               # SQLite 数据库（自动从旧 JSON 迁移）
│   ├── mcp-manager.ts            # MCP stdio 子进程生命周期管理（v2 引擎用）
│   ├── skill-loader.ts           # SKILL.md 扫描与 frontmatter 解析（v2 引擎用）
│   ├── cli-tracker.ts            # CLI 工具 PATH 检测 + winget 安装（v2 引擎用）
│   └── marketplace-seed.json     # 扩展市场内置种子 JSON
├── src/
│   ├── App.tsx                   # 主应用组件（v1/v2 引擎分发、Tab 路由、AI 消息处理）
│   ├── components/               # React 组件
│   │   ├── Sidebar.tsx           # AI 伙伴面板 + 设置弹窗（两栏布局：AI / 扩展 / 数据）
│   │   ├── SessionManager.tsx    # 多会话管理
│   │   ├── TaskManager.tsx       # 两级任务列表
│   │   ├── TaskKanban.tsx        # 任务定制看板（拖拽 + 编辑弹窗）
│   │   ├── LinkManager.tsx       # 链接收藏（分类 / 账号 / 密码提示）
│   │   ├── ProjectManager.tsx    # 项目 + 关联链接任务
│   │   ├── FileManager.tsx       # 文件管理
│   │   ├── FilePreview.tsx       # 文件预览
│   │   ├── Calendar.tsx          # 日历视图
│   │   ├── MiniCalendar.tsx      # 工作台迷你日历
│   │   ├── QuickLaunch.tsx       # 快速启动管理
│   │   ├── GlobalSearch.tsx      # 全局搜索
│   │   ├── FeedbackDialog.tsx    # GitHub Issues 反馈入口
│   │   ├── ConfirmDialog.tsx     # 通用确认弹窗
│   │   ├── MarketplaceModal.tsx  # 扩展市场弹窗
│   │   ├── Home.tsx              # 工作台
│   │   ├── TabBar.tsx            # 顶部多 Tab
│   │   └── TaskBar.tsx           # 底部状态栏
│   ├── services/
│   │   ├── agent.ts              # v1 自研引擎（20+ 工具，稳定基线）
│   │   ├── agent-pi/             # v2 Pi SDK 引擎
│   │   │   ├── engine.ts         # 编排器（plan→execute→verify→replan）
│   │   │   ├── provider.ts       # DeepSeek 适配层（payload 裁剪）
│   │   │   ├── persist.ts        # AgentMessage ↔ SQLite 持久化
│   │   │   ├── tools/            # 26 个工具（tasks / links / apps / desktop / memory ...）
│   │   │   ├── types.ts          # 类型定义
│   │   │   └── index.ts          # 公共 API
│   │   └── marketplace.ts        # 远端市场 JSON 拉取客户端
│   └── types/                    # TypeScript 类型定义
├── start.bat                     # 启动脚本（Windows）
└── README.md
```

### 分支策略

- `main` - 主分支（稳定版，请用 PR 流程）
- `dev`  - 开发分支

### 贡献指南

1. Fork → 从 `dev` 拉分支
2. 本地开发：`npm run dev`（前端热重载）+ `npm run build` + `./start.bat` 验证生产构建
3. 修改代码后跑 `npx tsc --noEmit`（**必须 0 错误**）+ `git push` 到你的 fork
4. 在 `BuildInGitHub/ai-workhub` 开 PR，目标 `dev` 分支

**Commit Message**：建议英文，遵循 `feat/fix/refactor: <简短描述>` 格式。

### Roadmap

公开 TODO 中已完成的功能参见 [TODO.md](./TODO.md)（仓库内），接下来要做：

- 📚 **RAG 知识库**：本地文件内容向量化，支持语义搜索
- 🗂️ **底部任务栏增强**：窗口管理、快速启动栏
- 🖼️ **文件预览增强**：图片 / PDF 预览
- 🏷️ **链接自定义分类**：目前只支持 7 个预设分类
- 🔌 **MCP HTTP / SSE transport**：目前只支持 stdio

### 许可证

[Apache License 2.0](LICENSE)

---

## English

### Introduction

AI WorkHub is **not just another chatbot** — it's a **desktop AI office companion that actually does work**:

- The AI **directly operates** your local files, links, tasks, calendar, projects — not just gives suggestions
- **20+ built-in tools** (search apps, add to quick launch, organize desktop, create subtasks, long-term memory …)
- **Graph-style agent loop**: plan → execute → verify → re-plan, up to 2 rounds of self-correction
- **Dual AI engines**: v1 self-built (stable baseline) / v2 based on Pi SDK (`@earendil-works/pi-agent-core`) — switchable in Settings
- **Extension marketplace**: install MCP servers, Skills, and CLI tools with one click; remote JSON + local seed fallback
- **Local-first**: all data in SQLite (`%APPDATA%\ai-workhub\ai-workhub.db`), open with DBeaver
- **Desktop-safe**: organizing the desktop never touches wallpapers, themes, `.lnk`, `.theme`, `.desktop.ini`

For: developers / content creators / project managers / anyone who wants AI to *do the work* instead of *chat*.

### Features

| Category | Capability |
|----------|-----------|
| 🤖 **AI Assistant** | Natural-language planning + execution: organize desktop, add apps to quick launch, subtasks, link collection |
| 💬 **Natural Chat** | Greetings / chit-chat / status statements detected; no fake tool steps |
| 🔄 **Graph Loop** | Plan → execute → verify → re-plan, up to 2 rounds of self-correction |
| 🧠 **Long-term Memory** | "Remember this" persists across sessions, auto-recalled next time |
| 🔀 **Dual Engines** | v1 self-built (stable) / v2 Pi SDK (experimental), toggle in Settings, no restart |
| 🧩 **Extension Marketplace** | MCP servers / Skills / CLI tools one-click install; remote index + local seed |
| 📋 **Two-level Tasks** | Parent → subtasks with progress bar; each task has its own **kanban** (todo/doing/done, drag & drop) |
| 🔗 **Link Collection** | 7 preset categories, copyable account, **password hint** (hint only, never plaintext), auto `https://` |
| 💬 **Multi-session** | Isolated contexts, auto-naming, persistent |
| 🏠 **Workspace** | Quick launch (**drag to reorder**) + mini calendar + smart suggestions |
| 🛑 **Cancellable AI** | Stop button or Esc to abort a long-running task; completed tool results are preserved |
| 👁 **Read-only Task View** | Click the 👁 icon on a task card to open a 720px two-column detail panel (title, status, description, subtasks, metadata) |
| 🖼️ **Desktop-safety** | Wallpapers / themes / `.lnk` / `.desktop.ini` hard-protected; one-click restore if broken |
| 🔍 **Global Search** | `Ctrl/Cmd + K` to search tasks / links / calendar / files |
| 📝 **Feedback** | One-click GitHub Issue from inside the app, environment auto-filled |
| 💾 **Data Self-hosting** | SQLite + auto-backup on start/quit (last 10), export / import supported |

### Tech Stack

| Layer | Tech |
|-------|------|
| Desktop | Electron 28 + electron-builder |
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + Lucide Icons |
| AI Engine | DeepSeek API (`deepseek-chat`) + self-built v1 + **Pi SDK v2** (`@earendil-works/pi-agent-core` `^0.83.0`, `@earendil-works/pi-ai` `^0.83.0`) |
| Extensions | `@modelcontextprotocol/sdk` `^1.30.0` (MCP stdio subprocess) |
| Storage | SQLite (`better-sqlite3` `^11.0.0`, DBeaver-compatible) + `electron-store` (settings KV) |
| Tooling | vite + vite-plugin-electron + electron-builder + concurrently + wait-on |

### Quick Start

#### Prerequisites

- Windows 10+ / macOS 12+ / Linux (Ubuntu 22.04+ recommended)
- **Node.js 22.19+** (required by `better-sqlite3` prebuilt binary)
- Internet (first start downloads ~30 MB of MCP / Skill deps)
- DeepSeek API Key ([apply here](https://platform.deepseek.com/api_keys))

#### Install

```bash
git clone https://github.com/BuildInGitHub/ai-workhub.git
cd ai-workhub
npm install
npm run dev          # dev mode (HMR)
npm run build        # production build
./start.bat          # Windows / or run electron directly
```

#### 5-minute Setup

1. Launch → AI panel opens on the left
2. **Settings → API Settings** → paste your DeepSeek API Key → Save
3. **Settings → AI Engine**: keep v1 (default stable) or switch to v2 to enable the marketplace
4. Try the workspace: tell the AI "add notepad to quick launch"
5. Click top Tabs to switch: Tasks / Links / Calendar / Projects / Files

**Engine selection**:
- **Use v1 for daily work**: 20+ tools, mature graph loop, all features battle-tested
- **Switch to v2 to try extensions**: memory / MCP / Skills / CLI only work in v2
- Anytime v2 misbehaves, switch back to v1 — instant, no restart

### Data Management

| Item | Description |
|------|-------------|
| Database | `%APPDATA%\ai-workhub\ai-workhub.db` (SQLite, DBeaver-connectable) |
| Auto backup | On start / quit into `%APPDATA%\ai-workhub\backups\`, keeps last 10 |
| Export / Import | Settings → Data Management; `.db` and legacy `.json` backups supported |
| Skills directory | `%APPDATA%\ai-workhub\skills\<skill-name>\SKILL.md` (handwritten or marketplace-installed) |
| MCP / CLI state | `mcp_servers` / `cli_commands` tables; status + error logs auto-written |

### AI Engine Switching

Settings → API Settings → "AI Engine" picker:

| Engine | Description | Use when |
|--------|-------------|----------|
| **v1 Self-built (default / stable)** | `src/services/agent.ts`, 20+ tools + graph loop | Daily work, link collection, task mgmt, desktop organize |
| **v2 Pi SDK (experimental)** | `src/services/agent-pi/` on `@earendil-works/pi-agent-core` v0.83.0; payload scrubbing for DeepSeek prefix cache | Want the marketplace (memory / MCP / Skills / CLI) |

v1 and v2 share the same API key, session history, and tool IPC. Switch takes effect immediately, no restart.

### Extension Marketplace (MCP / Skills / CLI)

v2 only. Settings → API Settings → Extensions tab → three drawers:

| Drawer | What it does | Pre-installed items |
|--------|--------------|---------------------|
| **MCP Servers** | Model Context Protocol servers via stdio subprocess | See MCP list below |
| **Skills** | `%APPDATA%/ai-workhub/skills/<name>/SKILL.md` injected into v2 system prompt | See Skills list below |
| **CLI Tools** | PATH detection + winget / npm one-click install | See CLI list below |

Each drawer has a "Browse Marketplace" button. Marketplace JSON prefers remote (GitHub raw), falls back to local seed `electron/marketplace-seed.json`. Installed items are auto-detected and badge-marked.

#### MCP List (curated)

| MCP | Maintained by | One-liner | Requires |
|-----|---------------|-----------|----------|
| `server-filesystem` | Official | Sandbox directory read/write | `node>=18` |
| `mcp-server-git` | Community | git status/log/diff/commit | `uv (https://astral.sh/uv)` |
| `server-puppeteer` | Official | Browser automation + scraping | `node>=18` |
| `server-github` | Official | issue / PR / repo | `GITHUB_PAT` |
| `notion-mcp-server` | Official | Notion pages / databases | `NOTION_TOKEN` |
| `server-slack` | Official | Slack messages | `SLACK_BOT_TOKEN` |
| `server-gdrive` | Official | Google Drive | OAuth credentials |
| `server-everything` | Official | Demo / testing | `node>=18` |

#### Skills List (curated)

| Skill | Triggers on |
|-------|-------------|
| `daily-summary` | "summarize today" / "daily report" / "recap today" |
| `weekly-review` | "weekly review" / "what did I do this week" |
| `morning-standup` | "what should I do today" / "standup" |
| `inbox-zero` | "organize my links" / "clean bookmarks" |
| `meeting-prep` | "prep for meeting" / "meeting brief" |
| `project-kickoff` | "start new project" / "project template" |

#### CLI List (curated)

| CLI | Purpose | Install |
|-----|---------|---------|
| `opencli` ([OpenCLI](https://github.com/jackwener/opencli)) | Unified bridge for 100+ websites + local CLIs + Electron apps | `npm install -g @jackwener/opencli` |
| `ripgrep (rg)` | Ultra-fast code/text search | `winget install BurntSushi.ripgrep.MSVC` |
| `fd` | `find` replacement | `winget install sharkdp.fd` |
| `fzf` | Fuzzy command-line selector | `winget install junegunn.fzf` |

### Troubleshooting FAQ

| Symptom | Fix |
|---------|-----|
| AI reports `DeepSeek API error: ...` | Read the message directly: invalid key / no balance / quota exceeded are common |
| MCP startup reports `command not found` | Install per the hint (uv → `irm https://astral.sh/uv/install.ps1 \| iex`; docker → install Docker Desktop) |
| Skill installed but not active | Check `%APPDATA%\ai-workhub\skills\<name>\SKILL.md` frontmatter (`---` block) has `name` + `description` |
| Skill dir name ≠ frontmatter name | Now lenient (frontmatter wins); keeping them identical still recommended |
| Quick launch adds the uninstaller | Use a more precise English keyword (e.g. `cloudmusic` instead of "网易云音乐") |
| AI treats chit-chat as a task | v1 has a `needsExecution=false` rule; if it misfires, reply with "no action needed" |
| Desktop organize deleted wallpaper / shortcuts | Hard-protected already; if damaged, ask AI to call `restore_wallpaper` |
| AI says "tool not found / empty tool list" | Restart the app, wait for `[Agent] 工具初始化完成` log |
| Subtask attached to wrong parent | Make parent title unique or use a more specific keyword |
| Link URL forced to `https://` | Edit manually to drop the `s`, or bypass auto-prefix |
| 10+ seconds into a run and you want out | Click the Stop button next to the input, the red `stop` pill, or press Esc. Completed tool results stay in the conversation. |
| Top status bar shows `[mcp] 0` even though servers are installed | The server never started (uvx or another dependency missing). Click the MCP drawer's "重试所有 server" button, or install an npx-zero-dependency server like `server-everything`. |
| Quick launch items in the wrong order | Grab the `⋮⋮` handle and drag to a new slot; order is persisted on drop. |
| Want to inspect a task without accidentally editing it | Hover the task card and click the blue 👁 icon - the read-only detail panel opens at 720px with a two-column layout. |

### Project Structure

```
ai-workhub/
├── electron/                     # Electron main process
│   ├── main.ts                   # Entry / windows / IPC / wallpaper / backup
│   ├── preload.ts                # Preload + API surface (v1 + v2 + mcp + skill + cli + market)
│   ├── database.ts               # SQLite (auto-migrates from legacy JSON)
│   ├── mcp-manager.ts            # MCP stdio subprocess lifecycle (v2 only)
│   ├── skill-loader.ts           # SKILL.md scan + frontmatter parse (v2 only)
│   ├── cli-tracker.ts            # CLI PATH detect + winget install (v2 only)
│   └── marketplace-seed.json     # Bundled marketplace seed JSON
├── src/
│   ├── App.tsx                   # Main app (v1/v2 engine dispatch, tabs, AI messaging)
│   ├── components/               # React components
│   │   ├── Sidebar.tsx           # AI panel + settings (two-column: AI / Extensions / Data)
│   │   ├── SessionManager.tsx    # Multi-session
│   │   ├── TaskManager.tsx       # Two-level tasks
│   │   ├── TaskKanban.tsx        # Per-task kanban
│   │   ├── LinkManager.tsx       # Links (categories / accounts / hints)
│   │   ├── ProjectManager.tsx    # Projects + linked items
│   │   ├── FileManager.tsx       # Files
│   │   ├── FilePreview.tsx       # File preview
│   │   ├── Calendar.tsx          # Calendar view
│   │   ├── MiniCalendar.tsx      # Workspace mini-calendar
│   │   ├── QuickLaunch.tsx       # Quick launch mgmt
│   │   ├── GlobalSearch.tsx      # Cmd/Ctrl+K search
│   │   ├── FeedbackDialog.tsx    # GitHub Issues feedback
│   │   ├── ConfirmDialog.tsx     # Shared confirm
│   │   ├── MarketplaceModal.tsx  # Extension marketplace modal
│   │   ├── Home.tsx              # Workspace
│   │   ├── TabBar.tsx            # Top tabs
│   │   └── TaskBar.tsx           # Bottom status bar
│   ├── services/
│   │   ├── agent.ts              # v1 self-built engine (20+ tools, stable)
│   │   ├── agent-pi/             # v2 Pi SDK engine
│   │   │   ├── engine.ts         # Orchestrator (plan→execute→verify→replan)
│   │   │   ├── provider.ts       # DeepSeek adapter (payload scrubbing)
│   │   │   ├── persist.ts        # AgentMessage ↔ SQLite
│   │   │   ├── tools/            # 26 tools (tasks / links / apps / desktop / memory …)
│   │   │   ├── types.ts          # Type definitions
│   │   │   └── index.ts          # Public API
│   │   └── marketplace.ts        # Remote marketplace fetcher
│   └── types/                    # TypeScript types
├── start.bat                     # Startup script (Windows)
└── README.md
```

### Branch Strategy

- `main` — stable, PRs welcome
- `dev`   — development

### Contributing

1. Fork → branch from `dev`
2. Local: `npm run dev` (HMR) + `npm run build` + `./start.bat` to verify prod build
3. Before push: `npx tsc --noEmit` (**must be 0 errors**)
4. PR target: `dev` branch in `BuildInGitHub/ai-workhub`

**Commit messages**: English preferred, follow `feat/fix/refactor: <short description>` format.

### Roadmap

Completed work lives in [TODO.md](./TODO.md). Next up:

- 📚 **RAG knowledge base**: vectorize local file content, semantic search
- 🗂️ **Taskbar enhancements**: window manager, quick launch bar
- 🖼️ **File preview**: image / PDF
- 🏷️ **Custom link categories**: beyond the 7 presets
- 🔌 **MCP HTTP / SSE transport**: currently stdio-only

### License

[Apache License 2.0](LICENSE)

---

## 联系方式 | Contact

- GitHub: <https://github.com/BuildInGitHub/ai-workhub>
- Issues: <https://github.com/BuildInGitHub/ai-workhub/issues>
- Marketplace repo (TBD): <https://github.com/BuildInGitHub/ai-workhub-marketplace>