# 自动保存逻辑说明

## 概述

项目使用 React 的 `useEffect` hook 和防抖机制实现自动保存功能，确保用户数据在编辑过程中自动保存到新的项目目录结构。

## 触发条件

自动保存会在以下任意数据变化时触发（来自 [`hooks/usePersistence.ts:141-152`](../hooks/usePersistence.ts#L141-L152)）：

- `worldName` - 项目名称
- `worldModel.worldContext` - 世界背景
- `worldModel.model` - 实体、关系、状态、科技数据
- `worldModel.storySegments` - 故事片段
- `worldModel.currentTimeSetting` - 当前时间设定
- `worldModel.chronicleText` - 编年史文本
- `storyEngine.agents` - AI 代理配置
- `storyEngine.workflow` - 工作流步骤
- `storyEngine.artifacts` - 产物数据

## 防抖机制

- **延迟时间**: 2 秒
- **工作原理**: 数据变化后启动 2 秒定时器，如果在 2 秒内数据再次变化，取消旧定时器并重新计时
- **优势**: 用户连续编辑时不会频繁触发保存，只在停止编辑 2 秒后保存一次

## 跳过条件

以下情况不会触发自动保存：

1. `worldName` 为空
2. `worldName === "新世界"`（未命名的新项目）
3. 正在进行手动保存（`saveMutation.isPending`）
4. 正在进行自动保存（`autoSaveMutation.isPending`）

## 数据流

```
用户编辑数据
  ↓
触发 useEffect (依赖数组中的数据变化)
  ↓
检查跳过条件
  ↓
启动 2 秒定时器
  ↓
2 秒后检查互斥锁
  ↓
构造 WorldData 对象 (constructWorldData)
  ↓
调用 autoSaveMutation.mutate()
  ↓
调用 saveWorld() [LocalStorageService.ts]
  ↓
判断是否为新项目
  ├─ 无 ID → createProject(worldData)
  │           ↓
  │         POST /api/projects (完整数据)
  │           ↓
  │         创建项目目录结构
  │
  └─ 有 ID → saveProject(worldData)
              ↓
            PUT /api/projects/:id
              ↓
            更新项目文件
```

## API 端点

### 创建新项目
- **端点**: `POST /api/projects`
- **请求体**: 完整的 `WorldData` 对象
- **响应**: `{ success: true, project: { id, name, ... } }`
- **后续**: 设置 `currentWorldId`

### 更新现有项目
- **端点**: `PUT /api/projects/:id`
- **请求体**: 完整的 `WorldData` 对象
- **响应**: `{ success: true }`
- **后续**: 返回项目 ID

## 保存的数据结构

保存到新的项目目录结构（参见 [`docs/PROJECT_STRUCTURE_DESIGN.md`](./PROJECT_STRUCTURE_DESIGN.md)）：

```
data/users/{username}/projects/{project-slug}/
├── project.json          # 项目元数据
├── context.md            # 世界背景
├── chronicle.md          # 编年史
├── world/                # 世界模型（分文件）
│   ├── entities.json
│   ├── relationships.json
│   ├── entity-states.json
│   ├── technologies.json
│   └── tech-dependencies.json
├── stories/              # 故事内容（分文件）
│   ├── _index.json
│   └── segments/{id}.md
├── artifacts/            # 产物（分文件）
│   ├── _index.json
│   └── items/{id}.md
└── agents/               # AI 代理配置
    ├── agents.json
    └── workflow.json
```

## UI 反馈

- **`isAutoSaving`**: 布尔值，表示是否正在自动保存
- **`lastAutoSaveTime`**: 时间戳，最后一次自动保存的时间
- 可用于在状态栏显示"正在保存..."或"已保存"

## 与手动保存的区别

| 特性 | 自动保存 | 手动保存 |
|------|---------|---------|
| 触发方式 | 数据变化 + 2 秒延迟 | 用户点击保存按钮 |
| UI 提示 | 无弹窗，状态栏显示 | 弹窗提示"保存成功" |
| Query 缓存失效 | 不主动失效 | 失效并刷新项目列表 |
| 互斥锁 | 检查手动保存状态 | 检查自动保存状态 |

## 错误处理

- 自动保存失败时只在控制台输出警告，不打断用户操作
- 不会显示错误提示给用户
- 用户可以通过手动保存来确保数据已保存

## 向后兼容

- 通过 `saveWorld()` 别名函数保持与旧代码的兼容性
- 自动检测是否为新项目（无 ID）并调用相应的 API
- 旧的单文件格式项目仍然可以通过 `/api/worlds` API 访问（向后兼容）

## 性能考虑

1. **防抖减少请求**: 连续编辑时不会每次变化都保存
2. **分文件存储**: 版本控制友好，只有修改的文件会产生 diff
3. **互斥锁**: 避免同时进行多个保存操作
4. **异步保存**: 不阻塞 UI 操作

## 相关文件

- [`hooks/usePersistence.ts`](../hooks/usePersistence.ts) - 自动保存逻辑实现
- [`services/LocalStorageService.ts`](../services/LocalStorageService.ts) - API 调用封装
- [`server.js`](../server.js) - 后端 API 实现
- [`docs/PROJECT_STRUCTURE_DESIGN.md`](./PROJECT_STRUCTURE_DESIGN.md) - 项目目录结构设计
