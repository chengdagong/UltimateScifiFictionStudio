
import { FrameworkDefinition, EntityCategory } from '../types';

export const FRAMEWORKS: Record<string, FrameworkDefinition> = {
  'general': {
    id: 'general',
    name: '通用世界模型',
    description: '标准的故事世界构建模型。包含人物、组织、地点、事件等基础元素。',
    layers: [
      {
        id: 'layer_person',
        title: '人物 (People)',
        description: '具体的个人、关键角色。',
        colorClass: 'bg-blue-50 border-blue-500 text-blue-700',
        allowedCategories: [EntityCategory.PERSON]
      },
      {
        id: 'layer_org',
        title: '组织 (Organizations)',
        description: '团体、公司、政党、家庭。',
        colorClass: 'bg-indigo-50 border-indigo-500 text-indigo-700',
        allowedCategories: [EntityCategory.ORGANIZATION]
      },
      {
        id: 'layer_place',
        title: '地点 (Places)',
        description: '地理位置、环境空间。',
        colorClass: 'bg-emerald-50 border-emerald-500 text-emerald-700',
        allowedCategories: [EntityCategory.PLACE]
      },
      {
        id: 'layer_event',
        title: '事件 (Events)',
        description: '发生的事情、历史节点。',
        colorClass: 'bg-rose-50 border-rose-500 text-rose-700',
        isTimeDimension: true,
        allowedCategories: [EntityCategory.EVENT]
      },
      {
        id: 'layer_tech',
        title: '技术 (Technology)',
        description: '工具、基础设施、软件。',
        colorClass: 'bg-cyan-50 border-cyan-500 text-cyan-700',
        allowedCategories: [EntityCategory.TECHNOLOGY]
      },
      {
        id: 'layer_resource',
        title: '资源 (Resources)',
        description: '资金、自然资源、物资。',
        colorClass: 'bg-amber-50 border-amber-500 text-amber-700',
        allowedCategories: [EntityCategory.RESOURCE]
      },
      {
        id: 'layer_belief',
        title: '观念/法律 (Beliefs & Laws)',
        description: '意识形态、宗教、法律法规。',
        colorClass: 'bg-violet-50 border-violet-500 text-violet-700',
        allowedCategories: [EntityCategory.BELIEF]
      },
      {
        id: 'layer_unknown',
        title: '未分类 (Uncategorized)',
        description: '其他未归类的实体。',
        colorClass: 'bg-slate-100 border-slate-400 text-slate-700',
        allowedCategories: [EntityCategory.UNKNOWN]
      }
    ]
  }
};

export const INITIAL_CONTEXTS = {
  'general': "一个充满无限可能的世界。"
};
