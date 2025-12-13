
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SocialEntity, EntityCategory, LayerDefinition, FrameworkDefinition, EntityRelationship, EntityState } from '../types';
import { useWorldModel } from '../hooks/useWorldModel';
import {
  Search, Plus, Sparkles, Trash2, Save,
  User, Building2, Cpu, Coins, Scale, MapPin, Calendar, HelpCircle,
  ChevronRight, ChevronDown, Loader2, CheckCircle2, Cloud, ArrowLeft,
  Network, ArrowRight, X, Clock, History, Globe2, CalendarRange,
  List, GitGraph, Layers, Eye, Filter, MoreHorizontal
} from 'lucide-react';
import GraphView from './GraphView';

interface ParticipantsViewProps {
  isMinimalUI?: boolean;
}

const CategoryIcon: React.FC<{ category: EntityCategory, className?: string }> = ({ category, className = "w-4 h-4" }) => {
  switch (category) {
    case EntityCategory.PERSON: return <User className={className} />;
    case EntityCategory.ORGANIZATION: return <Building2 className={className} />;
    case EntityCategory.TECHNOLOGY: return <Cpu className={className} />;
    case EntityCategory.RESOURCE: return <Coins className={className} />;
    case EntityCategory.BELIEF: return <Scale className={className} />;
    case EntityCategory.PLACE: return <MapPin className={className} />;
    case EntityCategory.EVENT: return <Calendar className={className} />;
    default: return <HelpCircle className={className} />;
  }
};

const getCategoryLabel = (category: EntityCategory): string => {
  switch (category) {
    case EntityCategory.PERSON: return "category_person";
    case EntityCategory.ORGANIZATION: return "category_org";
    case EntityCategory.TECHNOLOGY: return "category_tech";
    case EntityCategory.RESOURCE: return "category_resource";
    case EntityCategory.BELIEF: return "category_belief";
    case EntityCategory.PLACE: return "category_place";
    case EntityCategory.EVENT: return "category_event";
    default: return "category_unknown";
  }
};

// Helper: Check if time point is within range (Simple String Comparison)
const isActiveInTime = (time: string | null, start?: string, end?: string): boolean => {
  if (!time) return true; // Global view shows everything
  if (!start && !end) return true; // Always active
  if (start && time < start) return false;
  if (end && time > end) return false;
  return true;
};

