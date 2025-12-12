# EcoNarrative Studio 架构与功能分析报告

## 1. 项目概述
**EcoNarrative Studio** 是一个基于社会科学理论（如布伦纳生态系统理论）的辅助写作与世界构建工具。它不仅仅是一个简单的文本生成器，而是一个深度结构化的世界模拟器。用户定义社会系统的各个层级，AI 则负责演绎这些层级之间的互动，从而生成具有逻辑深度和历史厚重感的故事大纲与编年史。

## 2. 技术架构

### 2.1 前端 (Frontend)
*   **框架**: React 18 + Vite + TypeScript
*   **路由**: React Router v6 (`react-router-dom`)
*   **状态管理**:
    *   **Context API**: `AuthContext` 用于全局用户认证状态。
    *   **Custom Hooks**: `useWorldModel` (世界数据), `useStoryEngine` (故事生成流程), `usePersistence` (数据存取)。
*   **UI 组件库**: 自定义组件 + Lucide React (图标)。
*   **编辑器**: Milkdown (基于 ProseMirror 的 Markdown 编辑器)。
*   **可视化**: D3.js (可能用于河流图/关系图)。
*   **国际化**: i18next (支持中/英切换)。

### 2.2 后端 (Backend)
*   **类型**: 轻量级 Node.js HTTP Server (`server.js`)。
*   **功能**:
    *   **认证**: 基于 JSON 文件的简单用户注册/登录。
    *   **数据存储**: 将用户项目数据存储为本地 JSON 文件 (`data/users/{username}/projects/`)。
    *   **Git 集成**: 提供本地 Git 操作接口 (init, status, commit, log)。
*   **API 风格**: RESTful API。

### 2.3 AI 集成 (AI Integration)
*   **服务层**: `services/geminiService.ts`
*   **Provider**: Google Gemini API (主要) / OpenAI (备选/通过 OpenRouter)。
*   **核心机制**:
    *   **结构化生成**: 大量使用 JSON Mode，要求 AI 输出严格的 JSON 格式以构建实体和关系。
    *   **Prompt Engineering**: 针对不同任务（世界生成、史书撰写、角色设计）定制了详细的 Prompt 模板，注入了丰富的上下文（Context）。
    *   **Agent System**: 定义了不同角色的 Agent（如 Screenwriter, Historian, Critic），通过工作流协同工作。

## 3. 核心功能模块

### 3.1 世界模型 (World Model)
*   **数据结构**: `WorldModel` (Flat Model)
    *   `entities`: 社会实体（人、组织、地点等）。
    *   `relationships`: 实体间的动态关系。
    *   `entityStates`: 实体在不同时间点的状态快照。
    *   `technologies`: 科技树节点。
*   **逻辑封装**: `hooks/useWorldModel.ts`
    *   负责数据的 CRUD 操作。
    *   提供 `handleGlobalSync` 方法，调用 AI 生成世界编年史。
    *   提供 `handleGenerateLayer` 方法，调用 AI 填充特定层级的实体。

### 3.2 故事引擎 (Story Engine)
*   **逻辑封装**: `hooks/useStoryEngine.ts` & `components/StoryAgentView.tsx`
*   **工作流 (Workflow)**:
    *   由一系列步骤 (`WorkflowStep`) 组成，每个步骤指定一个 Agent 执行。
    *   支持 **Reviewer Loop**：生成的内内容可以被另一个 Agent（审查员）审核，如果不通过则自动重写。
*   **交互**: 提供 Copilot 界面，允许用户干预每一步的生成，修改 Prompt 或直接编辑结果。

### 3.3 视图系统 (View System)
*   **ParticipantsView**: 实体管理核心，支持列表和图谱视图，按社会层级分组展示。
*   **TimelineView**: 展示时间线和历史事件（河流图）。
*   **ChronicleView**: 史书阅读与编辑（Markdown）。
*   **TechTreeView**: 科技树可视化与编辑。
*   **StoryAgentView**: 故事生成控制台。

## 4. 数据流向

1.  **初始化**: 用户登录 -> 加载 `data/users/.../project.json` -> `usePersistence` 恢复状态 -> `useWorldModel` 初始化。
2.  **构建世界**:
    *   用户选择框架（如布伦纳）。
    *   用户/AI 创建实体 (`entities`)。
    *   AI 基于实体生成关系 (`relationships`)。
3.  **生成叙事**:
    *   `StoryAgentView` 读取当前世界状态 (`model`) 和上下文 (`context`)。
    *   Agent 执行任务，生成文本 (`content`)。
    *   文本被保存为 `StoryArtifact` 或追加到 `StorySegment`。
4.  **同步/更新**:
    *   `handleGlobalSync` 收集所有实体和片段，生成新的 `chronicleText`。
5.  **持久化**:
    *   `usePersistence` 监听状态变化，定期或手动调用后端 API 保存 JSON 文件。

## 5. 关键文件索引

*   `App.tsx`: 应用入口，路由配置，全局 Layout。
*   `types.ts`: 核心 TypeScript 类型定义。
*   `server.js`: 后端服务器逻辑。
*   `hooks/useWorldModel.ts`: 世界数据核心逻辑。
*   `services/geminiService.ts`: AI 交互核心逻辑。
*   `components/StoryAgentView.tsx`: 故事引擎 UI 及执行逻辑。
*   `components/ParticipantsView.tsx`: 实体管理 UI。
