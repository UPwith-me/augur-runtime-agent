<div align="center">

# 🔮 Augur
### The AI-Native Runtime Debugger
### AI 原生运行时调试器

![Augur Banner](./assets/augur_banner.png)

[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-red.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Powered By](https://img.shields.io/badge/AI-Gemini%20%7C%20Claude%20%7C%20OpenAI-purple.svg?style=flat-square)](https://deepmind.google/)

[English](#-english) | [中文 (Chinese)](#-中文-chinese)

</div>

---

<a name="-english"></a>
## 🌍 English

### 📖 Introduction

**Augur** represents a paradigm shift in AI-assisted coding. It moves beyond static code analysis to **Runtime Intelligence**.

Traditional AI coding assistants (like Copilot) are "blind" to the execution of your code. They guess what might happen based on text. Augur, however, connects directly to the **Debug Adapter Protocol (DAP)**, allowing it to:
1.  **Observe** live memory, stack frames, and variable states.
2.  **Think** about the runtime state using advanced LLMs.
3.  **Act** autonomously by stepping through code, inspecting variables, and proposing fixes.

It is not just a chatbot; it is a **Ghost in the Shell** of your debugger.

## 🛡️ License

This project is licensed under the **Non-Commercial License** - see the [LICENSE](LICENSE) file for details.

> **Note**: Commercial use requires a separate license. Please contact the author for details.

### ✨ Key Features

-   **🧠 Autonomous Debugging Loop**: A fully autonomous agent that implements an "Observe-Think-Act" loop. It steps through your code, analyzes variables, and decides the next move without human intervention.
-   **🔌 Universal Model Support**: Built-in support for **Gemini Pro** and **Claude 3.5 Sonnet**. Plus, a **Generic AI Gateway** that allows you to use **ANY** OpenAI-compatible model (DeepSeek, Qwen, Llama 3, etc.) just by changing a config file.
-   **🎥 Web Visualizer**: A beautiful, React-based dashboard to visualize the AI's thought process. See exactly what the AI sees ("Golden Context") and replay debugging sessions.
-   **🛠️ VS Code Integration**: A dedicated extension that brings Augur directly into your IDE.
-   **⚡ CI/CD Ready**: Includes a headless `augur-ci-agent` that can automatically debug failing tests in your CI pipeline.

### 🏗️ Architecture

The system is composed of three decoupled micro-services:

1.  **`augur-debugger-service` (The Brain)**: A Node.js server that manages debug sessions, connects to LLMs, and exposes a REST API.
2.  **`augur-web-visualizer` (The Eyes)**: A Vite+React frontend for visualizing the debugging process.
3.  **`augur-vscode-extension` (The Hands)**: A VS Code extension that bridges the IDE's debugger with the Augur service.

```mermaid
graph LR
    subgraph "User Interface"
        Web[Web Visualizer]
        VSCode[VS Code Extension]
    end

    subgraph "Core Logic"
        Server[Debugger Service]
        Agent[CI Agent]
    end

    subgraph "Runtime"
        DAP[Debug Adapter]
        Python[Python Process]
    end

    subgraph "AI Cloud"
        LLM[LLM (Gemini/Claude/OpenAI)]
    end

    Web <--> Server
    VSCode <--> Server
    Agent <--> Server
    Server <--> DAP
    DAP <--> Python
    Server <--> LLM
```

### 🚀 Getting Started

#### Prerequisites
-   **Node.js** v18+
-   **Python** 3.8+ (for target scripts)

#### Installation

1.  **Clone the Repo**
    ```bash
    git clone https://github.com/UPwith-me/Augur-Runtime-Debugging-Agent.git
    cd Augur-Runtime-Debugging-Agent
    ```

2.  **Install Dependencies**
    ```bash
    # Backend
    cd augur-debugger-service
    npm install

    # Frontend
    cd ../augur-web-visualizer
    npm install
    ```

3.  **Configuration**
    Create a `.env` file in `augur-debugger-service`:
    ```env
    # Option 1: Use Google Gemini
    GEMINI_API_KEY=your_key_here
    
    # Option 2: Use Custom Model (e.g., DeepSeek)
    OPENAI_API_KEY=sk-your-key
    OPENAI_BASE_URL=https://api.deepseek.com
    ```

#### Usage

**Mode A: Simulation (Web UI)**
1.  Start Backend: `npm start` in `augur-debugger-service`.
2.  Start Frontend: `npm run dev` in `augur-web-visualizer`.
3.  Open `http://localhost:5173`.
4.  Select "Simulate" and watch the AI dream!

**Mode B: Autonomous Agent**
1.  Start Backend.
2.  Run Agent: `npm start` in `augur-ci-agent`.
3.  The agent will launch `buggy_test.py` and debug it automatically.

### 🖱️ Right-Click Debugging (Windows)

Augur integrates directly into your Windows workflow. You can debug any file or folder with a single click.

**Installation:**
1.  Right-click `install_windows_menu.bat` and select **"Run as Administrator"**.
2.  That's it!

**Usage:**
-   **Single File**: Right-click a `.py` file -> Select **"Augur: Debug in Live Panel"**. Augur will launch and attach to that specific script.
-   **Folder (Workspace)**: Right-click a folder -> Select **"Augur: Debug in Live Panel"**. Augur will open that folder as the workspace context.

---

<a name="-中文-chinese"></a>
## 🇨🇳 中文 (Chinese)

### 📖 简介

**Augur** 代表了 AI 辅助编程的范式转变。它超越了静态代码分析，迈向了 **运行时智能 (Runtime Intelligence)**。

传统的 AI 编程助手（如 Copilot）对代码的执行过程是“盲目”的。它们只能根据文本猜测可能发生的情况。而 Augur 直接连接到 **调试适配器协议 (DAP)**，这使得它能够：
1.  **观察**：实时监控内存、堆栈帧和变量状态。
2.  **思考**：利用先进的大语言模型 (LLM) 分析运行时状态。
3.  **行动**：自主地单步执行代码、检查变量并提出修复建议。

它不仅仅是一个聊天机器人，它是你调试器中的 **“攻壳机动队” (Ghost in the Shell)**。

### ✨ 核心特性

-   **🧠 自主调试循环**：实现了完整的“观察-思考-行动”循环。它能自主单步调试、分析变量，无需人工干预即可决定下一步操作。
-   **🔌 通用模型支持 (全新)**：内置支持 **Gemini Pro** 和 **Claude 3.5 Sonnet**。此外，新增 **通用 AI 网关**，只需修改配置文件，即可支持 **DeepSeek**、**Qwen (通义千问)**、**Llama 3** 或任何兼容 OpenAI 接口的模型。
-   **🎥 Web 可视化器**：基于 React 构建的精美仪表盘，用于可视化 AI 的思维过程。你可以看到 AI 决策时所依赖的“黄金上下文 (Golden Context)”，并回放整个调试会话。
-   **🛠️ VS Code 集成**：提供专用扩展，将 Augur 的能力直接带入你的 IDE。
-   **⚡ CI/CD 就绪**：包含一个无头模式的 `augur-ci-agent`，可以自动调试 CI 流水线中失败的测试用例。

### 🏗️ 架构设计

系统由三个解耦的微服务组成：

1.  **`augur-debugger-service` (大脑)**：Node.js 服务器，负责管理调试会话、连接 LLM 并暴露 REST API。
2.  **`augur-web-visualizer` (眼睛)**：基于 Vite+React 的前端，用于可视化调试过程。
3.  **`augur-vscode-extension` (双手)**：VS Code 扩展，连接 IDE 调试器与 Augur 服务。

### 🚀 快速开始

#### 环境要求
-   **Node.js** v18+
-   **Python** 3.8+ (用于运行目标脚本)

#### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/UPwith-me/Augur-Runtime-Debugging-Agent.git
    cd Augur-Runtime-Debugging-Agent
    ```

2.  **安装依赖**
    ```bash
    # 安装后端依赖
    cd augur-debugger-service
    npm install

    # 安装前端依赖
    cd ../augur-web-visualizer
    npm install
    ```

3.  **配置**
    在 `augur-debugger-service` 目录下创建 `.env` 文件：
    ```env
    # 选项 1: 使用 Google Gemini
    GEMINI_API_KEY=你的密钥
    
    # 选项 2: 使用自定义模型 (例如 DeepSeek)
    OPENAI_API_KEY=sk-你的密钥
    OPENAI_BASE_URL=https://api.deepseek.com
    ```

#### 使用方法

**模式 A: 仿真模拟 (Web UI)**
1.  启动后端：在 `augur-debugger-service` 中运行 `npm start`。
2.  启动前端：在 `augur-web-visualizer` 中运行 `npm run dev`。
3.  打开浏览器访问 `http://localhost:5173`。
4.  选择 "Simulate" (模拟)，观看 AI 如何通过“梦境”进行调试！

**模式 B: 自主智能体**
1.  启动后端。
2.  运行智能体：在 `augur-ci-agent` 中运行 `npm start`。
3.  智能体将自动启动 `buggy_test.py` 并开始自主调试。

#### 🖱️ 右键一键调试 (Windows)

Augur 可以直接集成到你的 Windows 工作流中。只需一次点击，即可调试任何文件或文件夹。

**安装方法：**
1.  右键点击 `install_windows_menu.bat`，选择 **“以管理员身份运行”**。
2.  安装完成！

**使用方法：**
-   **单文件调试**：右键点击任意 `.py` 文件 -> 选择 **"Augur: Debug in Live Panel"**。Augur 将启动并直接挂载到该脚本。
-   **文件夹 (工作区) 调试**：右键点击任意文件夹 -> 选择 **"Augur: Debug in Live Panel"**。Augur 将以该文件夹作为工作区上下文启动。

---

<div align="center">

**Augur** is an open-source project. Contributions are welcome!
**Augur** 是一个开源项目，欢迎贡献代码！

[Report Bug](https://github.com/your-username/augur/issues) • [Request Feature](https://github.com/your-username/augur/issues)

</div>
