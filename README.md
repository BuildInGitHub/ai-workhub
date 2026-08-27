# AI WorkHub

[中文](#中文) | [English](#english)

---

## 中文

### 简介

AI WorkHub 是一个基于 Pi Agent 的 AI Agent 桌面办公应用，帮助你高效管理文件、链接、任务和项目。

### 特性

- 🤖 **AI 智能助手** - 基于 DeepSeek API，支持自然语言任务规划与执行
- 📁 **文件管理** - 浏览、预览、收藏本地文件
- 🔗 **链接收藏** - 管理常用网站链接
- ✅ **任务管理** - 创建、编辑、完成任务
- 📅 **日历** - 查看和创建日程事件
- 🔍 **全局搜索** - 快速搜索文件、链接、任务

### 技术栈

- **前端**: React 18 + TypeScript + TailwindCSS
- **桌面**: Electron 28
- **AI**: DeepSeek API + Pi Agent
- **存储**: JSON 本地文件存储

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

# 构建
npm run build
```

#### 使用

1. 运行构建后的应用 `release/AI WorkHub-Fluorescent/AI WorkHub.exe`
2. （可选）配置 DeepSeek API Key 以启用 AI 功能

### 项目结构

```
├── electron/           # Electron 主进程
│   ├── main.ts       # 主入口
│   ├── preload.ts   # 预加载脚本
│   └── database.ts  # JSON 数据库
├── src/
│   ├── components/  # React 组件
│   ├── services/    # 服务层 (Agent)
│   └── types/       # TypeScript 类型
├── release/         # 构建输出
└── USER_JOURNEY.md # 用户旅程文档
```

### 分支策略

- `main` - 主分支（稳定版）
- `dev` - 开发分支

### 许可证

[Apache License 2.0](LICENSE)

---

## English

### Introduction

AI WorkHub is an AI Agent desktop office application based on Pi Agent, helping you efficiently manage files, links, tasks, and projects.

### Features

- 🤖 **AI Assistant** - Based on DeepSeek API, supports natural language task planning and execution
- 📁 **File Management** - Browse, preview, and favorite local files
- 🔗 **Link Collection** - Manage commonly used website links
- ✅ **Task Management** - Create, edit, and complete tasks
- 📅 **Calendar** - View and create calendar events
- 🔍 **Global Search** - Quickly search files, links, and tasks

### Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS
- **Desktop**: Electron 28
- **AI**: DeepSeek API + Pi Agent
- **Storage**: JSON local file storage

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

# Build
npm run build
```

#### Usage

1. Run the built application at `release/AI WorkHub-Fluorescent/AI WorkHub.exe`
2. (Optional) Configure DeepSeek API Key to enable AI features

### Project Structure

```
├── electron/           # Electron main process
│   ├── main.ts       # Main entry
│   ├── preload.ts   # Preload script
│   └── database.ts  # JSON database
├── src/
│   ├── components/  # React components
│   ├── services/    # Services (Agent)
│   └── types/       # TypeScript types
├── release/         # Build output
└── USER_JOURNEY.md # User journey documentation
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
