# AI WorkHub

[中文](#中文) | [English](#english)

---

## 中文

### 简介

AI WorkHub 是一个基于 Pi Agent 架构的 AI Agent 桌面办公应用，基于 DeepSeek API 实现智能任务规划与执行。整合文件、链接、任务、日历、项目于一体，让 AI 真正帮你干活。

### 特性

- 🤖 **AI 智能助手** - 自然语言规划与执行：整理桌面、添加应用、创建任务子任务、管理链接
- ✅ **两级任务管理** - 一级任务 + 子任务，进度追踪；每个任务可进入**定制看板**（待办/进行中/已完成，拖拽排序）
- 🔗 **链接收藏** - 分类、标签、账号（一键复制）、密码提示（仅存提示不存明文）、自动 https 前缀
- 💬 **会话管理** - 多会话独立上下文、自动命名、删除保护、历史持久化
- 📁 **文件管理** - 浏览本地磁盘、收藏常用目录、文件预览
- 📅 **日历与迷你日历** - 完整日历视图 + 工作台迷你日历，日程一目了然
- 🗂️ **项目管理** - 项目关联链接与任务
- 🚀 **快速启动** - 应用/文件/文件夹/链接快捷入口，AI 可直接添加
- 🖥️ **AI 桌面整理** - 自动分类移动文件，**保护壁纸、主题、快捷方式、系统文件**
- 💾 **数据安全** - SQLite 存储 + 启动/退出自动备份 + 导出/导入

### 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + TailwindCSS + Lucide Icons |
| 桌面 | Electron 28 |
| AI | DeepSeek API + Pi Agent（工具调用 + 参数推断） |
| 存储 | SQLite（better-sqlite3，可用 DBeaver 管理） |

### 快速开始

#### 前置要求

- Node.js 18+
- npm 9+
- 安装依赖后首次构建需要网络下载 better-sqlite3 预编译包

#### 安装

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建 (需要管理员权限)
npm run build
```

#### 使用

```bash
# 方式一：开发模式运行
npm run dev

# 方式二：运行已构建的应用
./start.bat
```

1. 点击 AI 伙伴侧边栏底部 ⚙️，配置 DeepSeek API Key 启用 AI 功能
2. AI 支持自然语言操作，例如：
   - 「帮我整理桌面文件」
   - 「把网易云音乐加到快速启动」
   - 「给 X 任务添加子任务：A、B」
   - 「添加一个链接，分类工作，账号 admin」

### 数据管理

| 项目 | 说明 |
|------|------|
| 数据库 | `%APPDATA%\ai-workhub\ai-workhub.db`（SQLite，DBeaver 可直接连接） |
| 自动备份 | 启动/退出时自动备份至 `%APPDATA%\ai-workhub\backups\`，保留最近 10 份 |
| 导出/导入 | 设置 → 数据管理，支持 .db 与旧版 .json 备份 |

### 项目结构

```
├── electron/               # Electron 主进程
│   ├── main.ts            # 主入口、窗口、IPC、壁纸保护、数据备份
│   ├── preload.ts         # 预加载脚本、API 暴露
│   └── database.ts        # SQLite 数据库（自动从旧 JSON 迁移）
├── src/
│   ├── components/        # React 组件
│   │   ├── Sidebar.tsx        # AI 伙伴面板（可折叠回复）
│   │   ├── SessionManager.tsx # 会话管理
│   │   ├── TaskManager.tsx    # 两级任务列表
│   │   ├── TaskKanban.tsx     # 任务定制看板（拖拽）
│   │   ├── LinkManager.tsx    # 链接收藏（分类/账号/密码提示）
│   │   ├── Home.tsx           # 工作台（快速启动/迷你日历）
│   │   ├── MiniCalendar.tsx   # 迷你日历
│   │   ├── ProjectManager.tsx # 项目管理
│   │   ├── FileManager.tsx    # 文件管理
│   │   ├── ConfirmDialog.tsx  # 通用确认框
│   │   └── ...
│   ├── services/          # 服务层
│   │   └── agent.ts            # Pi Agent 引擎（20+ 工具）
│   ├── types/             # TypeScript 类型定义
│   └── App.tsx            # 主应用组件
├── start.bat              # 启动脚本
└── README.md
```

### 分支策略

- `main` - 主分支（稳定版）
- `dev` - 开发分支

### 许可证

[Apache License 2.0](LICENSE)

---

## English

### Introduction

AI WorkHub is an AI Agent desktop office application built on Pi Agent architecture with DeepSeek API for intelligent task planning and execution. It unifies files, links, tasks, calendar and projects — and lets the AI actually do the work.

### Features

- 🤖 **AI Assistant** - Natural-language planning & execution: organize desktop, add apps to quick launch, create tasks/subtasks, manage links
- ✅ **Two-level Task Management** - Parent tasks with subtasks and progress tracking; each task opens its own **kanban board** (todo/doing/done with drag & drop)
- 🔗 **Link Collection** - Categories, tags, account (one-click copy), password hints (hints only, never plaintext), auto https prefix
- 💬 **Session Management** - Multiple chat sessions with isolated context, auto-naming, persistence
- 📁 **File Management** - Browse local drives, favorite directories, file preview
- 📅 **Calendar + Mini Calendar** - Full calendar view plus a workspace mini calendar
- 🗂️ **Projects** - Associate links and tasks with projects
- 🚀 **Quick Launch** - Shortcuts for apps/files/folders/links, AI can add them directly
- 🖥️ **AI Desktop Organizer** - Auto-categorizes files while **protecting wallpaper, themes, shortcuts and system files**
- 💾 **Data Safety** - SQLite storage + auto-backup on start/quit + export/import

### Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript + TailwindCSS + Lucide Icons |
| Desktop | Electron 28 |
| AI | DeepSeek API + Pi Agent (tool calling + param inference) |
| Storage | SQLite (better-sqlite3, manageable with DBeaver) |

### Quick Start

#### Prerequisites

- Node.js 18+
- npm 9+

#### Installation

```bash
npm install
npm run dev        # Development mode
npm run build      # Build (requires admin rights)
```

#### Usage

```bash
npm run dev        # Option 1: development mode
./start.bat        # Option 2: run the built app
```

1. Open Settings (⚙️ at the bottom of the AI sidebar) and configure your DeepSeek API Key
2. The AI understands natural language, e.g.:
   - "Organize my desktop files"
   - "Add NetEase Cloud Music to quick launch"
   - "Add subtasks A, B to the X task"
   - "Add a link, category work, account admin"

### Data Management

| Item | Description |
|------|-------------|
| Database | `%APPDATA%\ai-workhub\ai-workhub.db` (SQLite, connectable via DBeaver) |
| Auto backup | On start/quit into `%APPDATA%\ai-workhub\backups\`, keeps last 10 |
| Export/Import | Settings → Data Management; supports .db and legacy .json backups |

### Project Structure

```
├── electron/               # Electron main process
│   ├── main.ts            # Entry, windows, IPC, wallpaper protection, backup
│   ├── preload.ts         # Preload script, API exposure
│   └── database.ts        # SQLite database (auto-migrates from legacy JSON)
├── src/
│   ├── components/        # React components
│   │   ├── Sidebar.tsx        # AI panel (collapsible replies)
│   │   ├── SessionManager.tsx # Session management
│   │   ├── TaskManager.tsx    # Two-level task list
│   │   ├── TaskKanban.tsx     # Per-task kanban (drag & drop)
│   │   ├── LinkManager.tsx    # Links (category/account/password hint)
│   │   ├── Home.tsx           # Workspace (quick launch/mini calendar)
│   │   ├── MiniCalendar.tsx   # Mini calendar
│   │   ├── ProjectManager.tsx # Projects
│   │   ├── FileManager.tsx    # File manager
│   │   ├── ConfirmDialog.tsx  # Shared confirm dialog
│   │   └── ...
│   ├── services/          # Service layer
│   │   └── agent.ts            # Pi Agent engine (20+ tools)
│   ├── types/             # TypeScript definitions
│   └── App.tsx            # Main app component
├── start.bat              # Startup script
└── README.md
```

### Branch Strategy

- `main` - Main branch (stable)
- `dev` - Development branch

### License

[Apache License 2.0](LICENSE)

---

## 联系方式 | Contact

- GitHub: https://github.com/BuildInGitHub/ai-workhub
- Issues: https://github.com/BuildInGitHub/ai-workhub/issues
