# AI WorkHub

[中文](#中文) | [English](#english)

---

## 中文

### 简介

AI WorkHub 是一个基于 Pi Agent 架构的 AI Agent 桌面办公应用，基于 DeepSeek API 实现智能任务规划与执行，帮助你高效管理文件、链接、任务和项目。

### 特性

- 🤖 **AI 智能助手** - 基于 DeepSeek API，支持自然语言任务规划与执行
- 📁 **文件管理** - 浏览、预览、收藏本地文件
- 🔗 **链接收藏** - 管理常用网站链接，支持自动添加 https 前缀
- ✅ **任务管理** - 创建、编辑、完成待办任务，支持优先级
- 📅 **日历** - 查看和创建日程事件
- 🔍 **全局搜索** - 快速搜索文件、链接、任务
- 🖥️ **桌面整理** - AI 自动整理桌面文件

### 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + TailwindCSS |
| 桌面 | Electron 28 |
| AI | DeepSeek API + Pi Agent |
| 存储 | JSON 本地文件存储 |

### 快速开始

#### 前置要求

- Node.js 18+
- npm 9+

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

1. 首次运行需要配置 DeepSeek API Key 以启用 AI 功能
2. AI 助手支持自然语言交互，可执行文件整理、任务管理等操作

### 项目结构

```
├── electron/           # Electron 主进程
│   ├── main.ts        # 主入口、窗口管理、IPC
│   ├── preload.ts     # 预加载脚本、API 暴露
│   └── database.ts   # JSON 数据库实现
├── src/
│   ├── components/   # React 组件
│   │   ├── Sidebar.tsx       # AI 助手面板
│   │   ├── FileManager.tsx   # 文件管理器
│   │   ├── LinkManager.tsx   # 链接收藏
│   │   ├── TaskManager.tsx   # 任务管理
│   │   └── ...
│   ├── services/     # 服务层
│   │   └── agent.ts          # Pi Agent 引擎
│   ├── types/        # TypeScript 类型定义
│   └── App.tsx       # 主应用组件
├── start.bat         # 启动脚本
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

AI WorkHub is an AI Agent desktop office application based on Pi Agent architecture, powered by DeepSeek API for intelligent task planning and execution. It helps you efficiently manage files, links, tasks, and projects.

### Features

- 🤖 **AI Assistant** - Based on DeepSeek API, supports natural language task planning and execution
- 📁 **File Management** - Browse, preview, and favorite local files
- 🔗 **Link Collection** - Manage commonly used website links with auto https prefix
- ✅ **Task Management** - Create, edit, and complete tasks with priority support
- 📅 **Calendar** - View and create calendar events
- 🔍 **Global Search** - Quickly search files, links, and tasks
- 🖥️ **Desktop Organization** - AI-powered automatic desktop file organization

### Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript + TailwindCSS |
| Desktop | Electron 28 |
| AI | DeepSeek API + Pi Agent |
| Storage | JSON local file storage |

### Quick Start

#### Prerequisites

- Node.js 18+
- npm 9+

#### Installation

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build (requires admin rights)
npm run build
```

#### Usage

```bash
# Option 1: Run in development mode
npm run dev

# Option 2: Run the built application
./start.bat
```

1. Configure DeepSeek API Key to enable AI features
2. AI Assistant supports natural language interaction for file organization, task management, etc.

### Project Structure

```
├── electron/           # Electron main process
│   ├── main.ts        # Main entry, window management, IPC
│   ├── preload.ts     # Preload script, API exposure
│   └── database.ts    # JSON database implementation
├── src/
│   ├── components/   # React components
│   │   ├── Sidebar.tsx       # AI Assistant panel
│   │   ├── FileManager.tsx   # File manager
│   │   ├── LinkManager.tsx   # Link collection
│   │   ├── TaskManager.tsx   # Task management
│   │   └── ...
│   ├── services/     # Service layer
│   │   └── agent.ts          # Pi Agent engine
│   ├── types/        # TypeScript type definitions
│   └── App.tsx       # Main app component
├── start.bat         # Startup script
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
