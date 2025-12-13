# EcoNarrative Studio 架构改进建议

基于对现有代码库的深入分析，以下是针对 EcoNarrative Studio 的架构改进建议。这些建议旨在提高系统的可维护性、扩展性、性能和安全性。

## 1. 现状评估

*   **优点**:
    *   功能原型完整，核心业务逻辑（世界构建、故事生成）已跑通。
    *   前端组件化程度较高，UI 交互逻辑清晰。
    *   AI 集成深入，Prompt 设计较为精细。
*   **痛点**:
    *   **后端薄弱**: `server.js` 单文件承载所有逻辑，缺乏分层，难以扩展。
    *   **状态管理复杂**: 依赖 Context 和大型 Custom Hooks，导致组件重渲染频繁，逻辑耦合度高。
    *   **AI 调用不安全**: 前端直接调用 AI API，API Key 暴露风险高（虽然目前有简单的设置面板，但最佳实践是后端代理）。
    *   **Prompt 硬编码**: Prompt 散落在代码中，难以管理和版本控制。

## 2. 详细改进建议

### 2.1 后端重构 (Backend Refactoring)

建议将后端从简单的 HTTP Server 迁移到成熟的 Node.js 框架。

*   **框架选择**: **Express.js** (轻量灵活) 或 **NestJS** (企业级，强规范)。考虑到当前项目规模，推荐先迁移到 **Express + TypeScript**。
*   **分层架构**:
    *   **Controllers**: 处理 HTTP 请求和响应。
    *   **Services**: 包含核心业务逻辑（如 Git 操作、文件读写）。
    *   **Repositories/DAO**: 负责数据存取。
*   **安全性**:
    *   使用 **JWT (JSON Web Tokens)** 替代内存 Session，实现无状态认证。
    *   引入 **Zod** 或 **Joi** 进行请求数据验证。
    *   实现 **Rate Limiting** 防止 API 滥用。

### 2.2 前端重构 (Frontend Refactoring)

*   **状态管理升级**:
    *   引入 **Zustand** 或 **Redux Toolkit**。
    *   将 `useWorldModel` 和 `useStoryEngine` 中的状态迁移到全局 Store 中，减少 Props Drilling。
    *   利用 Selector 机制优化渲染性能。
*   **组件拆分**:
    *   `App.tsx` 目前承担了太多职责（路由、布局、全局状态）。建议拆分为：
        *   `layouts/MainLayout.tsx`: 侧边栏和顶部导航。
        *   `routes/AppRoutes.tsx`: 路由配置。
        *   `providers/AppProviders.tsx`: 全局 Context 包裹。
*   **性能优化**:
    *   对于 `ParticipantsView` 中的实体列表，引入 **Virtualization** (如 `react-window`) 以支持大量实体渲染。
    *   使用 `React.memo` 和 `useCallback` 优化关键组件的重渲染。

### 2.3 AI 服务优化 (AI Service Optimization)

*   **后端代理 (Backend Proxy)**:
    *   **强烈建议**将 AI API 调用移至后端。前端只发送业务请求（如“生成角色”），后端负责组装 Prompt 并调用 Gemini/OpenAI。
    *   这样可以隐藏 API Key，并方便在后端实现缓存、计费和审计。
*   **Prompt 管理**:
    *   将 Prompt 提取为独立的模板文件（如 `.txt` 或 `.hbs`），存放在 `prompts/` 目录下。
    *   构建一个 `PromptService` 来加载和填充这些模板。
*   **流式响应 (Streaming)**:
    *   对于长文本生成（如史书、章节），支持 **Server-Sent Events (SSE)** 或 WebSocket，实现打字机效果，提升用户体验。

### 2.4 数据存储 (Data Persistence)

*   **核心策略**: 坚持使用 **JSON 文件系统** 作为核心存储，以完美支持 **Git 版本控制**。
*   **结构优化 (Structured JSON)**:
    *   放弃单一大文件存储，改为**文件夹结构**。例如：
        *   `MyWorld/world.json` (元数据)
        *   `MyWorld/characters/*.json` (角色数据)
        *   `MyWorld/chapters/*.json` (章节数据)
    *   **优势**:
        *   **Git 友好**: 细粒度的文件变更记录，Diff 清晰，冲突概率低。
        *   **人类可读**: 用户可以直接在文件资源管理器中查看和编辑数据。
        *   **性能**: 仅需加载当前编辑的章节或角色，无需一次性加载整个世界数据。
*   **索引与缓存**:
    *   在内存中维护一个轻量级索引（如文件名到 ID 的映射），以加速查找，避免频繁扫描磁盘。

## 3. 实施路线图 (Roadmap)

建议分三个阶段实施重构，以避免一次性改动过大导致系统不稳定。

### 第一阶段：后端基础重构 (Backend Foundation) - [已完成]
1.  [x] 初始化 Express + TypeScript 项目结构。
2.  [x] 迁移 `server.js` 中的认证和文件操作逻辑到新的 Controller/Service 结构。
3.  [x] 前端适配新的 API 接口。

### 第二阶段：状态管理与 AI 代理 (State & AI Proxy) - [进行中]
1.  [ ] 引入 Zustand，逐步替换 `useWorldModel` (部分完成，Store 已创建)。
2.  [x] 在后端创建 AI Service，将前端的 `geminiService.ts` 逻辑迁移至后端。
3.  [x] 实现 Prompt 模板化。

### 第三阶段：性能与体验 (Performance & UX)
1.  [x] 实现结构化 JSON 存储与 Git 深度集成 (已在后端重构中实现)。
2.  [ ] 实现 AI 生成的流式响应。
3.  [ ] 前端列表虚拟化优化。
