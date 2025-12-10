import React, { useState } from 'react';
import { SocialEntity, EntityCategory, LayerDefinition } from '../types';
import { Plus, Trash2, Sparkles, Loader2, Pencil, Check, X, User, Building2, Cpu, Coins, Scale, MapPin, Calendar, HelpCircle } from 'lucide-react';

interface LayerCardProps {
  layerDef: LayerDefinition;
  entities: SocialEntity[]; // Pre-filtered entities for this layer
  onAddEntity: (name: string, desc: string, category: EntityCategory) => void;
  onUpdateEntity: (entityId: string, name: string, desc: string) => void;
  onRemoveEntity: (entityId: string) => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
}

const CategoryIcon: React.FC<{ category: EntityCategory, className?: string }> = ({ category, className = "w-4 h-4" }) => {
  const getIconData = () => {
    switch (category) {
      case EntityCategory.PERSON: return { Icon: User, title: "个人/人物" };
      case EntityCategory.ORGANIZATION: return { Icon: Building2, title: "组织/团体" };
      case EntityCategory.TECHNOLOGY: return { Icon: Cpu, title: "技术/工具" };
      case EntityCategory.RESOURCE: return { Icon: Coins, title: "资源" };
      case EntityCategory.BELIEF: return { Icon: Scale, title: "信仰/法律" };
      case EntityCategory.PLACE: return { Icon: MapPin, title: "地点" };
      case EntityCategory.EVENT: return { Icon: Calendar, title: "事件" };
      default: return { Icon: HelpCircle, title: "未知" };
    }
  };

  const { Icon, title } = getIconData();

  return (
    <span title={title} className="inline-flex">
      <Icon className={className} />
    </span>
  );
};

const CategoryLabel: React.FC<{ category: EntityCategory }> = ({ category }) => {
  const labels: Record<string, string> = {
    [EntityCategory.PERSON]: "人物",
    [EntityCategory.ORGANIZATION]: "组织",
    [EntityCategory.TECHNOLOGY]: "技术",
    [EntityCategory.RESOURCE]: "资源",
    [EntityCategory.BELIEF]: "观念/法律",
    [EntityCategory.PLACE]: "地点",
    [EntityCategory.EVENT]: "事件",
    [EntityCategory.UNKNOWN]: "未知"
  };
  return <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">{labels[category] || category}</span>;
}

const EntityRow: React.FC<{
  entity: SocialEntity;
  onUpdate: (id: string, name: string, desc: string) => void;
  onRemove: (id: string) => void;
}> = ({ entity, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entity.name);
  const [editDesc, setEditDesc] = useState(entity.description);

  const handleSave = () => {
    if (editName.trim() && editDesc.trim()) {
      onUpdate(entity.id, editName, editDesc);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-indigo-200 rounded-lg p-3 shadow-sm ring-2 ring-indigo-100 z-10 relative">
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full mb-2 px-2 py-1 border rounded text-sm font-bold"
          autoFocus
        />
        <textarea
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          className="w-full mb-2 px-2 py-1 border rounded text-xs resize-none"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsEditing(false)} className="p-1 text-gray-400"><X className="w-4 h-4"/></button>
          <button onClick={handleSave} className="p-1 bg-indigo-600 text-white rounded"><Check className="w-4 h-4"/></button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-400 transition-colors h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 pr-6">
           <div className="p-1 bg-slate-100 rounded text-slate-500">
             <CategoryIcon category={entity.category} />
           </div>
           <h4 className="font-semibold text-gray-800 text-sm leading-tight">{entity.name}</h4>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 bg-white pl-2">
          <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-indigo-500 p-0.5"><Pencil className="w-3.5 h-3.5"/></button>
          <button onClick={() => onRemove(entity.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-1 leading-relaxed flex-grow whitespace-pre-wrap">{entity.description}</p>
      <div className="mt-2 pt-2 border-t border-gray-50 flex justify-end">
        <CategoryLabel category={entity.category} />
      </div>
    </div>
  );
};

const LayerCard: React.FC<LayerCardProps> = ({ 
  layerDef, 
  entities,
  onAddEntity, 
  onUpdateEntity,
  onRemoveEntity, 
  onGenerate,
  isGenerating
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<EntityCategory>(layerDef.allowedCategories[0]);

  const handleAdd = () => {
    if (newName.trim() && newDesc.trim()) {
      onAddEntity(newName, newDesc, newCategory);
      setNewName('');
      setNewDesc('');
      setIsAdding(false);
    }
  };

  const extractColorName = (str: string) => {
    const match = str.match(/text-(\w+)-700/);
    return match ? match[1] : 'indigo';
  };
  const baseColor = extractColorName(layerDef.colorClass);
  const btnClasses = `bg-${baseColor}-600 hover:bg-${baseColor}-700`;
  const bgClasses = `bg-${baseColor}-50`;
  const textClasses = `text-${baseColor}-700`;
  const borderClasses = `border-${baseColor}-500`; 

  return (
    <div className={`rounded-xl border-l-4 ${borderClasses} bg-white shadow-sm mb-6 overflow-hidden transition-all duration-300 hover:shadow-md`}>
      <div className={`px-6 py-4 flex justify-between items-center border-b border-gray-100 ${bgClasses}`}>
        <div>
          <h3 className={`text-lg font-bold ${textClasses}`}>{layerDef.title}</h3>
          <p className="text-xs text-gray-500 mt-1">{layerDef.description}</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={onGenerate}
            disabled={isGenerating}
            className={`p-2 rounded-full bg-white text-gray-600 hover:text-${baseColor}-600 transition-colors shadow-sm disabled:opacity-50`}
            title="AI 自动生成"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`p-2 rounded-full ${btnClasses} text-white transition-colors shadow-sm`}
            title="手动添加"
          >
            <Plus className={`w-5 h-5 transition-transform duration-200 ${isAdding ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6">
        {isAdding && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder={layerDef.isTimeDimension ? "事件名称" : "实体名称"}
                className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select 
                className="px-2 py-2 border rounded text-sm bg-white"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as EntityCategory)}
              >
                {layerDef.allowedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="描述..."
              className="w-full mb-2 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsAdding(false)} className="text-sm text-gray-500 px-3 py-1">取消</button>
              <button onClick={handleAdd} className="text-sm bg-gray-800 text-white px-3 py-1 rounded hover:bg-black">保存</button>
            </div>
          </div>
        )}

        {entities.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm italic">
            本层级暂无符合类别的实体。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map((entity) => (
              <EntityRow
                key={entity.id}
                entity={entity}
                onUpdate={onUpdateEntity}
                onRemove={onRemoveEntity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayerCard;