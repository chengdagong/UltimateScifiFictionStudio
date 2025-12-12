
import { FrameworkDefinition, EntityCategory } from '../types';

export const FRAMEWORKS: Record<string, FrameworkDefinition> = {
  'general': {
    id: 'general',
    name: 'framework_general_name',
    description: 'framework_general_desc',
    layers: [
      {
        id: 'layer_person',
        title: 'layer_person_title',
        description: 'layer_person_desc',
        colorClass: 'bg-blue-50 border-blue-500 text-blue-700',
        allowedCategories: [EntityCategory.PERSON]
      },
      {
        id: 'layer_org',
        title: 'layer_org_title',
        description: 'layer_org_desc',
        colorClass: 'bg-indigo-50 border-indigo-500 text-indigo-700',
        allowedCategories: [EntityCategory.ORGANIZATION]
      },
      {
        id: 'layer_place',
        title: 'layer_place_title',
        description: 'layer_place_desc',
        colorClass: 'bg-emerald-50 border-emerald-500 text-emerald-700',
        allowedCategories: [EntityCategory.PLACE]
      },
      {
        id: 'layer_event',
        title: 'layer_event_title',
        description: 'layer_event_desc',
        colorClass: 'bg-rose-50 border-rose-500 text-rose-700',
        isTimeDimension: true,
        allowedCategories: [EntityCategory.EVENT]
      },
      {
        id: 'layer_tech',
        title: 'layer_tech_title',
        description: 'layer_tech_desc',
        colorClass: 'bg-cyan-50 border-cyan-500 text-cyan-700',
        allowedCategories: [EntityCategory.TECHNOLOGY]
      },
      {
        id: 'layer_resource',
        title: 'layer_resource_title',
        description: 'layer_resource_desc',
        colorClass: 'bg-amber-50 border-amber-500 text-amber-700',
        allowedCategories: [EntityCategory.RESOURCE]
      },
      {
        id: 'layer_belief',
        title: 'layer_belief_title',
        description: 'layer_belief_desc',
        colorClass: 'bg-violet-50 border-violet-500 text-violet-700',
        allowedCategories: [EntityCategory.BELIEF]
      },
      {
        id: 'layer_unknown',
        title: 'layer_unknown_title',
        description: 'layer_unknown_desc',
        colorClass: 'bg-slate-100 border-slate-400 text-slate-700',
        allowedCategories: [EntityCategory.UNKNOWN]
      }
    ]
  }
};

export const INITIAL_CONTEXTS = {
  'general': "framework_general_context"
};
