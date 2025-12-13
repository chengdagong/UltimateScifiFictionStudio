# Zustand 迁移方案：消除 Prop Drilling 与状态管理重构

## 1. 概述

目前 `MainLayout.tsx` 承担了过多的状态管理和数据传递职责，导致严重的 Prop Drilling 问题。本方案旨在通过 Zustand 状态管理库和 Facade Hook 模式，将状态逻辑从视图层剥离，实现组件的独立性和可维护性。

## 2. 核心架构设计

### 2.1 迁移策略：Facade Hook + Global Stores

我们采用 **"Facade Hook (外观 Hook)"** 模式。
`useWorldModel` 将继续存在，但它不再是被动接收参数的工具函数，而是主动获取依赖的"智能 Hook"。

*   **Before:** `MainLayout` 获取 `apiSettings`, `taskManager` -> 传递给 `useWorldModel` -> 返回 `model` -> 传递给 `ParticipantsView`。
*   **After:** `ParticipantsView` 直接调用 `useWorldModel()`。`useWorldModel` 内部自动获取 `useApiSettings` 和 `useTaskStore`。

### 2.2 新增/增强 Stores

我们需要引入两个新的 Store 来接管 `MainLayout` 的状态：

1.  **`appStore` (UI & Project Context)**
    *   管理全局 UI 状态：`activeTab`, `isMobileMenuOpen`, `toast`。
    *   管理项目上下文：`currentWorldId`, `worldName`。
    *   替代 `MainLayout` 中的 `useState`。

2.  **`taskStore` (AI Task Management)**
    *   替代 `useAiTaskManager` Hook。
    *   全局管理 AI 任务队列。
    *   监听 `appStore.currentWorldId` 变化以自动切换任务列表（持久化）。

## 3. 详细迁移步骤

### 第一阶段：基础设施建设 (Stores)

#### 1. 创建 `stores/appStore.ts`
```typescript
interface AppState {
  // UI State
  activeTab: string;
  isMobileMenuOpen: boolean;
  toast: ToastMessage | null;
  
  // Project Context
  currentWorldId: string | undefined;
  worldName: string;
  
  // Actions
  setActiveTab: (tab: string) => void;
  toggleMobileMenu: () => void;
  showToast: (msg: string, type: ToastType) => void;
  setCurrentWorldId: (id: string | undefined) => void;
  setWorldName: (name: string) => void;
}
```

#### 2. 创建 `stores/taskStore.ts`
将 `hooks/useAiTaskManager.ts` 转换为 Zustand Store。
*   需要处理 `localStorage` 的读写逻辑。
*   提供 `addTask`, `updateTask` 等全局 Action。

### 第二阶段：Hook 重构 (Facade Layer)

#### 3. 重构 `hooks/useWorldModel.ts`
移除参数依赖，使其自包含。

```typescript
// Before
export const useWorldModel = (apiSettings, checkApiKey, taskManager) => { ... }

// After
export const useWorldModel = () => {
  const store = useWorldStore();
  const { apiSettings, checkApiKey } = useApiSettings(); // 直接调用 Hook
  const taskStore = useTaskStore(); // 直接调用 Store
  
  // 包装 Action，自动注入依赖
  const handleGenerateLayer = async (layerId: string) => {
    await store.generateLayer(layerId, apiSettings, checkApiKey, taskStore);
  };
  
  return { ...store, handleGenerateLayer, ... };
};
```

### 第三阶段：组件重构 (View Layer)

#### 4. 重构 `layouts/MainLayout.tsx`
*   移除所有 `useState` (除了极少数仅用于 Layout 内部的)。
*   移除传递给子组件的 Props。
*   使用 `useAppStore` 获取 `activeTab` 来决定渲染哪个视图。

#### 5. 重构子组件
所有子组件不再通过 Props 接收数据，而是直接调用 Hooks。

| 组件 | 移除 Props | 新增 Hooks 调用 |
| :--- | :--- | :--- |
| **Sidebar** | `activeTab`, `onSync`, `isSyncing` 等 | `useAppStore`, `useWorldModel` |
| **Header** | `worldName`, `entitiesCount`, `onSync` 等 | `useAppStore`, `useWorldModel` |
| **ParticipantsView** | `model`, `framework`, `onAddEntity`, `apiSettings` 等 | `useWorldModel`, `useApiSettings` |
| **TimelineView** | `model`, `storySegments` | `useWorldModel` |
| **TechTreeView** | `technologies`, `onAddNode` | `useWorldModel` |
| **ChronicleView** | `chronicleText`, `onSync` | `useWorldModel` |
| **StoryAgentView** | `agents`, `workflow`, `model` | `useStoryEngine`, `useWorldModel` |

### 第四阶段：持久化逻辑适配

#### 6. 更新 `hooks/usePersistence.ts`
*   不再从 Props 接收 `currentWorldId`，而是从 `useAppStore` 获取。
*   内部直接调用 `useWorldModel` 和 `useStoryEngine` 获取数据进行保存。

## 4. 执行顺序与检查点

1.  **Setup Stores**: 创建 `appStore` 和 `taskStore`。
    *   *Check:* 在控制台测试 Store 状态更新是否正常。
2.  **Refactor useWorldModel**: 修改 Hook 签名。
    *   *Check:* 此时应用会报错，因为 `MainLayout` 还在传参。
3.  **Refactor MainLayout**: 移除 Props 传递，连接 `appStore`。
    *   *Check:* 应用可以运行，但子组件可能缺少数据（如果它们还没改）。
4.  **Refactor Components (逐个击破)**:
    *   先改 `Sidebar` 和 `Header` (UI 框架)。
    *   再改 `ParticipantsView` (核心视图)。
    *   依次修改其他视图。
    *   *Check:* 每修改一个组件，验证其功能是否正常。

## 5. 回滚方案

由于涉及大量文件修改，建议：
1.  创建一个新的 Git 分支 `refactor/zustand-migration`。
2.  如果重构过程中发现 `useWorldModel` 的闭包陷阱导致状态不同步，可以暂时回退到 Prop Drilling 方式，或者检查 `useEffect` 依赖。
3.  保留 `MainLayout` 的原始代码备份（`MainLayout.backup.tsx`），以便快速参照原有逻辑。

## 6. 注意事项

*   **Circular Dependencies**: 小心 Hook 之间的循环依赖。`usePersistence` 依赖 `useWorldModel`，而 `useWorldModel` 不应依赖 `usePersistence`。
*   **Performance**: Zustand 默认是全量订阅，使用 Selector 优化渲染性能。例如：`const activeTab = useAppStore(state => state.activeTab)`。
*   **Initialization**: 确保 `useApiSettings` 在 `useWorldModel` 之前初始化（React Query 会处理，但要注意调用顺序）。