const ParticipantsView: React.FC<ParticipantsViewProps> = ({
  isMinimalUI = false
}) => {
  const {
    model,
    currentFramework: framework,
    handleAddEntity: onAddEntity,
    handleUpdateEntity: onUpdateEntity,
    handleRemoveEntity: onRemoveEntity,
    handleAddEntityState: onAddEntityState,
    handleUpdateEntityState: onUpdateEntityState,
    handleRemoveEntityState: onRemoveEntityState,
    handleAddRelationship: onAddRelationship,
    handleRemoveRelationship: onRemoveRelationship,
    handleGenerateLayer: onGenerateLayer,
    loadingLayer: loadingLayerId
  } = useWorldModel();

  const { t } = useTranslation();
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<EntityCategory | 'all'>('all');
  const [viewTime, setViewTime] = useState<string | null>(null); // null means Global View
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');

  // Resizable Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      // Calculate offset based on isMinimalUI
      // Note: These values (80 and 256) correspond to w-20 and w-64 in App.tsx
      const navOffset = isMinimalUI ? 80 : 256;

      // Calculate new width
      let newWidth = e.clientX - navOffset;

      // Apply constraints
      setSidebarWidth(Math.max(260, Math.min(newWidth, 800)));
    }
  }, [isResizing, isMinimalUI]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing, resize, stopResizing]);


  // Set default active category when framework changes
  useEffect(() => {
    setActiveCategory('all');
  }, [framework.id]);

  // Extract available time points for the dropdown
  const availableTimePoints = useMemo(() => {
    const points = new Set<string>();
    model.entityStates.forEach(s => points.add(s.timestamp));
    model.relationships.forEach(r => { if (r.timestamp) points.add(r.timestamp); });
    return Array.from(points).sort();
  }, [model.entityStates, model.relationships]);

  const selectedEntity = useMemo(() =>
    model.entities.find(e => e.id === selectedEntityId),
    [model.entities, selectedEntityId]);

  // Derive unique categories from current framework layers
  const availableCategories = useMemo(() => {
    const cats = new Set<EntityCategory>();
    framework.layers.forEach(l => l.allowedCategories.forEach(c => cats.add(c)));
    return Array.from(cats);
  }, [framework]);

  // Grouped Entities Logic: Group entities by Framework Layer
  const groupedEntities = useMemo(() => {
    // 1. Filter all entities based on search, time, and active category
    const filtered = model.entities.filter(e =>
      (activeCategory === 'all' || e.category === activeCategory) &&
      (e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      isActiveInTime(viewTime, e.validFrom, e.validTo)
    );

    // 2. Group by Layer
    const groups = framework.layers.map(layer => {
      const entitiesInLayer = filtered.filter(e => layer.allowedCategories.includes(e.category));
      return {
        layer,
        entities: entitiesInLayer
      };
    });

    // 3. Catch Unclassified Entities
    // Find entities that were NOT caught by any layer above
    const classifiedEntityIds = new Set<string>();
    groups.forEach(g => g.entities.forEach(e => classifiedEntityIds.add(e.id)));

    const unclassifiedEntities = filtered.filter(e => !classifiedEntityIds.has(e.id));

    if (unclassifiedEntities.length > 0) {
      // Check if we already have an "Unknown" or "Uncategorized" layer in the framework
      // If so, merge them. If not, create a virtual one.
      const unknownLayerIndex = groups.findIndex(g =>
        g.layer.id === 'layer_unknown' ||
        g.layer.allowedCategories.includes(EntityCategory.UNKNOWN)
      );

      if (unknownLayerIndex !== -1) {
        groups[unknownLayerIndex].entities.push(...unclassifiedEntities);
      } else {
        // Create a virtual "Other" layer
        groups.push({
          layer: {
            id: 'layer_virtual_other',
            title: t('layer_virtual_other_title'),
            description: t('layer_virtual_other_desc'),
            colorClass: 'bg-slate-100 border-slate-300 text-slate-500',
            allowedCategories: [EntityCategory.UNKNOWN] // Fallback
          },
          entities: unclassifiedEntities
        });
      }
    }

    return groups.filter(g => {
      // Show if has entities OR if the layer supports the active category (so we can add)
      if (g.entities.length > 0) return true;
      if (activeCategory === 'all') return true;
      return g.layer.allowedCategories.includes(activeCategory);
    });
  }, [model.entities, framework, activeCategory, searchTerm, viewTime]);

  const getCategoryCount = (cat: EntityCategory) => {
    return model.entities.filter(e => e.category === cat).length;
  };

  const handleCreateInLayer = (layer: LayerDefinition) => {
    const defaultCat = activeCategory !== 'all' ? activeCategory : layer.allowedCategories[0];
    const newId = onAddEntity(t('new_entity_default_name'), t('new_entity_default_desc'), defaultCat);
    setSelectedEntityId(newId);
  };

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  // Render the entity groups (Used in both Standard List and Minimal List Panel)
  const renderEntityGroups = (compact: boolean = false) => {
    if (groupedEntities.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs italic">
          <Layers className="w-8 h-8 mb-2 opacity-20" />
          <p>{compact ? t('empty_no_data') : t('empty_category_no_entities')}</p>
          {activeCategory !== 'all' && (
            <button
              onClick={() => {
                const layer = framework.layers.find(l => l.allowedCategories.includes(activeCategory as EntityCategory));
                if (layer) handleCreateInLayer(layer);
              }}
              className="mt-2 text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> {t('action_create')}
            </button>
          )}
        </div>
      );
    }

    return groupedEntities.map((group) => (
      <div key={group.layer.id} className="animate-fadeIn">
        {/* Layer Header */}
        {compact ? (
          // Compact Header for Minimal Mode
          <div className="flex items-center gap-2 mb-2 px-1 mt-2">
            <div className={`w-1 h-3 rounded-full ${group.layer.colorClass.replace('text-', 'bg-').replace('btn-', '')}`}></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group.layer.title}</span>
          </div>
        ) : (
          // Standard Header
          <div className="flex items-center justify-between mb-3 px-1 sticky top-0 bg-slate-50/95 backdrop-blur py-2 z-10 border-b border-transparent hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-4 rounded-full ${group.layer.colorClass.replace('text-', 'bg-').replace('btn-', '')}`}></div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{group.layer.title.startsWith('layer_') || group.layer.title.startsWith('framework_') ? t(group.layer.title) : group.layer.title}</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onGenerateLayer(group.layer.id)}
                disabled={loadingLayerId === group.layer.id}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                title={t('action_ai_generate')}
              >
                {loadingLayerId === group.layer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleCreateInLayer(group.layer)}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded transition-colors"
                title={t('action_add')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Entity List Grid */}
        <div className={`grid gap-2 grid-cols-1`}>
          {group.entities.map(entity => (
            <div
              key={entity.id}
              onClick={() => setSelectedEntityId(entity.id)}
              className={`
                            group cursor-pointer transition-all duration-200 border
                            ${selectedEntityId === entity.id
                  ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
                }
                            ${compact ? 'p-3 rounded-xl' : 'p-3 rounded-xl hover:shadow-md'}
                        `}
            >
              {compact ? (
                // Compact Card
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CategoryIcon category={entity.category} className="w-3.5 h-3.5 text-slate-400" />
                    <span className={`text-sm font-bold truncate ${selectedEntityId === entity.id ? 'text-indigo-900' : 'text-slate-700'}`}>{entity.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{entity.description}</p>
                </>
              ) : (
                // Standard Card
                <>
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors`}>
                        <CategoryIcon category={entity.category} className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${selectedEntityId === entity.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {entity.name}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedEntityId === entity.id ? 'text-indigo-400' : 'group-hover:translate-x-1'}`} />
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 pl-[38px] leading-relaxed opacity-80">
                    {entity.description}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    ));
  };


  // --------------------------------------------------------------------------
  // MAIN LAYOUT
  // --------------------------------------------------------------------------

  return (
    <div className="flex flex-col md:flex-row h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">

      {isMinimalUI ? (
        // === MINIMAL MODE: THREE-PANE LAYOUT ===
        <div
          className="flex h-full flex-none transition-[width] duration-75 border-r border-slate-200 bg-slate-50"
          style={{ width: isDesktop ? sidebarWidth : '100%' }}
        >
          {/* PANE 1: RAIL (Navigation) */}
          <div className="w-16 border-r border-slate-200 flex flex-col items-center py-4 gap-4 z-20 shrink-0 overflow-x-hidden h-full">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mb-2" title={viewMode === 'list' ? t('view_mode_list') : t('view_mode_graph')}>
              {viewMode === 'list' ? <Network className="w-6 h-6" /> : <GitGraph className="w-6 h-6" />}
            </div>

            <div
              className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
              <button
                onClick={() => setActiveCategory('all')}
                className={`p-2 rounded-xl transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                title={t('filter_all')}
              >
                <Layers className="w-5 h-5" />
              </button>
              <div className="w-8 h-px bg-slate-200 my-1"></div>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`p-2 rounded-xl transition-all group ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                  title={t(getCategoryLabel(cat))}
                >
                  <CategoryIcon category={cat} className="w-5 h-5" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'graph' : 'list')}
              className="mt-auto p-2 text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {viewMode === 'list' ? <GitGraph className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
          </div>

          {/* PANE 2: LIST PANEL (Now Flexible) */}
          <div className="flex-1 bg-white flex flex-col z-10 min-w-0">
            {/* Header */}
            <div className="h-14 px-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-bold text-slate-700 text-sm truncate">
                {activeCategory === 'all' ? t('filter_all_entities') : t(getCategoryLabel(activeCategory))}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    // Add to first compatible layer
                    const targetCat = activeCategory === 'all' ? availableCategories[0] : activeCategory;
                    const layer = framework.layers.find(l => l.allowedCategories.includes(targetCat));
                    if (layer) handleCreateInLayer(layer);
                  }}
                  className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                  title={t('action_add_entity')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/30">
              {renderEntityGroups(true)}
              <div className="h-12" />
            </div>
          </div>
        </div>
      ) : (
        // === STANDARD MODE: SIDEBAR (Resizable) ===
        <div
          className={`
                transition-[width] duration-75 border-r border-slate-200 bg-slate-50 flex flex-col h-full flex-none
                ${selectedEntityId && viewMode === 'list' ? 'hidden md:flex' : 'flex'}
            `}
          style={{ width: isDesktop ? sidebarWidth : '100%' }}
        >
          {/* Header */}
          <div className="px-4 py-3 shrink-0 border-b border-slate-100 bg-white z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  {viewMode === 'list' ? <Network className="w-5 h-5" /> : <GitGraph className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-serif font-bold text-slate-800 leading-none">{t('participants_title')}</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t('participants_subtitle')}</p>
                </div>
              </div>

              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title={t('view_mode_list_tooltip')}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('graph')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'graph' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title={t('view_mode_graph_tooltip')}
                >
                  <GitGraph className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  {viewTime ? <Clock className="w-3.5 h-3.5 text-indigo-500" /> : <Globe2 className="w-3.5 h-3.5" />}
                </div>
                <select
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
                  value={viewTime || ""}
                  onChange={(e) => setViewTime(e.target.value || null)}
                >
                  <option value="">{t('view_global')}</option>
                  {availableTimePoints.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {viewMode === 'list' && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t('search_placeholder')}
                    className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Category Nav */}
          {viewMode === 'list' && (
            <div className="shrink-0 bg-white border-b border-slate-100 px-2 py-2 overflow-x-auto no-scrollbar flex gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`
                            px-3 py-1.5 rounded-full text-xs font-bold border gap-1.5 whitespace-nowrap transition-all duration-200
                            ${activeCategory === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}
                        `}
              >
                {t('filter_all')}
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`
                                px-3 py-1.5 rounded-full text-xs font-bold border gap-1.5 whitespace-nowrap transition-all duration-200 flex items-center
                                ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}
                            `}
                >
                  <CategoryIcon category={cat} className="w-3.5 h-3.5" />
                  <span>{t(getCategoryLabel(cat)).split(' ')[0]}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] min-w-[16px] text-center ml-1 ${activeCategory === cat ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {getCategoryCount(cat)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Content List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-50/50">
            {viewMode === 'graph' ? (
              <GraphView
                entities={model.entities}
                relationships={model.relationships}
                framework={framework}
                viewTime={viewTime}
                selectedEntityId={selectedEntityId}
                onSelectEntity={(id) => setSelectedEntityId(id || null)}
              />
            ) : (
              <div className="h-full p-3 space-y-6">
                {renderEntityGroups(false)}
                <div className="h-12" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESIZE HANDLE (Standard Mode Only) */}
      {isDesktop && (
        <div
          className="w-1 cursor-col-resize hover:bg-indigo-400 bg-slate-200 flex-none transition-colors z-20 active:bg-indigo-600"
          onMouseDown={startResizing}
        />
      )}

      {/* RIGHT: DETAIL VIEW */}
      <div className={`
          bg-white flex flex-col transition-all duration-300 flex-1 min-w-0
          ${selectedEntityId ? 'fixed inset-0 z-50 md:static' : 'hidden md:flex'}
      `}>
        {selectedEntity ? (
          <EntityDetailForm
            entity={selectedEntity}
            allEntities={model.entities}
            relationships={model.relationships}
            entityStates={model.entityStates}
            framework={framework}
            viewTime={viewTime}
            onUpdate={onUpdateEntity}
            onRemove={() => {
              onRemoveEntity(selectedEntity.id);
              setSelectedEntityId(null);
            }}
            onAddRelationship={onAddRelationship}
            onRemoveRelationship={onRemoveRelationship}
            onAddEntityState={onAddEntityState}
            onUpdateEntityState={onUpdateEntityState}
            onRemoveEntityState={onRemoveEntityState}
            onBack={() => setSelectedEntityId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
            <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              {viewMode === 'list' ? <Network className="w-10 h-10 text-slate-300" /> : <GitGraph className="w-10 h-10 text-slate-300" />}
            </div>
            <p className="font-serif text-xl text-slate-400 font-bold mb-2">{t('entity_detail_view_details')}</p>
            <p className="text-sm opacity-60 max-w-xs text-center leading-relaxed">
              {viewMode === 'graph' ? t('entity_detail_view_hint_graph') : t('entity_detail_view_hint_list')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Relationship Editor Subcomponent (Unchanged logic, just keeping context)
const RelationshipEditor: React.FC<{
  entityId: string;
  allEntities: SocialEntity[];
  relationships: EntityRelationship[];
  onAdd: (targetId: string, type: string, desc: string, validFrom?: string, validTo?: string) => void;
  onRemove: (id: string) => void;
  viewTime?: string | null;
}> = ({ entityId, allEntities, relationships, onAdd, onRemove, viewTime }) => {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [type, setType] = useState("");
  const [desc, setDesc] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const handleAdd = () => {
    if (targetId && type) {
      onAdd(targetId, type, desc, validFrom, validTo);
      setTargetId("");
      setType("");
      setDesc("");
      setValidFrom("");
      setValidTo("");
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Network className="w-4 h-4" /> {viewTime ? `${t('section_relationships')} (${viewTime})` : t('section_relationships')} ({relationships.length})
        </label>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs flex items-center gap-1 font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {t('action_add_relationship')}
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              className="w-full p-2 border rounded text-xs"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
            >
              <option value="">{t('placeholder_select_target')}</option>
              {allEntities.filter(e => e.id !== entityId).map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
              ))}
            </select>
            <input
              className="w-full p-2 border rounded text-xs"
              placeholder={t('placeholder_relationship_type')}
              value={type}
              onChange={e => setType(e.target.value)}
            />
          </div>

          {!viewTime && (
            <div className="flex items-center gap-2">
              <input
                className="w-1/2 p-2 border rounded text-xs"
                placeholder={t('placeholder_start_time')}
                value={validFrom}
                onChange={e => setValidFrom(e.target.value)}
              />
              <span className="text-slate-400">-</span>
              <input
                className="w-1/2 p-2 border rounded text-xs"
                placeholder={t('placeholder_end_time')}
                value={validTo}
                onChange={e => setValidTo(e.target.value)}
              />
            </div>
          )}

          <input
            className="w-full p-2 border rounded text-xs"
            placeholder={t('placeholder_rel_desc')}
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-xs text-slate-500">{t('action_cancel')}</button>
            <button onClick={handleAdd} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">{t('action_confirm')}</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {relationships.length === 0 ? (
          <div className="p-2 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs italic">
            {viewTime ? t('empty_relationships_active') : t('empty_relationships')}
          </div>
        ) : (
          relationships.map(rel => {
            const isSource = rel.sourceId === entityId;
            const otherId = isSource ? rel.targetId : rel.sourceId;
            const other = allEntities.find(e => e.id === otherId);

            return (
              <div key={rel.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded hover:border-indigo-200 group transition-all">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`p-1 rounded-full shrink-0 ${isSource ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                    {isSource ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isSource ? (
                        <>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 rounded">{rel.type}</span>
                          <span className="text-xs font-semibold text-slate-800 truncate">{other?.name || t('category_unknown')}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{t('rel_passive_tag')}</span>
                          <span className="text-xs font-semibold text-slate-800 truncate">{other?.name || t('category_unknown')}</span>
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 rounded">{rel.type}</span>
                        </>
                      )}

                      {/* Timestamp Tag (Snapshot) */}
                      {rel.timestamp && (
                        <span className="text-[10px] bg-amber-50 text-amber-600 px-1 rounded flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {rel.timestamp}
                        </span>
                      )}

                      {/* Duration Tag */}
                      {(rel.validFrom || rel.validTo) && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded flex items-center gap-0.5">
                          <CalendarRange className="w-2.5 h-2.5" /> {rel.validFrom || '∞'} - {rel.validTo || '∞'}
                        </span>
                      )}
                    </div>
                    {rel.description && <p className="text-[10px] text-slate-500 truncate mt-0.5">{rel.description}</p>}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(rel.id)}
                  className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const EntityDetailForm: React.FC<{
  entity: SocialEntity;
  allEntities: SocialEntity[];
  relationships: EntityRelationship[];
  entityStates: EntityState[];
  framework: FrameworkDefinition;
  viewTime: string | null;
  onUpdate: (id: string, name: string, desc: string, cat: EntityCategory, validFrom?: string, validTo?: string) => void;
  onRemove: () => void;
  onAddRelationship: (sourceId: string, targetId: string, type: string, description: string, timestamp?: string, validFrom?: string, validTo?: string) => void;
  onRemoveRelationship: (id: string) => void;
  onAddEntityState: (entityId: string, timestamp: string, description: string) => void;
  onUpdateEntityState: (stateId: string, description: string) => void;
  onRemoveEntityState: (stateId: string) => void;
  onBack: () => void;
}> = ({
  entity, allEntities, relationships, entityStates, framework, viewTime,
  onUpdate, onRemove, onAddRelationship, onRemoveRelationship,
  onAddEntityState, onUpdateEntityState, onRemoveEntityState,
  onBack
}) => {
    const { t } = useTranslation();
    const [name, setName] = useState(entity.name);
    const [desc, setDesc] = useState(entity.description);
    const [category, setCategory] = useState(entity.category);
    const [validFrom, setValidFrom] = useState(entity.validFrom || "");
    const [validTo, setValidTo] = useState(entity.validTo || "");

    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

    // Temporal State Form
    const [newStateTime, setNewStateTime] = useState("");
    const [isAddingState, setIsAddingState] = useState(false);

    // Reset form when selection changes
    useEffect(() => {
      setName(entity.name);
      setDesc(entity.description);
      setCategory(entity.category);
      setValidFrom(entity.validFrom || "");
      setValidTo(entity.validTo || "");
      setSaveStatus('saved');
      setNewStateTime("");
      setIsAddingState(false);
    }, [entity.id, entity.name, entity.description, entity.category, entity.validFrom, entity.validTo]);

    const currentLayer = useMemo(() => {
      return framework.layers.find(l => l.allowedCategories.includes(category));
    }, [category, framework]);

    // Filter Relationships based on View Time logic
    const visibleRelationships = useMemo(() => {
      if (!viewTime) return relationships.filter(r => r.sourceId === entity.id || r.targetId === entity.id);

      return relationships.filter(r => {
        const involvesEntity = r.sourceId === entity.id || r.targetId === entity.id;
        if (!involvesEntity) return false;

        // Priority 1: Exact snapshot match
        if (r.timestamp) return r.timestamp === viewTime;

        // Priority 2: Duration check
        return isActiveInTime(viewTime, r.validFrom, r.validTo);
      });
    }, [relationships, entity.id, viewTime]);

    const myStates = useMemo(() =>
      entityStates.filter(s => s.entityId === entity.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      [entityStates, entity.id]);

    const activeState = useMemo(() =>
      viewTime ? myStates.find(s => s.timestamp === viewTime) : null
      , [myStates, viewTime]);

    const executeSave = useCallback(() => {
      onUpdate(entity.id, name, desc, category, validFrom, validTo);
      setSaveStatus('saved');
    }, [entity.id, name, desc, category, validFrom, validTo, onUpdate]);

    useEffect(() => {
      if (name === entity.name &&
        desc === entity.description &&
        category === entity.category &&
        validFrom === (entity.validFrom || "") &&
        validTo === (entity.validTo || "")) {
        setSaveStatus('saved');
        return;
      }
      setSaveStatus('saving');
      const timer = setTimeout(() => { executeSave(); }, 2000);
      return () => clearTimeout(timer);
    }, [name, desc, category, validFrom, validTo, entity, executeSave]);

    const handleCategoryChange = (newCat: EntityCategory) => {
      setCategory(newCat);
      onUpdate(entity.id, name, desc, newCat, validFrom, validTo);
    };

    const handleBlur = () => {
      executeSave();
    };

    const handleAddState = () => {
      if (newStateTime.trim()) {
        onAddEntityState(entity.id, newStateTime, "描述该时期的状态...");
        setNewStateTime("");
        setIsAddingState(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-white">
        {/* Toolbar */}
        <div className="h-14 border-b border-slate-100 flex items-center justify-between px-4 md:px-6 bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${currentLayer?.colorClass.replace('bg-', 'bg-opacity-10 bg-')}`}>
              {currentLayer?.title.startsWith('layer_') ? t(currentLayer.title) : (currentLayer?.title || t('unknown_layer'))}
            </span>
            {viewTime && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {viewTime}
              </span>
            )}
            <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-2">
              {saveStatus === 'saving' && <><Loader2 className="w-3 h-3 animate-spin" /> {t('status_saving')}</>}
              {saveStatus === 'saved' && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t('status_saved')}</>}
            </span>
          </div>
          <button onClick={onRemove} className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors" title={t('action_delete_entity')}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Core Info */}
          <div className="space-y-4">
            <textarea
              className="w-full text-2xl font-serif font-bold text-slate-800 placeholder-slate-300 resize-none outline-none bg-transparent"
              placeholder={t('entity_detail_placeholder_name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleBlur}
              rows={1}
            />

            {/* Metadata Row */}
            <div className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-1/2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t('entity_detail_label_category')}</label>
                <select
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-medium"
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as EntityCategory)}
                >
                  {Object.values(EntityCategory).map(cat => (
                    <option key={cat} value={cat}>{t(getCategoryLabel(cat))}</option>
                  ))}
                </select>
              </div>
              <div className="w-1/2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t('entity_detail_label_duration')}</label>
                <div className="flex items-center gap-1">
                  <input
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono"
                    placeholder={t('entity_detail_placeholder_start')}
                    value={validFrom}
                    onChange={e => setValidFrom(e.target.value)}
                  />
                  <span className="text-slate-300">-</span>
                  <input
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-mono"
                    placeholder={t('entity_detail_placeholder_end')}
                    value={validTo}
                    onChange={e => setValidTo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">{t('entity_detail_label_basic_desc')}</label>
              <textarea
                className="w-full min-h-[100px] text-sm text-slate-600 leading-relaxed resize-none outline-none border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-100 transition-all hover:border-slate-300"
                placeholder={t('entity_detail_placeholder_desc')}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={handleBlur}
              />
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Temporal States Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" /> {t('section_temporal_states')}
              </label>
              <button
                onClick={() => setIsAddingState(true)}
                className="text-xs flex items-center gap-1 font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> {t('action_record_new_state')}
              </button>
            </div>

            {/* Add State Form */}
            {isAddingState && (
              <div className="flex gap-2 items-center animate-fadeIn bg-slate-50 p-2 rounded-lg border border-slate-200">
                <input
                  autoFocus
                  className="w-24 p-2 border rounded text-xs"
                  placeholder={t('placeholder_time_point')}
                  value={newStateTime}
                  onChange={e => setNewStateTime(e.target.value)}
                />
                <div className="flex-1" />
                <button onClick={handleAddState} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded font-bold hover:bg-indigo-700">{t('action_confirm')}</button>
                <button onClick={() => setIsAddingState(false)} className="text-xs text-slate-500 hover:bg-slate-200 px-2 py-1.5 rounded">{t('action_cancel')}</button>
              </div>
            )}

            <div className="space-y-3">
              {myStates.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-4 text-center border border-dashed border-slate-200 rounded-lg">
                  {t('empty_temporal_states')}
                </div>
              ) : (
                myStates.map(state => (
                  <div key={state.id} className={`p-3 rounded-lg border transition-all ${activeState?.id === state.id ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-200' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold bg-slate-100 border px-2 py-0.5 rounded text-slate-600 font-mono">
                        {state.timestamp}
                      </span>
                      <button onClick={() => onRemoveEntityState(state.id)} className="text-slate-300 hover:text-red-500 p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                    <textarea
                      className="w-full bg-transparent text-sm text-slate-700 resize-none outline-none min-h-[40px]"
                      rows={2}
                      value={state.description}
                      onChange={e => onUpdateEntityState(state.id, e.target.value)}
                      placeholder={t('placeholder_state_desc')}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Relationships Section */}
          <RelationshipEditor
            entityId={entity.id}
            allEntities={allEntities}
            relationships={visibleRelationships}
            onAdd={onAddRelationship}
            onRemove={onRemoveRelationship}
            viewTime={viewTime}
          />

          <div className="h-12" /> {/* Spacer */}
        </div>
      </div>
    );
  };

export default ParticipantsView;
